"""
backend/services/ai_flagging.py
================================
Layer 3 — AI Suspicion Flagging Engine (Rule-Based Heuristic v1)

This module implements the AI suspicion flagging system for GeoMesh.
It is wired into all mutation routes (feature update, floor create/generate/update,
flat create/generate/update, ULPIN assignment) and evaluates each entity
synchronously in the same request cycle — no background jobs needed since the
whole codebase is synchronous by design.

IMPORTANT — Honesty about "AI":
  This is a DETERMINISTIC RULE-BASED system, not a trained ML model.
  The term "AI" in the SIH26011 pitch refers to the intelligent, automated
  nature of the flagging — it is heuristic intelligence, not neural inference.
  The architecture document (README_ARCHITECTURE.md Layer 3) clearly labels this
  "Real (rule-based heuristic v1)" and does NOT claim ML capabilities.
  This is intentional and honest — judges will be informed of the distinction.

Seven Named Rules (demoable, explainable):

  R1 geometric_overlap        — Building footprint overlaps existing feature on a different parcel
  R2 floor_count_anomaly      — Floor count inconsistent with building height (outside 3m±50% band)
  R3 ulpin_checksum_anomaly   — Assigned ULPIN fails validate_ulpin() re-check
  R4 ownership_anomaly        — Flat/floor owner_name doesn't match any parcel_ownership record
  R5 rapid_reissue_anomaly    — Force-reissue within 60 s of previous reissue (suspicious speed)
  R6 unit_number_pattern_anomaly — unit_number doesn't match the standard naming convention
  R7 footprint_shape_anomaly   — a footprint is implausibly long and narrow for a building

Usage:
  from services.ai_flagging import evaluate_suspicion
  flag_result = evaluate_suspicion("floor", floor_obj, context_dict, db)
  if flag_result.fired:
      # flag fields are already set on floor_obj in-memory — just db.commit()
      ...
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

# ─────────────────────────────────────────────────────────────────────────────
# FlagResult dataclass
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class FlagResult:
    """Result returned by evaluate_suspicion(). If fired=True the entity's
    flag fields have already been set in-memory; the caller should db.commit()."""
    fired: bool = False
    reasons: list[str] = field(default_factory=list)
    score: float = 0.0
    rule_ids: list[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Individual Rule Implementations
# ─────────────────────────────────────────────────────────────────────────────

def _rule_R1_geometric_overlap(entity_type: str, entity: Any, context: dict, db: Any) -> Optional[str]:
    """
    R1 — geometric_overlap
    Check whether a feature's footprint overlaps an existing feature on a
    *different* parcel. Uses check_spatial_overlap() from the ULPIN engine.
    Only applies to parcel_features (buildings) since floors/flats don't
    have independent geometries.
    """
    if entity_type != "feature":
        return None
    geometry_json_str = getattr(entity, "geometry_json", None)
    if not geometry_json_str:
        return None
    try:
        import json as _json
        from services.ulpin_generator import check_spatial_overlap
        geom_dict = _json.loads(geometry_json_str)
        overlapping = check_spatial_overlap(geom_dict, db)
        # Filter out the entity's own ULPIN from the results
        own_ulpin = getattr(entity, "ulpin_3d", None)
        others = [u for u in overlapping if u != own_ulpin]
        if others:
            return (
                f"R1[geometric_overlap]: Building footprint intersects "
                f"{len(others)} existing feature(s): {', '.join(others[:3])}"
            )
    except Exception:
        pass
    return None


def _rule_R2_floor_count_anomaly(entity_type: str, entity: Any, context: dict, db: Any) -> Optional[str]:
    """
    R2 — floor_count_anomaly
    When a floor is added to a building, check if the total defined floor count
    is wildly inconsistent with the building's est_height.
    Heuristic: normal range is [height/4.5, height/2.5] floors.
    (3m/floor baseline ±50% = 2.5m min, 4.5m max per floor)
    Also triggers on feature update if height is changed to something inconsistent.
    """
    if entity_type not in ("floor", "feature"):
        return None
    try:
        if entity_type == "floor":
            feature = context.get("feature")
            if feature is None:
                return None
            height = getattr(feature, "height", None) or 0.0
            defined_count = context.get("defined_floor_count", 0)
        else:
            height = getattr(entity, "height", None) or 0.0
            defined_count = getattr(entity, "floor_count", 0)

        if height <= 0 or defined_count <= 0:
            return None

        min_expected = math.floor(height / 4.5)
        max_expected = math.ceil(height / 2.5)
        # Always allow at least 1 floor
        min_expected = max(1, min_expected)

        if defined_count > max_expected or defined_count < min_expected:
            return (
                f"R2[floor_count_anomaly]: {defined_count} floor(s) defined for a building "
                f"with height {height:.1f}m — expected {min_expected}–{max_expected} floors "
                f"based on 2.5–4.5m per floor heuristic"
            )
    except Exception:
        pass
    return None


def _rule_R3_ulpin_checksum_anomaly(entity_type: str, entity: Any, context: dict, db: Any) -> Optional[str]:
    """
    R3 — ulpin_checksum_anomaly
    Re-validate the ULPIN that was just assigned. Should never fire for normal
    generate_ulpin() output, but catches any manual DB edit or code-path bug.
    Applies to building, floor, and flat ULPIN assignments.
    """
    if entity_type not in ("feature", "floor", "flat"):
        return None
    ulpin = context.get("assigned_ulpin")
    if not ulpin:
        return None
    try:
        from services.ulpin_generator import validate_ulpin
        is_valid, expected, found = validate_ulpin(ulpin)
        if not is_valid:
            return (
                f"R3[ulpin_checksum_anomaly]: Assigned ULPIN '{ulpin}' failed checksum — "
                f"expected C{expected}, found C{found}"
            )
    except Exception:
        pass
    return None


def _rule_R4_ownership_anomaly(entity_type: str, entity: Any, context: dict, db: Any) -> Optional[str]:
    """
    R4 — ownership_anomaly
    On flat or floor edit where owner_name changes: if the new owner_name does
    not match any parcel_ownership.owner_name for the same parcel (case-insensitive),
    flag as an unverified ownership change that warrants surveyor verification.
    """
    if entity_type not in ("flat", "floor"):
        return None
    new_owner = context.get("new_owner_name")
    if not new_owner:
        return None
    parcel_id = context.get("parcel_id")
    if not parcel_id:
        return None
    try:
        from models import ParcelOwnership
        ownership_rows = db.query(ParcelOwnership).filter(
            ParcelOwnership.parcel_id == parcel_id
        ).all()
        if not ownership_rows:
            return None  # No ownership data — can't flag (seeded parcels)
        registered_names = {
            (row.owner_name or "").lower().strip()
            for row in ownership_rows
            if row.owner_name
        }
        if new_owner.lower().strip() not in registered_names:
            return (
                f"R4[ownership_anomaly]: owner_name '{new_owner}' does not match any "
                f"registered parcel owner for parcel #{parcel_id}. "
                f"Registered: {', '.join(list(registered_names)[:3])}"
            )
    except Exception:
        pass
    return None


def _rule_R5_rapid_reissue_anomaly(entity_type: str, entity: Any, context: dict, db: Any) -> Optional[str]:
    """
    R5 — rapid_reissue_anomaly
    If a floor ULPIN is being force-reissued and the previous reissue happened
    less than 60 seconds ago, this is suspicious (possible automated attack or
    accidental rapid-fire reissue).
    """
    if entity_type != "floor":
        return None
    if not context.get("is_force_reissue"):
        return None
    prev_reissued_at = getattr(entity, "reissued_at", None)
    if not prev_reissued_at:
        return None
    try:
        prev_dt = datetime.fromisoformat(prev_reissued_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        elapsed_seconds = (now - prev_dt).total_seconds()
        if elapsed_seconds < 60:
            return (
                f"R5[rapid_reissue_anomaly]: Floor ULPIN force-reissued only "
                f"{elapsed_seconds:.0f}s after the previous reissue "
                f"(threshold: 60s). Possible rapid automated reissue."
            )
    except Exception:
        pass
    return None


def _rule_R6_unit_number_pattern_anomaly(entity_type: str, entity: Any, context: dict, db: Any) -> Optional[str]:
    """
    R6 — unit_number_pattern_anomaly
    Check that a flat's unit_number matches the auto-generate convention:
      - Above-ground floor N:    {N}{seq:02d}  e.g. "704" (floor 7, unit 04)
      - Ground floor (0):        G{seq:02d}    e.g. "G04"
      - Basement floor -N:       B{N}{seq:02d} e.g. "B104"
    Manual entries that deviate (e.g. "Suite-A", "Shop 3") are not wrong but
    should be flagged for surveyor review as non-standard.
    """
    if entity_type != "flat":
        return None
    unit_number = getattr(entity, "unit_number", None) or context.get("unit_number")
    if not unit_number:
        return None
    # Standard patterns:
    #   Above ground: starts with a positive integer ≥1, followed by 2+ digits
    #   Ground:       starts with G followed by 2+ digits
    #   Basement:     starts with B followed by 1+ digits then 2+ digits
    standard_pattern = re.compile(
        r'^([1-9][0-9]*\d{2}|G\d{2,}|B[1-9][0-9]*\d{2,})$'
    )
    if not standard_pattern.match(str(unit_number).strip()):
        return (
            f"R6[unit_number_pattern_anomaly]: unit_number '{unit_number}' does not match "
            f"the standard naming convention (e.g. '704', 'G04', 'B104'). "
            f"Manual entry may be non-standard — verify with surveyor."
        )
    return None


def _rule_R7_footprint_shape_anomaly(entity_type: str, entity: Any, context: dict, db: Any) -> Optional[str]:
    """Flag likely road/linear infrastructure accidentally imported as a building.

    A polygon must be at least 25:1 in aspect ratio and have a short dimension
    below 8 m to fire. This deliberately leaves long rectangular buildings alone.
    """
    if entity_type != "feature":
        return None
    geometry_json = getattr(entity, "geometry_json", None)
    if not geometry_json:
        return None
    try:
        import json
        geometry = json.loads(geometry_json) if isinstance(geometry_json, str) else geometry_json
        coordinates = geometry.get("coordinates", [])
        points: list[list[float]] = []

        def collect(value: Any) -> None:
            if (isinstance(value, (list, tuple)) and len(value) >= 2
                    and isinstance(value[0], (int, float))
                    and isinstance(value[1], (int, float))):
                points.append([float(value[0]), float(value[1])])
            elif isinstance(value, (list, tuple)):
                for child in value:
                    collect(child)

        collect(coordinates)
        if len(points) < 3:
            return None
        mean_lat = sum(point[1] for point in points) / len(points)
        width_m = (max(p[0] for p in points) - min(p[0] for p in points)) * 111_320 * math.cos(math.radians(mean_lat))
        depth_m = (max(p[1] for p in points) - min(p[1] for p in points)) * 110_540
        short_m, long_m = sorted((width_m, depth_m))
        if short_m < 8 and long_m / max(short_m, 0.01) >= 25:
            return (
                f"R7[footprint_shape_anomaly]: Footprint is unusually narrow "
                f"({short_m:.1f}m x {long_m:.1f}m; aspect ratio {long_m / max(short_m, 0.01):.1f}:1). "
                "Check that linear infrastructure was not imported as a building."
            )
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Rule registry
# ─────────────────────────────────────────────────────────────────────────────

_RULES = [
    ("R1", _rule_R1_geometric_overlap),
    ("R2", _rule_R2_floor_count_anomaly),
    ("R3", _rule_R3_ulpin_checksum_anomaly),
    ("R4", _rule_R4_ownership_anomaly),
    ("R5", _rule_R5_rapid_reissue_anomaly),
    ("R6", _rule_R6_unit_number_pattern_anomaly),
    ("R7", _rule_R7_footprint_shape_anomaly),
]

# Score contribution per rule (sum ≤ 1.0 for all 6 rules firing)
_RULE_SCORES = {
    "R1": 0.30,  # Geometric overlap — highest severity
    "R2": 0.15,  # Floor count anomaly
    "R3": 0.25,  # ULPIN checksum — high (should never fire normally)
    "R4": 0.15,  # Ownership anomaly
    "R5": 0.10,  # Rapid reissue
    "R6": 0.05,  # Unit number pattern — lowest (may be intentional)
    "R7": 0.10,  # Implausible linear footprint
}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_suspicion(
    entity_type: str,
    entity: Any,
    context: dict,
    db: Any,
) -> FlagResult:
    """
    Run all applicable suspicion rules against an entity and set flag fields
    in-memory on the entity if any rule fires.

    Parameters
    ----------
    entity_type : str
        One of: "feature", "floor", "flat"
    entity : SQLAlchemy ORM object
        The ParcelFeature / ParcelFloor / ParcelFlat instance being mutated.
        Flag fields (flag_status, flag_reason, flag_score, flagged_at) are
        set directly on this object before returning — no separate DB call needed.
    context : dict
        Rule-specific contextual data. Supported keys:
          "feature"           — ParcelFeature obj (for floor rules needing height)
          "defined_floor_count" — int (for R2 on floor creation)
          "assigned_ulpin"    — str (for R3 ULPIN checksum check)
          "parcel_id"         — int (for R4 ownership check)
          "new_owner_name"    — str (for R4 ownership check)
          "is_force_reissue"  — bool (for R5 rapid reissue check)
          "unit_number"       — str (for R6 unit pattern check)
    db : SQLAlchemy Session
        Active database session (read-only queries within rules).

    Returns
    -------
    FlagResult
        .fired  — True if any rule fired
        .reasons — list of human-readable rule reason strings
        .score  — total severity score (0.0–1.0)
        .rule_ids — list of fired rule IDs (e.g. ["R2", "R4"])
    """
    result = FlagResult()

    for rule_id, rule_fn in _RULES:
        try:
            reason = rule_fn(entity_type, entity, context, db)
            if reason:
                result.fired = True
                result.reasons.append(reason)
                result.rule_ids.append(rule_id)
                result.score = min(1.0, result.score + _RULE_SCORES.get(rule_id, 0.05))
        except Exception as exc:
            # Rules must never crash the request — silently skip on unexpected error
            print(f"[ai_flagging] Rule {rule_id} raised unexpected error: {exc}")
            continue

    if result.fired:
        now_iso = datetime.now(timezone.utc).isoformat()
        combined_reason = " | ".join(result.reasons)
        # Set fields in-memory on the entity — caller must db.commit() afterwards
        entity.flag_status = "flagged"
        entity.flag_reason = combined_reason
        entity.flag_score = round(result.score, 3)
        entity.flagged_at = now_iso
        print(
            f"[ai_flagging] {entity_type.upper()} id={getattr(entity, 'id', '?')} FLAGGED "
            f"(score={result.score:.2f}, rules={result.rule_ids}): {combined_reason[:120]}"
        )
    else:
        # Ensure clean entities are marked clean (idempotent re-evaluations)
        if getattr(entity, "flag_status", None) not in (
            "flagged", "under_review", "resolved_ok", "resolved_rejected"
        ):
            entity.flag_status = "clean"

    return result


def get_flag_status_label(flag_status: Optional[str]) -> str:
    """Human-readable label for a flag_status value, safe for citizen-facing display."""
    labels = {
        "clean": "Verified",
        "flagged": "Under Surveyor Review",
        "under_review": "Under Surveyor Review",
        "resolved_ok": "Verified",
        "resolved_rejected": "Rejected",
        None: "Unknown",
    }
    return labels.get(flag_status, "Under Review")
