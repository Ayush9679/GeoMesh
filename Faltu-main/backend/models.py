"""
backend/models.py
==================
SQLAlchemy ORM models for Bhustack3D.

Database: SQLite (prototype) — production would use PostgreSQL + PostGIS 3D + 3DCityDB
See: backend/README_ARCHITECTURE.md for the full Layer 4 production spec.

Tables:
  users              — authentication, roles (existing)
  locations          — legacy cadastral cluster registry used by existing search/globe (existing)
  parcels            — Layer 4: LADM-inspired per-parcel records with 3D ULPIN
  parcel_features    — Layer 4: per-building/unit geometry records (the individual polygons)
  parcel_ownership   — Layer 4: stub ownership linkage table (future DigiLocker/Aadhaar tie-in)
  parcel_floors      — Layer 4/3D Strata: floor-level records with ULPIN + AI flag fields
  parcel_flats       — Layer 4/3D Strata: flat/unit-level records with ULPIN + AI flag fields
"""

from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from database import Base


class Role(str, Enum):
    """Canonical account roles. Stored as their lowercase string values."""
    CITIZEN = "citizen"
    SURVEYOR = "surveyor"
    ADMIN = "admin"


# ─────────────────────────────────────────────────────────────────────────────
# Existing Tables (preserved exactly as-is)
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="citizen", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class Location(Base):
    """Seeded cadastral parcel / location registry for demo search & parcel endpoints."""
    __tablename__ = "locations"

    id = Column(String(50), primary_key=True, index=True)   # slug, e.g. "delhi"
    name = Column(String(200), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    ulpin_3d = Column(String(100), nullable=False, unique=True, index=True)
    classification = Column(String(200), nullable=False)
    area = Column(String(50), nullable=False)
    volume = Column(String(50), nullable=False)
    elevation = Column(String(50), nullable=False)
    zone = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    strata_air = Column(String(300), nullable=False)
    strata_surface = Column(String(300), nullable=False)
    strata_subsurface = Column(String(300), nullable=False)
    geojson_features = Column(Text, nullable=True)   # JSON array of GeoJSON features (for real-data parcels)
    feature_count = Column(Integer, nullable=True)   # number of sub-features in cluster


# ─────────────────────────────────────────────────────────────────────────────
# Layer 4 — 3D Cadastral Database Tables
# ─────────────────────────────────────────────────────────────────────────────
# Architecture note:
#   These tables mirror the core structure of LADM (Land Administration Domain
#   Model, ISO 19152) at a conceptually simplified level, using SQLite as the
#   backing store. In a production deployment these would live in PostgreSQL +
#   PostGIS 3D (with 3DCityDB for CityGML storage), as specified in the
#   SIH26011 solution document's Layer 4 section.
#
#   SQLite is used here for prototype speed and zero-infrastructure hosting;
#   the schema is deliberately designed to be straightforwardly migrated to
#   PostgreSQL without structural changes.
# ─────────────────────────────────────────────────────────────────────────────

class Parcel(Base):
    """
    Layer 4: Top-level cadastral parcel record.

    Represents a cluster of buildings / a land parcel identified by a single
    base ULPIN. Multiple ParcelFeature rows hang off each Parcel (one per
    building unit or vertical strata slice).

    Confidence Score (per SIH26011 Novelty 4 — Data Authenticity):
      "satellite-only"          — footprint digitized from satellite imagery only
      "drone-verified"          — confirmed by drone survey
      "lidar-verified"          — confirmed by LiDAR point cloud
      "sanction-plan-verified"  — matched against approved building sanction plan
    """
    __tablename__ = "parcels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ulpin_3d = Column(String(150), nullable=False, unique=True, index=True)
    parent_land_ulpin = Column(String(20), nullable=True)   # 14-char base ULPIN of the surface parcel
    name = Column(String(300), nullable=True)               # Human-readable name (may be null for unnamed buildings)
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    total_area = Column(Float, nullable=False, default=0.0) # Sum of all ParcelFeature areas, in m²
    confidence_score = Column(
        String(30),
        nullable=False,
        default="satellite-only",
    )
    last_verified_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    features = relationship("ParcelFeature", back_populates="parcel", cascade="all, delete-orphan")
    ownership = relationship("ParcelOwnership", back_populates="parcel", cascade="all, delete-orphan")


class ParcelFeature(Base):
    """
    Layer 4: Individual building unit / strata slice within a Parcel.

    Each row corresponds to one GeoJSON Feature (one building polygon), stored
    with its geometry as a JSON string. In PostGIS production this column would
    be a native geometry type with spatial indexes.

    The ulpin_3d here is the *feature-level* 3D ULPIN (generated by Layer 5),
    encoding the specific vertical level and unit within the parent parcel.

    AI Flagging (Layer 3 — heuristic v1):
      flag_status: clean | flagged | under_review | resolved_ok | resolved_rejected
      flag_reason: human-readable concatenation of all fired rule reasons
      flag_score:  severity score (0.0–1.0); higher = more suspicious
    Added via ALTER TABLE migration — safe against existing bhustack.db.
    """
    __tablename__ = "parcel_features"
    __table_args__ = (Index("uq_parcel_features_building_ulpin", "building_ulpin", unique=True),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcel_id = Column(Integer, ForeignKey("parcels.id"), nullable=False, index=True)
    fid = Column(Integer, nullable=True)                       # Original fid from GeoJSON
    ulpin_3d = Column(String(150), nullable=False, unique=True, index=True)
    geometry_json = Column(Text, nullable=False)               # GeoJSON geometry as JSON string
    height = Column(Float, nullable=True)                      # est_height from properties
    area = Column(Float, nullable=True)                        # area_m2 from properties
    floor_level = Column(Integer, nullable=False, default=0)   # 0 = ground, 1 = first floor, etc.
    floor_count = Column(Integer, nullable=False, default=1)   # total floors in building
    floor_height_m = Column(Float, nullable=False, default=3.0) # Feature E — standard per-floor height in meters
    building_type = Column(String(50), nullable=True)          # e.g. "retail", "yes", "residential"
    feature_name = Column(String(300), nullable=True)          # building name if any
    notes = Column(Text, nullable=True)                        # Surveyor editable notes

    # Feature F — Building-level ULPIN assignment & audit history
    building_ulpin = Column(String(150), nullable=True, index=True)
    building_ulpin_assigned_at = Column(String(50), nullable=True)     # ISO datetime string
    building_ulpin_reassigned_by = Column(Integer, nullable=True)      # users.id of surveyor
    building_ulpin_history = Column(Text, nullable=True)               # JSON array of previous ULPINs & timestamps

    # AI Flagging columns (added via ALTER TABLE migration)
    flag_status = Column(String(30), nullable=True, default="clean")   # clean|flagged|under_review|resolved_ok|resolved_rejected
    flag_reason = Column(Text, nullable=True)                           # concatenated rule reasons
    flag_score = Column(Float, nullable=True)                           # 0.0–1.0 severity
    flagged_at = Column(String(50), nullable=True)                      # ISO datetime string
    reviewed_by = Column(Integer, nullable=True)                        # users.id of reviewing surveyor
    reviewed_at = Column(String(50), nullable=True)                     # ISO datetime string
    review_notes = Column(Text, nullable=True)                          # surveyor resolution notes

    # Relationships
    parcel = relationship("Parcel", back_populates="features")
    floors = relationship("ParcelFloor", back_populates="feature", cascade="all, delete-orphan")


class ParcelOwnership(Base):
    """
    Layer 4: Ownership linkage record — stub-ready for future DigiLocker/Aadhaar integration.

    Per the SIH26011 solution document's privacy approach, Aadhaar is never
    mandatory — aadhaar_ref is nullable and stored as a reference only (not the
    number itself, which would require strict data localisation compliance).

    This table is intentionally left sparse for the prototype — it is seeded
    with placeholder owner data for demo purposes only. Real ownership data
    would come from state land-record systems (DILRMP integration).

    user_id: nullable FK to the users table — links this ownership record to a
    registered citizen account for "my parcels" filtering. Added as a
    migration-safe nullable column (see ALTER TABLE block in main.py).
    """
    __tablename__ = "parcel_ownership"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcel_id = Column(Integer, ForeignKey("parcels.id"), nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)       # FK → users.id (nullable; migration-safe)
    owner_name = Column(String(300), nullable=True)
    aadhaar_ref = Column(String(100), nullable=True)           # nullable — voluntary per privacy policy
    registration_doc_ref = Column(String(500), nullable=True)  # document reference / DigiLocker URI stub
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    parcel = relationship("Parcel", back_populates="ownership")


class ParcelFloor(Base):
    """
    Layer 4 / 3D Strata: Floor-level record tied to a specific building (ParcelFeature).

    Vertical levels match standard cadastral strata conventions:
      - Positive integers: floors above ground (e.g. 1, 2, 3...)
      - 0: Ground level
      - Negative integers: basement levels (e.g. -1, -2 for basements)

    ULPIN Idempotency (Feature B — Surveyor Authority):
      floor_ulpin is intended to be globally unique (enforced at application level;
      DB-level UNIQUE requires full table rebuild under SQLite — deferred to
      PostgreSQL migration). Force-reissue history is tracked via previous_ulpin,
      reissued_at, reissued_by.

    AI Flagging (Layer 3 — heuristic v1):
      flag_status / flag_reason / flag_score / flagged_at / reviewed_by / reviewed_at / review_notes
    """
    __tablename__ = "parcel_floors"
    __table_args__ = (Index("uq_parcel_floors_floor_ulpin", "floor_ulpin", unique=True),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcel_feature_id = Column(Integer, ForeignKey("parcel_features.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_number = Column(Integer, nullable=False)  # can be negative for basements
    floor_ulpin = Column(String(150), nullable=True, index=True)  # nullable until assigned; app-enforced unique
    floor_label = Column(String(100), nullable=False)  # e.g. "Ground Floor", "Floor 1", "3rd Basement"
    height_override_m = Column(Float, nullable=True)   # Feature E — optional per-floor height override in meters
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ULPIN reissue history (Feature B — force-reissue audit trail)
    previous_ulpin = Column(String(150), nullable=True)   # ULPIN value before last force-reissue
    reissued_at = Column(String(50), nullable=True)        # ISO datetime of last force-reissue
    reissued_by = Column(Integer, nullable=True)           # users.id of surveyor who force-reissued

    # AI Flagging columns
    flag_status = Column(String(30), nullable=True, default="clean")
    flag_reason = Column(Text, nullable=True)
    flag_score = Column(Float, nullable=True)
    flagged_at = Column(String(50), nullable=True)
    reviewed_by = Column(Integer, nullable=True)
    reviewed_at = Column(String(50), nullable=True)
    review_notes = Column(Text, nullable=True)

    # Relationships
    feature = relationship("ParcelFeature", back_populates="floors")
    flats = relationship("ParcelFlat", back_populates="floor", cascade="all, delete-orphan")


class ParcelFlat(Base):
    """
    Layer 4 / 3D Strata: Flat / Unit-level record tied to a specific floor (ParcelFloor).

    Unit ULPINs encode the specific vertical level and unit code:
      - unit_number: e.g. "704", "101"
      - unit_type: "Residential", "Commercial", "Parking", etc.

    unit_ulpin is intended to be globally unique (app-enforced; DB-level UNIQUE
    requires full table rebuild under SQLite — deferred to PostgreSQL migration).

    AI Flagging (Layer 3 — heuristic v1):
      flag_status / flag_reason / flag_score / flagged_at / reviewed_by / reviewed_at / review_notes
    """
    __tablename__ = "parcel_flats"
    __table_args__ = (Index("uq_parcel_flats_unit_ulpin", "unit_ulpin", unique=True),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    floor_id = Column(Integer, ForeignKey("parcel_floors.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(String(50), nullable=False)  # e.g. "704"
    unit_ulpin = Column(String(150), nullable=True, index=True)  # nullable until assigned; app-enforced unique
    unit_type = Column(String(50), nullable=False, default="Residential")
    area_sqm = Column(Float, nullable=True)  # surveyor-editable
    owner_name = Column(String(300), nullable=True)  # surveyor-editable
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # AI Flagging columns
    flag_status = Column(String(30), nullable=True, default="clean")
    flag_reason = Column(Text, nullable=True)
    flag_score = Column(Float, nullable=True)
    flagged_at = Column(String(50), nullable=True)
    reviewed_by = Column(Integer, nullable=True)
    reviewed_at = Column(String(50), nullable=True)
    review_notes = Column(Text, nullable=True)

    # Relationships
    floor = relationship("ParcelFloor", back_populates="flats")
