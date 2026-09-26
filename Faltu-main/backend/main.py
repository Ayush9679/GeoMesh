"""
backend/main.py
================
Bhustack3D FastAPI Application — 7-Layer Architecture

Layers served by this module:
  Layer 6 (real):  /parcels/, /locations/, /auth/, /admin/
  Layer 6 (stub):  /integrations/digilocker/, /integrations/bank-kyc/

Database: SQLite (bhustack.db) — prototype substitute for PostgreSQL + PostGIS
See: backend/README_ARCHITECTURE.md for the full architecture documentation.
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, func, or_
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User, Location, Parcel, ParcelFeature, ParcelFloor, ParcelFlat, ParcelOwnership, Role
from schemas import (
    UserSignup, UserLogin, UserResponse, TokenResponse, MessageResponse, AdminUserCreate,
    LocationResponse, LocationSearchResult, StrataEnvelope,
    AdminParcelRow, ULPINValidationResult, ConfidenceResult,
    ValidationDetails, SampleUlpinItem, SampleUlpinsResponse,
    DigiLockerStub, BankKYCStub,
    FeatureUpdateRequest, FeatureDetailResponse, FeatureDetailResponseWithFlag,
    FloorGenerateRequest, FloorCreateRequest, FloorUpdateRequest, FloorResponse, FloorResponseWithFlag,
    FlatGenerateRequest, FlatCreateRequest, FlatUpdateRequest, FlatResponse, FlatResponseWithFlag,
    AssignUlpinResponse,
    # New schemas — Feature A (citizen), B (ULPIN), C (flags)
    CitizenSearchResult, CitizenBuildingResponse, CitizenFloorResponse, CitizenFlatResponse,
    FlagResolveRequest, FlaggedItemResponse, ULPINReissueHistoryResponse,
    # New schemas — Feature D (bulk assign), E (elevations), F (building ULPIN)
    FloorBulkAssignRequest, FloorBulkAssignResponse,
    BuildingUlpinUpdateRequest, BuildingUlpinUpdateResponse,
)
from services.ulpin_generator import generate_ulpin, validate_ulpin, build_base_ulpin
from services.ai_flagging import evaluate_suspicion
from auth import hash_password, verify_password, create_access_token, get_current_user
import json, os, re
from datetime import datetime, timezone

# Create SQLite tables (creates new ones without dropping existing ones)
Base.metadata.create_all(bind=engine)
with engine.connect() as _migration_conn:
    # Migration helper — safely adds a column if it doesn't already exist
    def _safe_add_col(conn, table: str, col_def: str):
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_def}"))
            conn.commit()
        except Exception:
            pass

    # Original migration (preserves existing DB)
    _safe_add_col(_migration_conn, "parcel_features", "notes TEXT")

    # Feature A — parcel_ownership user_id FK
    _safe_add_col(_migration_conn, "parcel_ownership", "user_id INTEGER")

    # Feature B+C — AI flag columns on parcel_features
    _safe_add_col(_migration_conn, "parcel_features", "flag_status TEXT DEFAULT 'clean'")
    _safe_add_col(_migration_conn, "parcel_features", "flag_reason TEXT")
    _safe_add_col(_migration_conn, "parcel_features", "flag_score REAL")
    _safe_add_col(_migration_conn, "parcel_features", "flagged_at TEXT")
    _safe_add_col(_migration_conn, "parcel_features", "reviewed_by INTEGER")
    _safe_add_col(_migration_conn, "parcel_features", "reviewed_at TEXT")
    _safe_add_col(_migration_conn, "parcel_features", "review_notes TEXT")

    # Feature B+C — AI flag + reissue history columns on parcel_floors
    _safe_add_col(_migration_conn, "parcel_floors", "flag_status TEXT DEFAULT 'clean'")
    _safe_add_col(_migration_conn, "parcel_floors", "flag_reason TEXT")
    _safe_add_col(_migration_conn, "parcel_floors", "flag_score REAL")
    _safe_add_col(_migration_conn, "parcel_floors", "flagged_at TEXT")
    _safe_add_col(_migration_conn, "parcel_floors", "reviewed_by INTEGER")
    _safe_add_col(_migration_conn, "parcel_floors", "reviewed_at TEXT")
    _safe_add_col(_migration_conn, "parcel_floors", "review_notes TEXT")
    _safe_add_col(_migration_conn, "parcel_floors", "previous_ulpin TEXT")
    _safe_add_col(_migration_conn, "parcel_floors", "reissued_at TEXT")
    _safe_add_col(_migration_conn, "parcel_floors", "reissued_by INTEGER")

    # Feature B+C — AI flag columns on parcel_flats
    _safe_add_col(_migration_conn, "parcel_flats", "flag_status TEXT DEFAULT 'clean'")
    _safe_add_col(_migration_conn, "parcel_flats", "flag_reason TEXT")
    _safe_add_col(_migration_conn, "parcel_flats", "flag_score REAL")
    _safe_add_col(_migration_conn, "parcel_flats", "flagged_at TEXT")
    _safe_add_col(_migration_conn, "parcel_flats", "reviewed_by INTEGER")
    _safe_add_col(_migration_conn, "parcel_flats", "reviewed_at TEXT")
    _safe_add_col(_migration_conn, "parcel_flats", "review_notes TEXT")

    # Feature E — Floor heights & elevations
    _safe_add_col(_migration_conn, "parcel_features", "floor_height_m REAL DEFAULT 3.0")
    _safe_add_col(_migration_conn, "parcel_floors", "height_override_m REAL")

    # Feature F — Building-level ULPIN reassignment & history
    _safe_add_col(_migration_conn, "parcel_features", "building_ulpin_assigned_at TEXT")
    _safe_add_col(_migration_conn, "parcel_features", "building_ulpin_reassigned_by INTEGER")
    _safe_add_col(_migration_conn, "parcel_features", "building_ulpin_history TEXT")
    _safe_add_col(_migration_conn, "parcel_features", "building_ulpin TEXT")

    # Enforce global ULPIN uniqueness in SQLite. Older databases can contain
    # duplicate floor assignments; keep the first and move later copies into
    # the existing reissue audit columns before clearing them for reassignment.
    try:
        _migration_conn.execute(text("""
            UPDATE parcel_floors
            SET previous_ulpin = floor_ulpin, floor_ulpin = NULL
            WHERE floor_ulpin IS NOT NULL
              AND id NOT IN (
                SELECT MIN(id) FROM parcel_floors
                WHERE floor_ulpin IS NOT NULL GROUP BY floor_ulpin
              )
        """))
        _migration_conn.commit()
        _migration_conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_parcel_floors_floor_ulpin "
            "ON parcel_floors (floor_ulpin) WHERE floor_ulpin IS NOT NULL"
        ))
        _migration_conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_parcel_flats_unit_ulpin "
            "ON parcel_flats (unit_ulpin) WHERE unit_ulpin IS NOT NULL"
        ))
        _migration_conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_parcel_features_building_ulpin "
            "ON parcel_features (building_ulpin) WHERE building_ulpin IS NOT NULL"
        ))
        _migration_conn.commit()
    except Exception as exc:
        _migration_conn.rollback()
        print(f"[Migration] Could not apply ULPIN unique indexes: {exc}")

app = FastAPI(
    title="Bhustack3D — 7-Layer Cadastral Intelligence API",
    version="2.0.0",
    description=(
        "FastAPI backend implementing the SIH26011 7-layer architecture for 3D cadastral "
        "intelligence. Layer 6 real endpoints: /auth, /locations, /parcels, /admin. "
        "Layer 6 stub endpoints (mock: true): /integrations/digilocker, /integrations/bank-kyc."
    ),
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:3000",
        "https://causatively-gonangial-jennefer.ngrok-free.dev",
        "http://causatively-gonangial-jennefer.ngrok-free.dev",
    ],
    # Permit common local hosts and ngrok domains during development only.
    allow_origin_regex=r"^https?:\/\/([a-zA-Z0-9-]+\.)*(ngrok-free\.dev|ngrok-free\.app|ngrok\.io|localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# KP2 Seed Helpers (legacy — preserves existing Location table seeding)
# ─────────────────────────────────────────────────────────────────────────────

def _compute_ulpin_check_legacy(raw: str) -> int:
    """Legacy check digit used for the Location table ULPIN (sum of digits mod 10)."""
    total = sum(int(ch) for ch in raw if ch.isdigit())
    return total % 10


def _build_kp2_compact_features(features: list) -> str:
    """
    Returns a compact JSON string containing only the fields needed by the
    frontend 3D renderer: fid, name, area_m2, est_height, and geometry.
    """
    compact = []
    for feat in features:
        props = feat.get("properties", {})
        compact.append({
            "fid": props.get("fid"),
            "name": props.get("name") or None,
            "area_m2": props.get("area_m2") or 0,
            "est_height": props.get("est_height") or 6.0,
            "building": props.get("building") or "yes",
            "geometry": feat.get("geometry"),
        })
    return json.dumps(compact, separators=(",", ":"))


def seed_kp2_location(db: Session) -> None:
    """
    One-time seed: read kp2_parcel.geojson, compute centroid, insert Location row.
    Safe to call multiple times — skips if already seeded.
    This seeds the LEGACY Location table used by the Globe / search / portal flow.
    The Layer 4 Parcel table is seeded separately via scripts/seed_parcels.py.
    """
    KP2_ID = "knowledge-park-2"
    existing = db.query(Location).filter(Location.id == KP2_ID).first()
    if existing:
        return  # already seeded

    geojson_path = os.path.join(os.path.dirname(__file__), "data", "kp2_parcel.geojson")
    if not os.path.exists(geojson_path):
        print(f"[Startup] WARNING: {geojson_path} not found — skipping KP2 seed.")
        return

    with open(geojson_path, encoding="utf-8") as f:
        gj = json.load(f)

    features = gj.get("features", [])
    if not features:
        print("[Startup] WARNING: KP2 GeoJSON has no features — skipping seed.")
        return

    # Compute centroid (average of all coordinate vertices)
    all_lons, all_lats = [], []
    total_area = 0.0
    for feat in features:
        props = feat.get("properties", {})
        total_area += props.get("area_m2") or 0
        geom = feat.get("geometry", {})
        gtype = geom.get("type", "")
        coords = geom.get("coordinates", [])
        if gtype == "Polygon":
            for ring in coords:
                for lon, lat in ring:
                    all_lons.append(lon)
                    all_lats.append(lat)
        elif gtype == "MultiPolygon":
            for poly in coords:
                for ring in poly:
                    for lon, lat in ring:
                        all_lons.append(lon)
                        all_lats.append(lat)

    centroid_lat = sum(all_lats) / len(all_lats) if all_lats else 28.4558
    centroid_lon = sum(all_lons) / len(all_lons) if all_lons else 77.5000

    # Generate 3D ULPIN using Layer 5's generator
    try:
        from services.ulpin_generator import generate_ulpin, build_base_ulpin
        base_ulpin = build_base_ulpin("UP", "28", "KP2GNIDA0A")
        ulpin_3d = generate_ulpin(base_ulpin, 0, "0000")
    except Exception:
        # Fallback to legacy method if Layer 5 module unavailable on first boot
        base_ulpin = "UP1228KP2GNIDA0A"[:14].ljust(14, "A")
        raw_for_check = base_ulpin + "0101"
        check = _compute_ulpin_check_legacy(raw_for_check)
        ulpin_3d = f"{base_ulpin}-V01-U0101-C{check}"

    area_str = f"{int(round(total_area)):,} m²"
    avg_height = 9.0
    volume_est = int(round(total_area * avg_height))
    volume_str = f"~{volume_est:,} m³"

    compact_json = _build_kp2_compact_features(features)

    kp2 = Location(
        id=KP2_ID,
        name="Knowledge Park 2, Greater Noida",
        state="Uttar Pradesh",
        lat=round(centroid_lat, 7),
        lon=round(centroid_lon, 7),
        ulpin_3d=ulpin_3d,
        classification="Industrial & Commercial Multi-Cluster (QGIS Real Data)",
        area=area_str,
        volume=volume_str,
        elevation="+198m MSL",
        zone="Knowledge Park-II, GNIDA Special Zone",
        description=(
            f"Real digitized multi-building cluster in Knowledge Park 2, Greater Noida — "
            f"includes India Expo Mart, KP-II Institute buildings, hostels, and {len(features)} "
            "individual commercial/residential/institutional structures. Data sourced from "
            "OpenStreetMap via QGIS export."
        ),
        strata_air="L3 · Commercial & Institutional Air Rights (+9m to +18m above each block)",
        strata_surface="L1 · Knowledge Park-II Industrial & Commercial Land (Ground Level)",
        strata_subsurface="L0 · NMRC Aqua Line Metro Corridor Easement (-12m to 0m)",
        geojson_features=compact_json,
        feature_count=len(features),
    )
    db.add(kp2)
    db.commit()
    print(
        f"[Startup] Seeded KP2 Location: {len(features)} features, "
        f"centroid ({centroid_lat:.6f}°N, {centroid_lon:.6f}°E), "
        f"total area {area_str}, ULPIN: {ulpin_3d}"
    )


def seed_kp2_parcels(db: Session) -> None:
    """
    Seed Layer 4 Parcel + ParcelFeature records for KP2 on startup.
    Runs the full Layer 2→3→5→4 pipeline inline (no subprocess needed).
    Safe to call multiple times — skips if already seeded.
    """
    from models import Parcel as P, ParcelFeature as PF, ParcelOwnership

    # Quick check — if any parcels exist, skip
    if db.query(P).count() > 0:
        return

    geojson_path = os.path.join(os.path.dirname(__file__), "data", "kp2_parcel.geojson")
    if not os.path.exists(geojson_path):
        print("[Startup] WARNING: GeoJSON not found — skipping Layer 4 parcel seed.")
        return

    try:
        with open(geojson_path, encoding="utf-8") as f:
            gj = json.load(f)

        from services.ulpin_generator import generate_ulpin, build_base_ulpin
        from services.ai_extraction import extract_footprints

        features = extract_footprints(gj)
        BASE_ULPIN = build_base_ulpin("UP", "28", "KP2GNIDA0A")
        cluster_ulpin = generate_ulpin(BASE_ULPIN, 0, "0000")

        all_lons, all_lats, total_area = [], [], 0.0
        for feat in features:
            props = feat.get("properties", {})
            total_area += float(props.get("area_m2") or 0)
            geom = feat.get("geometry", {})
            for ring in _iter_rings(geom):
                for lon, lat in ring:
                    all_lons.append(lon); all_lats.append(lat)

        centroid_lat = sum(all_lats) / len(all_lats) if all_lats else 28.4558
        centroid_lon = sum(all_lons) / len(all_lons) if all_lons else 77.5000

        parcel = P(
            ulpin_3d=cluster_ulpin,
            parent_land_ulpin=BASE_ULPIN,
            name="Knowledge Park 2 Parcel Cluster, Greater Noida",
            centroid_lat=round(centroid_lat, 7),
            centroid_lon=round(centroid_lon, 7),
            total_area=round(total_area, 3),
            confidence_score="satellite-only",
            last_verified_date=datetime.now(timezone.utc),
        )
        db.add(parcel)
        db.flush()

        db.add(ParcelOwnership(
            parcel_id=parcel.id,
            owner_name="GNIDA — Greater Noida Industrial Development Authority",
            aadhaar_ref=None,
            registration_doc_ref="GNIDA/KP2/MASTER-LEASE/2018/REF001 [STUB]",
            is_verified=False,
        ))

        for i, feat in enumerate(features, start=1):
            props = feat.get("properties", {})
            fid = props.get("fid", i)
            geom = feat.get("geometry", {})
            area = float(props.get("area_m2") or 0)
            height = float(props.get("est_height") or 6.0)
            floor_count = max(1, round(height / 3.0))
            feat_ulpin = generate_ulpin(BASE_ULPIN, 0, f"{i:04d}")
            db.add(PF(
                parcel_id=parcel.id,
                fid=fid,
                ulpin_3d=feat_ulpin,
                geometry_json=json.dumps(geom, separators=(",", ":")),
                height=height,
                area=area,
                floor_level=0,
                floor_count=floor_count,
                building_type=props.get("building") or "yes",
                feature_name=props.get("name") or None,
            ))

        db.commit()
        print(f"[Startup] Seeded Layer 4: {len(features)} ParcelFeature rows, cluster ULPIN: {cluster_ulpin}")

    except Exception as e:
        db.rollback()
        print(f"[Startup] WARNING: Layer 4 parcel seed failed: {e}")


def _iter_rings(geom: dict):
    """Yield coordinate rings from a Polygon or MultiPolygon geometry."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])
    if gtype == "Polygon":
        yield from coords
    elif gtype == "MultiPolygon":
        for poly in coords:
            yield from poly


def _location_to_response(loc: Location) -> LocationResponse:
    """Convert a Location ORM row to a LocationResponse."""
    envelopes = [
        StrataEnvelope(type="air", label=loc.strata_air, range=loc.strata_air.split("(")[-1].rstrip(")") if "(" in loc.strata_air else ""),
        StrataEnvelope(type="surface", label=loc.strata_surface, range="Ground Level"),
        StrataEnvelope(type="subsurface", label=loc.strata_subsurface, range=loc.strata_subsurface.split("(")[-1].rstrip(")") if "(" in loc.strata_subsurface else ""),
    ]
    return LocationResponse(
        id=loc.id,
        name=loc.name,
        state=loc.state,
        lat=loc.lat,
        lon=loc.lon,
        ulpin_3d=loc.ulpin_3d,
        classification=loc.classification,
        area=loc.area,
        volume=loc.volume,
        elevation=loc.elevation,
        zone=loc.zone,
        description=loc.description,
        envelopes=envelopes,
        geojson_features=loc.geojson_features,
        feature_count=loc.feature_count,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Startup Events
# ─────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
def seed_demo_surveyor():
    """Seed a demo administrative surveyor account if not already present."""
    db = next(get_db())
    try:
        demo_email = "rajesh.verma@bhustack.gov.in"
        existing = db.query(User).filter(User.email == demo_email).first()
        if not existing:
            demo_user = User(
                name="Dr. Rajesh Verma",
                email=demo_email,
                hashed_password=hash_password("Surveyor@123"),
                role="SURVEYOR",
            )
            db.add(demo_user)
            db.commit()
            print("[Startup] Seeded demo account: rajesh.verma@bhustack.gov.in (Role: SURVEYOR)")
    finally:
        db.close()


@app.on_event("startup")
def seed_kp2():
    """Seed the Knowledge Park 2 real parcel data (Location table)."""
    db = next(get_db())
    try:
        seed_kp2_location(db)
    finally:
        db.close()


@app.on_event("startup")
def seed_kp2_layer4():
    """Seed Layer 4 Parcel + ParcelFeature records for KP2."""
    db = next(get_db())
    try:
        seed_kp2_parcels(db)
    finally:
        db.close()


@app.on_event("startup")
def seed_sih2026_demo_accounts():
    """
    Idempotent: seed the two fixed SIH2026 demo accounts.
    Credentials documented in DEMO_CREDENTIALS.md at repo root.
    """
    db = next(get_db())
    try:
        DEMO_ACCOUNTS = [
            {
                "name": "Demo Surveyor",
                "email": "surveyor.demo@bhustack3d.local",
                "password": "Surveyor@2026",
                "role": Role.SURVEYOR.value,
            },
            {
                "name": "Demo Citizen",
                "email": "citizen.demo@bhustack3d.local",
                "password": "Citizen@2026",
                "role": Role.CITIZEN.value,
            },
        ]
        for acc in DEMO_ACCOUNTS:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if not existing:
                user = User(
                    name=acc["name"],
                    email=acc["email"],
                    hashed_password=hash_password(acc["password"]),
                    role=acc["role"],
                )
                db.add(user)
                print(f"[Startup] Seeded SIH2026 demo account: {acc['email']} ({acc['role']})")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Startup] WARNING: demo account seed failed: {e}")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Health & Root
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Bhustack3D Geospatial Intelligence API",
        "version": "2.0.0",
        "architecture": "7-layer SIH26011",
        "layers": {
            "L1": "Data Acquisition — QGIS manual digitization (real)",
            "L2": "Pre-processing — Shapely validation/repair (real)",
            "L3": "AI Flagging — Rule-based heuristic v1 (real, 6 named rules; not ML)",
            "L4": "3D Cadastral DB — SQLite/SQLAlchemy (real, simplified)",
            "L5": "ULPIN Generation — Verhoeff checksum (real)",
            "L6": "API Layer — /parcels /admin /citizen real; /integrations STUB",
            "L7": "Application — React citizen portal + Admin Dashboard + Flag Queue",
        },
    }


@app.get("/stats")
def get_platform_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Aggregate platform statistics.
    Returns counts of parcels, features (buildings), floors, flats, and flagged items.
    Requires authentication (any role).
    """
    total_parcels = db.query(Parcel).count()
    total_features = db.query(ParcelFeature).count()
    total_floors = db.query(ParcelFloor).count()
    total_flats = db.query(ParcelFlat).count()
    flagged_count = (
        db.query(ParcelFeature).filter(ParcelFeature.flag_status == "flagged").count()
        + db.query(ParcelFloor).filter(ParcelFloor.flag_status == "flagged").count()
        + db.query(ParcelFlat).filter(ParcelFlat.flag_status == "flagged").count()
    )
    total_area = db.query(func.sum(Parcel.total_area)).scalar() or 0.0
    return {
        "total_parcels": total_parcels,
        "total_features": total_features,
        "total_buildings": total_features,
        "total_floors": total_floors,
        "total_flats": total_flats,
        "flagged_count": flagged_count,
        "total_area": float(total_area),
        "avg_confidence": 90,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Auth Routes (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserSignup, db: Session = Depends(get_db)):
    """Register a new user, store with bcrypt hash, and return access token."""
    email_clean = data.email.lower().strip()
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in.",
        )

    new_user = User(
        name=data.name.strip(),
        email=email_clean,
        hashed_password=hash_password(data.password),
        role="citizen",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "email": new_user.email, "role": new_user.role})
    return TokenResponse(access_token=token, token_type="bearer", user=new_user)


@app.post("/auth/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate email and password against bcrypt hash and issue JWT access token."""
    email_clean = data.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Protected route: returns the logged-in user's profile based on the JWT token."""
    return current_user


@app.post("/auth/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """Instruct the frontend client to discard the access token."""
    return MessageResponse(detail="Successfully logged out. Please discard your access token.")


# ─────────────────────────────────────────────────────────────────────────────
# Location / Parcel Routes (Layer 6 — Real)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/locations/search", response_model=list[LocationSearchResult])
def search_locations(
    q: str = Query(..., min_length=1, description="Search query — location name, state, ULPIN, or classification"),
    db: Session = Depends(get_db),
):
    """
    Fuzzy-search registered cadastral locations by name, state, ULPIN, or zone.
    Returns lightweight results without the heavy geojson_features blob.
    """
    term = f"%{q.lower().strip()}%"
    results = (
        db.query(Location)
        .filter(
            Location.name.ilike(term)
            | Location.state.ilike(term)
            | Location.ulpin_3d.ilike(term)
            | Location.zone.ilike(term)
            | Location.classification.ilike(term)
        )
        .limit(20)
        .all()
    )
    return [
        LocationSearchResult(
            id=loc.id,
            name=loc.name,
            state=loc.state,
            lat=loc.lat,
            lon=loc.lon,
            ulpin_3d=loc.ulpin_3d,
            classification=loc.classification,
            area=loc.area,
            elevation=loc.elevation,
            feature_count=loc.feature_count,
        )
        for loc in results
    ]


@app.get("/parcels/{ulpin_id}", response_model=LocationResponse)
def get_parcel(ulpin_id: str, db: Session = Depends(get_db)):
    """
    Retrieve full parcel data by ULPIN code or location slug.
    For multi-unit parcels (e.g. Knowledge Park 2), the response includes
    geojson_features: a JSON array of all sub-feature geometries for 3D rendering.

    Searches the Location table (legacy cluster registry) first,
    then falls back to the Parcel table (Layer 4) for feature-level lookups.
    """
    # Try Location table first (by ULPIN then by slug)
    loc = db.query(Location).filter(Location.ulpin_3d == ulpin_id).first()
    if not loc:
        loc = db.query(Location).filter(Location.id == ulpin_id).first()

    # Fallback: check Layer 4 Parcel table
    if not loc:
        parcel = db.query(Parcel).filter(Parcel.ulpin_3d == ulpin_id).first()
        if parcel:
            # Build a synthetic LocationResponse from the Parcel record
            feature_count = db.query(ParcelFeature).filter(ParcelFeature.parcel_id == parcel.id).count()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Parcel '{ulpin_id}' found in Layer 4 DB (feature-level ULPIN). "
                    f"Use /admin/parcels to browse all parcels."
                ),
            )

    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel '{ulpin_id}' not found in the cadastral registry.",
        )
    return _location_to_response(loc)


@app.get("/public/sample-ulpins", response_model=SampleUlpinsResponse)
@app.get("/parcels/sample-ulpins", response_model=SampleUlpinsResponse)
def get_sample_ulpins(limit: int = 4, db: Session = Depends(get_db)):
    """
    Public endpoint: returns live, currently-valid ULPINs pulled directly from the
    authenticated database registry for quick verification specimen testing.
    Mix of Flat (Unit), Floor (Vertical), Building (Superstructure), and Parcel (Ground).
    """
    samples = []

    # 1. Unit Level (Flat)
    flat = db.query(ParcelFlat).filter(ParcelFlat.unit_ulpin.isnot(None)).order_by(ParcelFlat.id.desc()).first()
    if flat and flat.unit_ulpin:
        samples.append(SampleUlpinItem(
            label=f"{flat.unit_number} (Unit Level)",
            value=flat.unit_ulpin,
            level="Unit Level",
            entity_type="FLAT",
        ))

    # 2. Vertical Level (Floor)
    floor = db.query(ParcelFloor).filter(ParcelFloor.floor_ulpin.isnot(None)).order_by(ParcelFloor.id.desc()).first()
    if floor and floor.floor_ulpin:
        f_lbl = floor.floor_label or f"Floor {floor.floor_number}"
        samples.append(SampleUlpinItem(
            label=f"{f_lbl} Plate (Vertical Level)",
            value=floor.floor_ulpin,
            level="Vertical Level",
            entity_type="FLOOR",
        ))

    # 3. Superstructure Level (Building)
    building = db.query(ParcelFeature).filter(or_(ParcelFeature.building_ulpin.isnot(None), ParcelFeature.ulpin_3d.isnot(None))).first()
    building_code = (building.building_ulpin or building.ulpin_3d) if building else None
    if building and building_code:
        b_name = building.feature_name or f"Building #{building.id}"
        samples.append(SampleUlpinItem(
            label=f"{b_name} (Building Level)",
            value=building_code,
            level="Building Level",
            entity_type="BUILDING",
        ))

    # 4. Ground Parcel Level
    parcel = db.query(Parcel).filter(Parcel.ulpin_3d.isnot(None)).first()
    if parcel and parcel.ulpin_3d:
        p_name = parcel.name or "Knowledge Park II"
        if len(p_name) > 28:
            p_name = "Knowledge Park II"
        samples.append(SampleUlpinItem(
            label=f"{p_name} (Ground Parcel)",
            value=parcel.ulpin_3d,
            level="Ground Parcel",
            entity_type="PARCEL",
        ))

    return SampleUlpinsResponse(samples=samples[:limit])


@app.get("/parcels/{ulpin_id}/validate", response_model=ULPINValidationResult)
def validate_parcel_ulpin(ulpin_id: str, db: Session = Depends(get_db)):
    """
    Layer 5 + 6 Integration: Validate a 3D ULPIN's check digit and authenticate
    against the official 3D cadastral registry.

    Distinguishes:
      - MALFORMED: doesn't match {14-char base}-V{level}-U{unit}-C{digit}
      - CHECKSUM_FAILED: check digit mismatch
      - NOT_FOUND: well-formed ULPIN with valid checksum, but not in official registry
      - AUTHENTICATED: valid check digit + active record in database
    """
    from services.ulpin_generator import validate_ulpin

    clean_code = (ulpin_id or "").strip().upper()
    if not clean_code:
        return ULPINValidationResult(
            ulpin=ulpin_id,
            valid=False,
            check_digit_expected=-1,
            check_digit_found=-1,
            error_type="MALFORMED",
            message="Please enter a valid 3D ULPIN identifier.",
        )

    # 1. Algorithmic checksum validation
    is_valid, expected, found = validate_ulpin(clean_code)

    if expected == -1:
        # Check if it's a 14-char base land parcel ULPIN (e.g. UP28KP2GNIDA0A)
        parcel = db.query(Parcel).filter(func.upper(Parcel.parent_land_ulpin) == clean_code).first()
        if parcel:
            return ULPINValidationResult(
                ulpin=clean_code,
                valid=True,
                check_digit_expected=0,
                check_digit_found=0,
                entity_type="PARCEL",
                message="VALID: Authentic base land parcel record confirmed in national registry ✓",
                details=ValidationDetails(
                    name=parcel.name or "Cadastral Land Parcel",
                    level="Surface Land Parcel",
                    parentHierarchy="State of Uttar Pradesh / Gautam Buddha Nagar",
                    confidence=94,
                    verificationDate=parcel.last_verified_date.strftime("%Y-%m-%d") if parcel.last_verified_date else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    issuingAuthority="Department of Land Resources & Survey of India",
                    geographicalBoundary=f"{parcel.centroid_lat:.4f}N, {parcel.centroid_lon:.4f}E",
                )
            )

        return ULPINValidationResult(
            ulpin=clean_code,
            valid=False,
            check_digit_expected=-1,
            check_digit_found=-1,
            error_type="MALFORMED",
            message=(
                "INVALID FORMAT: Could not parse ULPIN structure. "
                "Expected format: {14-char base}-V{level}-U{unit}-C{digit}"
            ),
        )

    if not is_valid:
        return ULPINValidationResult(
            ulpin=clean_code,
            valid=False,
            check_digit_expected=expected,
            check_digit_found=found,
            error_type="CHECKSUM_FAILED",
            message=f"INVALID CHECKSUM: Check digit {found} does not match expected {expected} ✗",
        )

    # 2. Database registry lookup to verify authentic registration and return details
    # Check Flat
    flat = db.query(ParcelFlat).filter(func.upper(ParcelFlat.unit_ulpin) == clean_code).first()
    if flat:
        floor = db.query(ParcelFloor).filter(ParcelFloor.id == flat.floor_id).first()
        feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first() if floor else None
        parcel = db.query(Parcel).filter(Parcel.id == feature.parcel_id).first() if feature else None
        
        bldg_name = (feature.feature_name if feature and feature.feature_name else f"Building #{feature.id}") if feature else "Building"
        floor_label = (floor.floor_label or f"Floor {floor.floor_number}") if floor else "Floor"
        parent_hier = f"{parcel.name if parcel else 'Knowledge Park II'} / {bldg_name} / {floor_label}"

        return ULPINValidationResult(
            ulpin=clean_code,
            valid=True,
            check_digit_expected=expected,
            check_digit_found=found,
            entity_type="FLAT",
            message=f"VALID: Authentic unit-level record confirmed in cadastral registry (Check digit {found} ✓)",
            details=ValidationDetails(
                name=f"{flat.unit_number} ({flat.unit_type or 'Residential Unit'})",
                level=f"{floor_label} — Unit Level",
                parentHierarchy=parent_hier,
                confidence=98,
                verificationDate=flat.updated_at.strftime("%Y-%m-%d") if flat.updated_at else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                issuingAuthority="Department of Land Resources & Survey of India",
                geographicalBoundary="Uttar Pradesh (Gautam Buddha Nagar)",
            )
        )

    # Check Floor
    floor = db.query(ParcelFloor).filter(func.upper(ParcelFloor.floor_ulpin) == clean_code).first()
    if floor:
        feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first()
        parcel = db.query(Parcel).filter(Parcel.id == feature.parcel_id).first() if feature else None
        bldg_name = (feature.feature_name if feature and feature.feature_name else f"Building #{feature.id}") if feature else "Building"
        parent_hier = f"{parcel.name if parcel else 'Knowledge Park II'} / {bldg_name}"
        floor_label = floor.floor_label or f"Floor {floor.floor_number}"

        return ULPINValidationResult(
            ulpin=clean_code,
            valid=True,
            check_digit_expected=expected,
            check_digit_found=found,
            entity_type="FLOOR",
            message=f"VALID: Authentic vertical floor plate confirmed in cadastral registry (Check digit {found} ✓)",
            details=ValidationDetails(
                name=f"{floor_label} Plate",
                level="Building Vertical Level",
                parentHierarchy=parent_hier,
                confidence=96,
                verificationDate=floor.updated_at.strftime("%Y-%m-%d") if floor.updated_at else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                issuingAuthority="Department of Land Resources & Survey of India",
                geographicalBoundary="Uttar Pradesh (Gautam Buddha Nagar)",
            )
        )

    # Check Building Feature
    feature = db.query(ParcelFeature).filter(or_(
        func.upper(ParcelFeature.building_ulpin) == clean_code,
        func.upper(ParcelFeature.ulpin_3d) == clean_code,
    )).first()
    if feature:
        parcel = db.query(Parcel).filter(Parcel.id == feature.parcel_id).first()
        bldg_name = feature.feature_name or f"Cadastral Structure #{feature.id}"
        parent_hier = parcel.name if parcel else "Knowledge Park II"

        return ULPINValidationResult(
            ulpin=clean_code,
            valid=True,
            check_digit_expected=expected,
            check_digit_found=found,
            entity_type="BUILDING",
            message=f"VALID: Authentic superstructure record confirmed in cadastral registry (Check digit {found} ✓)",
            details=ValidationDetails(
                name=bldg_name,
                level="Superstructure Level",
                parentHierarchy=parent_hier,
                confidence=95,
                verificationDate=feature.building_ulpin_assigned_at or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                issuingAuthority="Department of Land Resources & Survey of India",
                geographicalBoundary="Uttar Pradesh (Gautam Buddha Nagar)",
            )
        )

    # Check Parcel
    parcel = db.query(Parcel).filter(func.upper(Parcel.ulpin_3d) == clean_code).first()
    if parcel:
        return ULPINValidationResult(
            ulpin=clean_code,
            valid=True,
            check_digit_expected=expected,
            check_digit_found=found,
            entity_type="PARCEL",
            message=f"VALID: Authentic surface parcel record confirmed in cadastral registry (Check digit {found} ✓)",
            details=ValidationDetails(
                name=parcel.name or "Cadastral Land Parcel",
                level="Surface Land Parcel",
                parentHierarchy="State of Uttar Pradesh / Gautam Buddha Nagar",
                confidence=94,
                verificationDate=parcel.last_verified_date.strftime("%Y-%m-%d") if parcel.last_verified_date else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                issuingAuthority="Department of Land Resources & Survey of India",
                geographicalBoundary=f"{parcel.centroid_lat:.4f}N, {parcel.centroid_lon:.4f}E",
            )
        )

    # Valid algorithmic checksum, but no database entry found
    return ULPINValidationResult(
        ulpin=clean_code,
        valid=False,
        check_digit_expected=expected,
        check_digit_found=found,
        error_type="NOT_FOUND",
        message=(
            f"IDENTIFIER NOT FOUND IN REGISTRY: Well-formed ULPIN with valid checksum (C{found}), "
            "but no matching authenticated 3D cadastral record exists in the national database."
        ),
    )



@app.get("/parcels/{ulpin_id}/confidence", response_model=ConfidenceResult)
def get_parcel_confidence(ulpin_id: str, db: Session = Depends(get_db)):
    """
    Return the confidence score and last verified date for a parcel.

    Confidence tiers (per SIH26011 Novelty 4 — Data Authenticity):
      satellite-only         — footprint from satellite imagery only
      drone-verified         — confirmed by drone survey
      lidar-verified         — confirmed by LiDAR point cloud
      sanction-plan-verified — matched against approved building sanction plan
    """
    CONFIDENCE_DESCRIPTIONS = {
        "satellite-only": (
            "Footprint digitized from satellite imagery only. "
            "Geometry is approximate (±1-3m accuracy). "
            "Not yet validated by ground survey or official records."
        ),
        "drone-verified": (
            "Building confirmed by drone LiDAR/photogrammetry survey. "
            "Geometry accuracy ±10cm. Heights verified."
        ),
        "lidar-verified": (
            "Full LiDAR point cloud capture completed. "
            "3D model accuracy ±5cm. Floor plans verified."
        ),
        "sanction-plan-verified": (
            "Matched against approved building sanction plan. "
            "Highest confidence tier — legally validated cadastral record."
        ),
    }

    # Check Layer 4 Parcel table first
    parcel = db.query(Parcel).filter(Parcel.ulpin_3d == ulpin_id).first()
    if parcel:
        return ConfidenceResult(
            ulpin_3d=parcel.ulpin_3d,
            confidence_score=parcel.confidence_score,
            last_verified_date=parcel.last_verified_date,
            confidence_description=CONFIDENCE_DESCRIPTIONS.get(
                parcel.confidence_score, "Unknown confidence tier."
            ),
        )

    # Check legacy Location table
    loc = db.query(Location).filter(
        (Location.ulpin_3d == ulpin_id) | (Location.id == ulpin_id)
    ).first()
    if loc:
        return ConfidenceResult(
            ulpin_3d=loc.ulpin_3d,
            confidence_score="satellite-only",
            last_verified_date=None,
            confidence_description=CONFIDENCE_DESCRIPTIONS["satellite-only"],
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Parcel '{ulpin_id}' not found.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Admin / Government Dashboard Routes (Layer 7 — Real, Role-Protected)
# ─────────────────────────────────────────────────────────────────────────────

# Roles that can access admin/surveyor endpoints (both strings preserved for legacy compat)
def _normalized_role(user: User) -> Role | None:
    try:
        return Role((user.role or "").strip().lower())
    except ValueError:
        return None


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: ensure the caller has admin or surveyor role."""
    if _normalized_role(current_user) not in {Role.ADMIN, Role.SURVEYOR}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin or Surveyor role required. Citizens cannot perform this action.",
        )
    return current_user


def _require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency for platform administration reserved strictly for admins."""
    if _normalized_role(current_user) != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Platform Admin role required.",
        )
    return current_user


@app.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin_managed_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_platform_admin),
):
    """Create a surveyor or admin account; public signup remains citizen-only."""
    email_clean = data.email.lower().strip()
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists.")
    user = User(
        name=email_clean.split("@", 1)[0],
        email=email_clean,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _require_surveyor(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency: ensure the caller has surveyor or admin role.
    Used on ULPIN-assignment and mutation routes that require surveyor authority.
    Returns 403 (not 401) with a clear detail message for citizen tokens.
    """
    if _normalized_role(current_user) not in {Role.SURVEYOR, Role.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Access denied. Surveyor role required. "
                "Only a certified surveyor can assign or modify 3D ULPINs. "
                "Citizen accounts have read-only access to parcel data."
            ),
        )
    return current_user


@app.get("/admin/parcels", response_model=list[AdminParcelRow])
def list_admin_parcels(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """
    Admin/Surveyor endpoint: list all parcels in the Layer 4 database.
    Returns lightweight rows (no geometry) for the Admin Dashboard table.
    Requires role: admin or surveyor (SURVEYOR).
    """
    parcels = db.query(Parcel).order_by(Parcel.id).all()
    rows = []
    for p in parcels:
        feat_count = db.query(ParcelFeature).filter(ParcelFeature.parcel_id == p.id).count()
        rows.append(AdminParcelRow(
            id=p.id,
            ulpin_3d=p.ulpin_3d,
            name=p.name,
            centroid_lat=p.centroid_lat,
            centroid_lon=p.centroid_lon,
            total_area=p.total_area,
            confidence_score=p.confidence_score,
            last_verified_date=p.last_verified_date,
            feature_count=feat_count,
        ))
    return rows


@app.get("/admin/features", response_model=list[dict])
def list_admin_features(
    parcel_id: int = Query(None, description="Filter by parcel ID"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """
    Admin endpoint: list individual ParcelFeature records (per-building ULPINs).
    Requires role: admin or surveyor.
    """
    q = db.query(ParcelFeature)
    if parcel_id:
        q = q.filter(ParcelFeature.parcel_id == parcel_id)
    features = q.offset(offset).limit(limit).all()
    return [
        {
            "id": f.id,
            "parcel_id": f.parcel_id,
            "fid": f.fid,
            "ulpin_3d": f.ulpin_3d,
            "height": f.height,
            "area": f.area,
            "floor_level": f.floor_level,
            "floor_count": f.floor_count,
            "building_type": f.building_type,
            "feature_name": f.feature_name,
        }
        for f in features
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Surveyor Edit Access — Drill-Down (Parcel → Building → Floor → Flat)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_base_ulpin(parcel: Parcel) -> str:
    """Extract or construct a 14-character base ULPIN from a parcel."""
    if parcel.parent_land_ulpin and len(parcel.parent_land_ulpin.strip()) == 14:
        return parcel.parent_land_ulpin.strip()
    if parcel.ulpin_3d:
        candidate = parcel.ulpin_3d.split("-")[0].strip()
        if len(candidate) == 14:
            return candidate
    return build_base_ulpin("UP", "28", "KP2GNIDA0A")


def _assign_floor_ulpin(floor: ParcelFloor, feature: ParcelFeature, parcel: Parcel,
                        db: Session, actor: User, force: bool = False):
    """Shared validated assignment path for single and bulk floor ULPIN routes."""
    if floor.floor_ulpin and not force:
        raise HTTPException(status_code=409, detail=f"Floor {floor.id} already has a ULPIN. Pass force=true to reissue.")
    # The unit segment includes the globally unique floor id. A fixed "0000"
    # segment would collide for same-level floors in separate buildings on a parcel.
    generated = generate_ulpin(_extract_base_ulpin(parcel), floor.floor_number, f"{floor.id:04d}")
    valid, expected, found = validate_ulpin(generated)
    if not valid:
        raise HTTPException(status_code=500, detail=f"Generated ULPIN failed checksum validation (expected C{expected}, got C{found}).")
    collision = db.query(ParcelFloor).filter(
        ParcelFloor.floor_ulpin == generated, ParcelFloor.id != floor.id
    ).first()
    if collision:
        raise HTTPException(status_code=409, detail=f"Generated ULPIN collides with floor #{collision.id}.")
    is_reissue = bool(floor.floor_ulpin and force)
    if is_reissue:
        floor.previous_ulpin = floor.floor_ulpin
        floor.reissued_at = datetime.now(timezone.utc).isoformat()
        floor.reissued_by = actor.id
    floor.floor_ulpin = generated
    floor.updated_at = datetime.now(timezone.utc)
    flag_result = evaluate_suspicion("floor", floor, {
        "assigned_ulpin": generated,
        "is_force_reissue": is_reissue,
        "feature": feature,
    }, db)
    return generated, found, is_reissue, flag_result


def _compute_floor_elevations(floor: ParcelFloor, feature: ParcelFeature):
    """Calculates 3D elevation base and top (in meters) relative to ground plane."""
    height = float(floor.height_override_m if getattr(floor, "height_override_m", None) is not None else getattr(feature, "floor_height_m", 3.0) or 3.0)
    base = round(floor.floor_number * height, 2)
    top = round((floor.floor_number + 1) * height, 2)
    return base, top, height


@app.get("/admin/parcels/{parcel_id}/features", response_model=list[FeatureDetailResponseWithFlag])
def get_parcel_features(
    parcel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """
    List all buildings / features belonging to a parcel.
    Includes count of defined floors, AI flag status, and building ULPIN metadata.
    """
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel {parcel_id} not found.")

    features = db.query(ParcelFeature).filter(ParcelFeature.parcel_id == parcel_id).order_by(ParcelFeature.id).all()
    results = []
    for f in features:
        defined_count = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == f.id).count()
        results.append(FeatureDetailResponseWithFlag(
            id=f.id,
            parcel_id=f.parcel_id,
            fid=f.fid,
            ulpin_3d=f.ulpin_3d,
            height=f.height,
            area=f.area,
            floor_level=f.floor_level,
            floor_count=f.floor_count,
            floor_height_m=getattr(f, "floor_height_m", 3.0) or 3.0,
            building_type=f.building_type,
            feature_name=f.feature_name,
            notes=getattr(f, "notes", None),
            defined_floor_count=defined_count,
            building_ulpin=getattr(f, "building_ulpin", None),
            building_ulpin_assigned_at=getattr(f, "building_ulpin_assigned_at", None),
            building_ulpin_reassigned_by=getattr(f, "building_ulpin_reassigned_by", None),
            building_ulpin_history=getattr(f, "building_ulpin_history", None),
            flag_status=getattr(f, "flag_status", "clean"),
            flag_reason=getattr(f, "flag_reason", None),
            flag_score=getattr(f, "flag_score", None),
        ))
    return results


@app.put("/admin/parcels/{parcel_id}/features/{feature_id}", response_model=FeatureDetailResponseWithFlag)
def update_feature_attributes(
    parcel_id: int,
    feature_id: int,
    body: FeatureUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Edit building/feature's basic attributes (name/label, height, notes, floor_height_m). Surveyor only."""
    feature = db.query(ParcelFeature).filter(
        ParcelFeature.id == feature_id,
        ParcelFeature.parcel_id == parcel_id,
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Building / feature not found on this parcel.")

    if body.name is not None:
        feature.feature_name = body.name.strip() or None
    if body.height is not None:
        feature.height = float(body.height)
    if body.notes is not None:
        feature.notes = body.notes
    if body.floor_height_m is not None:
        feature.floor_height_m = float(body.floor_height_m)

    # AI Flagging — run before commit so flag fields are persisted atomically
    defined_count = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == feature.id).count()
    evaluate_suspicion("feature", feature, {"defined_floor_count": defined_count}, db)

    db.commit()
    db.refresh(feature)
    defined_count = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == feature.id).count()
    return FeatureDetailResponseWithFlag(
        id=feature.id,
        parcel_id=feature.parcel_id,
        fid=feature.fid,
        ulpin_3d=feature.ulpin_3d,
        height=feature.height,
        area=feature.area,
        floor_level=feature.floor_level,
        floor_count=feature.floor_count,
        floor_height_m=getattr(feature, "floor_height_m", 3.0) or 3.0,
        building_type=feature.building_type,
        feature_name=feature.feature_name,
        notes=getattr(feature, "notes", None),
        defined_floor_count=defined_count,
        building_ulpin=getattr(feature, "building_ulpin", None),
        building_ulpin_assigned_at=getattr(feature, "building_ulpin_assigned_at", None),
        building_ulpin_reassigned_by=getattr(feature, "building_ulpin_reassigned_by", None),
        building_ulpin_history=getattr(feature, "building_ulpin_history", None),
        flag_status=getattr(feature, "flag_status", "clean"),
        flag_reason=getattr(feature, "flag_reason", None),
        flag_score=getattr(feature, "flag_score", None),
    )


@app.put(
    "/admin/parcels/{parcel_id}/features/{feature_id}/ulpin",
    response_model=BuildingUlpinUpdateResponse,
)
def update_building_ulpin(
    parcel_id: int,
    feature_id: int,
    body: BuildingUlpinUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """
    Surveyor reassigns or manually sets a building's 3D ULPIN.
    Supports auto-generation ({action: 'generate'}) or explicit ULPIN ({ulpin: '...'}).
    Enforces format validation, platform uniqueness, archives old ULPIN in
    building_ulpin_history, and automatically resolves any existing flag to 'resolved_ok'.
    """
    feature = db.query(ParcelFeature).filter(
        ParcelFeature.id == feature_id,
        ParcelFeature.parcel_id == parcel_id,
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Building / feature not found on this parcel.")

    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parent parcel not found.")

    old_ulpin = feature.building_ulpin or feature.ulpin_3d
    target_ulpin = None

    if (body.action or "").lower() == "generate" or not body.ulpin:
        base_ulpin = _extract_base_ulpin(parcel)
        target_ulpin = generate_ulpin(base_ulpin, 0, "BLDG")
    else:
        target_ulpin = body.ulpin.strip().upper()

    # Validate syntax & checksum
    valid, expected, found = validate_ulpin(target_ulpin)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"ULPIN '{target_ulpin}' failed verification: expected checksum C{expected}, got C{found}.",
        )

    # Check uniqueness across parcel_features
    collision = db.query(ParcelFeature).filter(
        or_(ParcelFeature.building_ulpin == target_ulpin, ParcelFeature.ulpin_3d == target_ulpin),
        ParcelFeature.id != feature_id,
    ).first()
    if collision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"ULPIN collision: '{target_ulpin}' is already held by building #{collision.id}.",
        )

    # Archive old ULPIN history
    try:
        history_list = json.loads(feature.building_ulpin_history) if feature.building_ulpin_history else []
        if not isinstance(history_list, list):
            history_list = []
    except Exception:
        history_list = []

    if old_ulpin and old_ulpin != target_ulpin:
        history_list.append({
            "ulpin": old_ulpin,
            "assigned_at": feature.building_ulpin_assigned_at or datetime.now(timezone.utc).isoformat(),
            "reassigned_by": feature.building_ulpin_reassigned_by or current_user.id,
            "reassigned_by_name": current_user.name or current_user.email,
            "notes": body.notes or "Reassigned by surveyor",
        })
        feature.building_ulpin_history = json.dumps(history_list)

    feature.building_ulpin = target_ulpin
    feature.building_ulpin_assigned_at = datetime.now(timezone.utc).isoformat()
    feature.building_ulpin_reassigned_by = current_user.id

    # Auto-resolve flag if it was flagged or under review
    flag_resolved = False
    prev_flag_status = getattr(feature, "flag_status", "clean")
    if prev_flag_status in ("flagged", "under_review"):
        feature.flag_status = "resolved_ok"
        feature.reviewed_by = current_user.id
        feature.reviewed_at = datetime.now(timezone.utc).isoformat()
        feature.review_notes = body.notes or "Automatically resolved via building ULPIN reassignment by surveyor."
        flag_resolved = True

    # Run AI Flagging on feature to verify new ULPIN
    defined_count = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == feature.id).count()
    evaluate_suspicion("feature", feature, {
        "assigned_ulpin": target_ulpin,
        "defined_floor_count": defined_count,
    }, db)

    db.commit()
    db.refresh(feature)

    return BuildingUlpinUpdateResponse(
        id=feature.id,
        ulpin_3d=target_ulpin,
        status="assigned",
        message=f"Building ULPIN updated to '{target_ulpin}'.",
        previous_ulpin=old_ulpin if old_ulpin != target_ulpin else None,
        flag_resolved=flag_resolved,
        flag_status=getattr(feature, "flag_status", "clean"),
    )



@app.post("/admin/parcels/{parcel_id}/features/{feature_id}/floors/generate", response_model=list[FloorResponseWithFlag])
def generate_building_floors(
    parcel_id: int,
    feature_id: int,
    body: FloorGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """
    Auto-generates floor rows for that building:
    floor numbers 1 through floor_count (plus -1 through -basement_count for basements),
    each with default floor_label ("Floor 1", "Floor 2", ... "Basement 1", etc.)
    and NO ulpin assigned yet. Surveyor only.
    """
    feature = db.query(ParcelFeature).filter(
        ParcelFeature.id == feature_id,
        ParcelFeature.parcel_id == parcel_id,
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Building not found.")

    existing_numbers = {
        row[0] for row in db.query(ParcelFloor.floor_number)
        .filter(ParcelFloor.parcel_feature_id == feature_id).all()
    }

    total_new = body.floor_count + body.basement_count
    new_total = len(existing_numbers) + total_new

    # Basements: -1 down to -basement_count
    for b in range(1, body.basement_count + 1):
        num = -b
        if num not in existing_numbers:
            label = f"Basement {b}"
            fl = ParcelFloor(
                parcel_feature_id=feature_id,
                floor_number=num,
                floor_ulpin=None,
                floor_label=label,
                flag_status="clean",
            )
            # AI Flagging R2 — floor count vs height anomaly
            evaluate_suspicion("floor", fl, {
                "feature": feature,
                "defined_floor_count": new_total,
            }, db)
            db.add(fl)

    # Above ground: 1 through floor_count
    for f in range(1, body.floor_count + 1):
        if f not in existing_numbers:
            label = f"Floor {f}"
            fl = ParcelFloor(
                parcel_feature_id=feature_id,
                floor_number=f,
                floor_ulpin=None,
                floor_label=label,
                flag_status="clean",
            )
            evaluate_suspicion("floor", fl, {
                "feature": feature,
                "defined_floor_count": new_total,
            }, db)
            db.add(fl)

    db.commit()

    total_defined = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == feature_id).count()
    if total_defined > feature.floor_count:
        feature.floor_count = total_defined
        db.commit()

    return _list_building_floors_with_flags(parcel_id, feature_id, db, current_user)


def _list_building_floors_with_flags(parcel_id: int, feature_id: int, db: Session, current_user: User):
    feature = db.query(ParcelFeature).filter(
        ParcelFeature.id == feature_id,
        ParcelFeature.parcel_id == parcel_id,
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Building not found.")

    floors = db.query(ParcelFloor).filter(
        ParcelFloor.parcel_feature_id == feature_id
    ).order_by(ParcelFloor.floor_number.asc()).all()

    result = []
    for floor in floors:
        base_m, top_m, height_m = _compute_floor_elevations(floor, feature)
        flats = db.query(ParcelFlat).filter(
            ParcelFlat.floor_id == floor.id
        ).order_by(ParcelFlat.unit_number.asc()).all()

        flat_responses = [
            FlatResponseWithFlag(
                id=flat.id,
                floor_id=flat.floor_id,
                unit_number=flat.unit_number,
                unit_ulpin=flat.unit_ulpin,
                unit_type=flat.unit_type,
                area_sqm=flat.area_sqm,
                owner_name=flat.owner_name,
                created_at=flat.created_at,
                updated_at=flat.updated_at,
                flag_status=getattr(flat, "flag_status", "clean"),
                flag_reason=getattr(flat, "flag_reason", None),
                flag_score=getattr(flat, "flag_score", None),
            )
            for flat in flats
        ]

        result.append(FloorResponseWithFlag(
            id=floor.id,
            parcel_feature_id=floor.parcel_feature_id,
            floor_number=floor.floor_number,
            floor_ulpin=floor.floor_ulpin,
            floor_label=floor.floor_label,
            elevation_base_m=base_m,
            elevation_top_m=top_m,
            height_m=height_m,
            created_at=floor.created_at,
            updated_at=floor.updated_at,
            flat_count=len(flat_responses),
            flats=flat_responses,
            flag_status=getattr(floor, "flag_status", "clean"),
            flag_reason=getattr(floor, "flag_reason", None),
            flag_score=getattr(floor, "flag_score", None),
        ))
    return result


@app.get(
    "/admin/parcels/{parcel_id}/features/{feature_id}/floors",
    response_model=list[FloorResponseWithFlag],
)
def list_building_floors(
    parcel_id: int,
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Returns all floors and their flats with AI flag fields and elevations. Surveyor only."""
    return _list_building_floors_with_flags(parcel_id, feature_id, db, current_user)


@app.post(
    "/admin/parcels/{parcel_id}/features/{feature_id}/floors/assign-ulpin-bulk",
    response_model=FloorBulkAssignResponse,
)
def bulk_assign_floor_ulpins(
    parcel_id: int,
    feature_id: int,
    body: FloorBulkAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """
    Surveyor-exclusive bulk assignment of 3D ULPINs for all floors in a building.
    Iterates ascending by floor_number.
    - If floor already has ULPIN and force=false: skips and logs to skipped array.
    - If force=true: reissues, archiving previous ULPIN and evaluating rapid-reissue anomaly.
    - Validates syntax and checksum; checks platform uniqueness.
    - Evaluates AI suspicion rule per floor.
    """
    feature = db.query(ParcelFeature).filter(
        ParcelFeature.id == feature_id,
        ParcelFeature.parcel_id == parcel_id,
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Building / feature not found on this parcel.")

    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parent parcel not found.")

    floors = db.query(ParcelFloor).filter(
        ParcelFloor.parcel_feature_id == feature_id
    ).order_by(ParcelFloor.floor_number.asc()).all()

    assigned = []
    skipped = []
    failed = []

    for floor in floors:
        if floor.floor_ulpin and not body.force:
            skipped.append({
                "id": floor.id,
                "floor_number": floor.floor_number,
                "floor_label": floor.floor_label,
                "reason": f"Already assigned: {floor.floor_ulpin}",
                "floor_ulpin": floor.floor_ulpin,
            })
            continue

        try:
            generated, _, _, _ = _assign_floor_ulpin(
                floor, feature, parcel, db, current_user, force=body.force
            )
        except HTTPException as exc:
            failed.append({
                "id": floor.id,
                "floor_number": floor.floor_number,
                "floor_label": floor.floor_label,
                "error": str(exc.detail),
            })
            continue

        assigned.append({
            "id": floor.id,
            "floor_number": floor.floor_number,
            "floor_label": floor.floor_label,
            "floor_ulpin": generated,
            "flag_status": getattr(floor, "flag_status", "clean"),
        })

    db.commit()

    return FloorBulkAssignResponse(
        feature_id=feature_id,
        total_floors=len(floors),
        assigned_count=len(assigned),
        skipped_count=len(skipped),
        failed_count=len(failed),
        assigned=assigned,
        skipped=skipped,
        failed=failed,
    )


@app.get("/citizen/search", response_model=list[CitizenSearchResult])
def citizen_search(q_param: str = Query(..., alias="q", min_length=1), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    term = q_param.strip().lower()
    results = []
    for loc in db.query(Location).all():
        if any(term in (s or "").lower() for s in [loc.name, loc.ulpin_3d, loc.classification, loc.zone]):
            is_mine = False
            for lp in db.query(Parcel).filter(Parcel.ulpin_3d == loc.ulpin_3d).all():
                if db.query(ParcelOwnership).filter(ParcelOwnership.parcel_id == lp.id, ParcelOwnership.user_id == current_user.id).first():
                    is_mine = True
                    break
            results.append(CitizenSearchResult(
                id=loc.id, name=loc.name, state=loc.state, lat=loc.lat, lon=loc.lon,
                ulpin_3d=loc.ulpin_3d, classification=loc.classification, area=loc.area,
                elevation=loc.elevation, feature_count=loc.feature_count, is_mine=is_mine,
                parcel_ulpin=(db.query(Parcel).filter(Parcel.ulpin_3d == loc.ulpin_3d).first().ulpin_3d
                    if db.query(Parcel).filter(Parcel.ulpin_3d == loc.ulpin_3d).first()
                    else (db.query(Parcel).filter(Parcel.name.ilike("%Knowledge Park 2%" )).first().ulpin_3d
                        if loc.id == "knowledge-park-2" and db.query(Parcel).filter(Parcel.name.ilike("%Knowledge Park 2%" )).first()
                        else None)),
            ))
    return results


@app.post("/admin/kp2/generate-floors-and-assign")
def generate_kp2_floors_and_assign(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Materialize 3 m floor records from the existing KP2 footprint inventory."""
    parcel = db.query(Parcel).filter(Parcel.name.ilike("%Knowledge Park 2%")).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Knowledge Park 2 parcel inventory is not seeded.")

    features = db.query(ParcelFeature).filter(ParcelFeature.parcel_id == parcel.id).order_by(ParcelFeature.id).all()
    created = assigned = 0
    try:
        for feature in features:
            desired_count = max(1, int(feature.floor_count or 1))
            existing = {floor.floor_number: floor for floor in db.query(ParcelFloor).filter(
                ParcelFloor.parcel_feature_id == feature.id
            ).all()}
            for floor_number in range(desired_count):
                floor = existing.get(floor_number)
                if floor is None:
                    floor = ParcelFloor(
                        parcel_feature_id=feature.id,
                        floor_number=floor_number,
                        floor_ulpin=None,
                        floor_label="Ground Floor" if floor_number == 0 else f"Floor {floor_number}",
                        flag_status="clean",
                    )
                    db.add(floor)
                    db.flush()
                    evaluate_suspicion("floor", floor, {"feature": feature, "defined_floor_count": desired_count}, db)
                    created += 1
                if not floor.floor_ulpin:
                    _assign_floor_ulpin(floor, feature, parcel, db, current_user)
                    assigned += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"parcel_id": parcel.id, "feature_count": len(features), "floors_created": created, "ulpins_assigned": assigned}


@app.get("/citizen/parcels/{ulpin_id}/buildings", response_model=list[CitizenBuildingResponse])
def citizen_get_buildings(ulpin_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    parcel = db.query(Parcel).filter(Parcel.ulpin_3d == ulpin_id).first()
    if not parcel:
        if not db.query(Location).filter(Location.ulpin_3d == ulpin_id).first():
            raise HTTPException(status_code=404, detail="Parcel ULPIN not found.")
        return []
    features = db.query(ParcelFeature).filter(ParcelFeature.parcel_id == parcel.id).order_by(ParcelFeature.id.asc()).all()
    return [CitizenBuildingResponse(
        id=f.id, parcel_id=f.parcel_id, fid=f.fid, ulpin_3d=f.building_ulpin or f.ulpin_3d,
        geometry=json.loads(f.geometry_json),
        height=f.height, area=f.area, floor_count=f.floor_count,
        building_type=f.building_type, feature_name=f.feature_name,
        flag_status=getattr(f, "flag_status", "clean"),
        flag_reason="Under surveyor review" if getattr(f, "flag_status", "clean") in ("flagged", "under_review") else None,
    ) for f in features]


@app.get("/citizen/parcels/{ulpin_id}/features/{feature_id}/floors", response_model=list[CitizenFloorResponse])
def citizen_get_floors(ulpin_id: str, feature_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    parcel = db.query(Parcel).filter(Parcel.ulpin_3d == ulpin_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found.")
    feature = db.query(ParcelFeature).filter(ParcelFeature.id == feature_id, ParcelFeature.parcel_id == parcel.id).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Building not found.")
    floors = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == feature.id).order_by(ParcelFloor.floor_number.asc()).all()
    uname = (current_user.name or "").lower().strip()
    result = []
    for floor in floors:
        base_m, top_m, height_m = _compute_floor_elevations(floor, feature)
        flats = db.query(ParcelFlat).filter(ParcelFlat.floor_id == floor.id).order_by(ParcelFlat.unit_number.asc()).all()
        cf = []
        for flat in flats:
            own_lc = (flat.owner_name or "").lower().strip()
            redacted = flat.owner_name if (uname and own_lc == uname) else None
            cf.append(CitizenFlatResponse(
                id=flat.id, floor_id=flat.floor_id, unit_number=flat.unit_number,
                unit_ulpin=flat.unit_ulpin, unit_type=flat.unit_type, area_sqm=flat.area_sqm,
                owner_name=redacted, flag_status=getattr(flat, "flag_status", "clean"), flag_reason=None,
            ))
        result.append(CitizenFloorResponse(
            id=floor.id, parcel_feature_id=floor.parcel_feature_id,
            floor_number=floor.floor_number, floor_ulpin=floor.floor_ulpin,
            floor_label=floor.floor_label,
            elevation_base_m=base_m,
            elevation_top_m=top_m,
            height_m=height_m,
            flat_count=len(cf), flats=cf,
            flag_status=getattr(floor, "flag_status", "clean"), flag_reason=None,
        ))
    return result



@app.get("/admin/floors/{floor_id}/ulpin-history", response_model=ULPINReissueHistoryResponse)
def get_floor_ulpin_history(floor_id: int, db: Session = Depends(get_db), current_user: User = Depends(_require_surveyor)):
    floor = db.query(ParcelFloor).filter(ParcelFloor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found.")
    return ULPINReissueHistoryResponse(
        floor_id=floor.id, current_ulpin=floor.floor_ulpin,
        previous_ulpin=getattr(floor, "previous_ulpin", None),
        reissued_at=getattr(floor, "reissued_at", None),
        reissued_by=getattr(floor, "reissued_by", None),
        has_reissue_history=bool(getattr(floor, "previous_ulpin", None)),
    )


@app.get("/admin/flags", response_model=list[FlaggedItemResponse])
def get_flagged_items(
    status_filter: str = Query("flagged", alias="status"),
    entity_type: str = Query("all"),
    page: int = Query(1, ge=1), size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user: User = Depends(_require_surveyor),
):
    results = []
    offset = (page - 1) * size
    def sq2(q2, model):
        return q2.filter(model.flag_status != "clean") if status_filter == "all" else q2.filter(model.flag_status == status_filter)
    if entity_type in ("feature", "all"):
        for feat in sq2(db.query(ParcelFeature), ParcelFeature).all():
            results.append(FlaggedItemResponse(
                entity_type="feature", entity_id=feat.id,
                entity_label="Building: " + (feat.feature_name or feat.ulpin_3d[:20]),
                parcel_id=feat.parcel_id, flag_status=feat.flag_status or "clean",
                flag_reason=feat.flag_reason, flag_score=feat.flag_score,
                flagged_at=feat.flagged_at, reviewed_by=feat.reviewed_by,
                reviewed_at=feat.reviewed_at, review_notes=feat.review_notes,
            ))
    if entity_type in ("floor", "all"):
        for floor in sq2(db.query(ParcelFloor), ParcelFloor).all():
            results.append(FlaggedItemResponse(
                entity_type="floor", entity_id=floor.id, entity_label=floor.floor_label,
                parcel_id=None, flag_status=floor.flag_status or "clean",
                flag_reason=floor.flag_reason, flag_score=floor.flag_score,
                flagged_at=floor.flagged_at, reviewed_by=floor.reviewed_by,
                reviewed_at=floor.reviewed_at, review_notes=floor.review_notes,
            ))
    if entity_type in ("flat", "all"):
        for flat in sq2(db.query(ParcelFlat), ParcelFlat).all():
            results.append(FlaggedItemResponse(
                entity_type="flat", entity_id=flat.id,
                entity_label="Unit " + flat.unit_number,
                parcel_id=None, flag_status=flat.flag_status or "clean",
                flag_reason=flat.flag_reason, flag_score=flat.flag_score,
                flagged_at=flat.flagged_at, reviewed_by=flat.reviewed_by,
                reviewed_at=flat.reviewed_at, review_notes=flat.review_notes,
            ))
    results.sort(key=lambda x: (x.flagged_at or ""), reverse=True)
    return results[offset:offset + size]


@app.post("/admin/flags/{entity_type}/{entity_id}/resolve", response_model=MessageResponse)
def resolve_flag(entity_type: str, entity_id: int, body: FlagResolveRequest, db: Session = Depends(get_db), current_user: User = Depends(_require_surveyor)):
    mm = {"feature": ParcelFeature, "floor": ParcelFloor, "flat": ParcelFlat}
    if entity_type not in mm:
        raise HTTPException(status_code=400, detail="entity_type must be feature|floor|flat")
    entity = db.query(mm[entity_type]).filter(mm[entity_type].id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail=entity_type.title() + " not found.")
    if getattr(entity, "flag_status", "clean") == "clean":
        raise HTTPException(status_code=400, detail="Entity is not flagged.")
    ns = "resolved_ok" if body.decision == "ok" else "resolved_rejected"
    entity.flag_status = ns
    entity.reviewed_by = current_user.id
    entity.reviewed_at = datetime.now(timezone.utc).isoformat()
    entity.review_notes = body.notes
    db.commit()
    return MessageResponse(detail=entity_type.title() + " resolved as " + ns + " by " + current_user.name + ".")



@app.post("/admin/parcels/{parcel_id}/features/{feature_id}/floors", response_model=FloorResponseWithFlag)
def create_single_floor(
    parcel_id: int,
    feature_id: int,
    body: FloorCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Surveyor manual single-floor creation. Surveyor only."""
    feature = db.query(ParcelFeature).filter(
        ParcelFeature.id == feature_id,
        ParcelFeature.parcel_id == parcel_id,
    ).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Building not found.")

    existing = db.query(ParcelFloor).filter(
        ParcelFloor.parcel_feature_id == feature_id,
        ParcelFloor.floor_number == body.floor_number,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Floor {body.floor_number} already exists in this building.")

    if body.floor_label and body.floor_label.strip():
        label = body.floor_label.strip()
    elif body.floor_number < 0:
        label = f"Basement {abs(body.floor_number)}"
    elif body.floor_number == 0:
        label = "Ground Floor"
    else:
        label = f"Floor {body.floor_number}"

    total_defined = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == feature_id).count() + 1

    fl = ParcelFloor(
        parcel_feature_id=feature_id,
        floor_number=body.floor_number,
        floor_ulpin=None,
        floor_label=label,
        flag_status="clean",
    )
    # AI Flagging — R2 floor count anomaly
    evaluate_suspicion("floor", fl, {
        "feature": feature,
        "defined_floor_count": total_defined,
    }, db)
    db.add(fl)
    db.commit()
    db.refresh(fl)

    if total_defined > feature.floor_count:
        feature.floor_count = total_defined
        db.commit()

    return FloorResponseWithFlag(
        id=fl.id,
        parcel_feature_id=fl.parcel_feature_id,
        floor_number=fl.floor_number,
        floor_ulpin=fl.floor_ulpin,
        floor_label=fl.floor_label,
        created_at=fl.created_at,
        updated_at=fl.updated_at,
        flats=[],
        flat_count=0,
        flag_status=getattr(fl, "flag_status", "clean"),
        flag_reason=getattr(fl, "flag_reason", None),
        flag_score=getattr(fl, "flag_score", None),
    )


@app.put("/admin/floors/{floor_id}", response_model=FloorResponseWithFlag)
def update_floor(
    floor_id: int,
    body: FloorUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Edit a floor's label/floor_number manually. Surveyor only."""
    floor = db.query(ParcelFloor).filter(ParcelFloor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found.")

    if body.floor_number is not None:
        conflict = db.query(ParcelFloor).filter(
            ParcelFloor.parcel_feature_id == floor.parcel_feature_id,
            ParcelFloor.floor_number == body.floor_number,
            ParcelFloor.id != floor.id,
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Floor {body.floor_number} already exists in this building.")
        floor.floor_number = body.floor_number

    if body.floor_label is not None and body.floor_label.strip():
        floor.floor_label = body.floor_label.strip()

    floor.updated_at = datetime.now(timezone.utc)

    # AI Flagging before commit
    feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first()
    total_defined = db.query(ParcelFloor).filter(ParcelFloor.parcel_feature_id == floor.parcel_feature_id).count()
    evaluate_suspicion("floor", floor, {
        "feature": feature,
        "defined_floor_count": total_defined,
    }, db)

    db.commit()
    db.refresh(floor)

    flats = db.query(ParcelFlat).filter(ParcelFlat.floor_id == floor.id).order_by(ParcelFlat.unit_number.asc()).all()
    flat_schemas = [FlatResponseWithFlag.model_validate(flat) for flat in flats]
    return FloorResponseWithFlag(
        id=floor.id,
        parcel_feature_id=floor.parcel_feature_id,
        floor_number=floor.floor_number,
        floor_ulpin=floor.floor_ulpin,
        floor_label=floor.floor_label,
        created_at=floor.created_at,
        updated_at=floor.updated_at,
        flats=flat_schemas,
        flat_count=len(flat_schemas),
        flag_status=getattr(floor, "flag_status", "clean"),
        flag_reason=getattr(floor, "flag_reason", None),
        flag_score=getattr(floor, "flag_score", None),
    )


@app.delete("/admin/floors/{floor_id}", response_model=MessageResponse)
def delete_floor(
    floor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Remove a floor (and cascade-delete its flats). Surveyor only."""
    floor = db.query(ParcelFloor).filter(ParcelFloor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found.")

    db.delete(floor)
    db.commit()
    return MessageResponse(detail=f"Floor {floor_id} and all its units were deleted.")


@app.post("/admin/floors/{floor_id}/flats/generate", response_model=list[FlatResponseWithFlag])
def generate_flats(
    floor_id: int,
    body: FlatGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """
    Auto-generates flat rows for that floor:
    unit_number values combining floor number + sequence (e.g. floor 7 + flat 4 = "704"),
    each with NO ulpin assigned yet. Surveyor only.
    """
    floor = db.query(ParcelFloor).filter(ParcelFloor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found.")

    feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first()
    parcel_id = feature.parcel_id if feature else None

    existing_units = {
        row[0] for row in db.query(ParcelFlat.unit_number)
        .filter(ParcelFlat.floor_id == floor_id).all()
    }

    fl_num = floor.floor_number
    for i in range(body.flat_count):
        seq = body.starting_unit_number + i
        if fl_num > 0:
            unit_num = f"{fl_num}{seq:02d}"
        elif fl_num == 0:
            unit_num = f"G{seq:02d}"
        else:
            unit_num = f"B{abs(fl_num)}{seq:02d}"

        if unit_num not in existing_units:
            flat = ParcelFlat(
                floor_id=floor.id,
                unit_number=unit_num,
                unit_ulpin=None,
                unit_type="Residential",
                area_sqm=75.0,
                owner_name=None,
                flag_status="clean",
            )
            # AI Flagging — R6 unit number pattern check
            evaluate_suspicion("flat", flat, {
                "unit_number": unit_num,
                "parcel_id": parcel_id,
            }, db)
            db.add(flat)

    db.commit()
    flats = db.query(ParcelFlat).filter(ParcelFlat.floor_id == floor.id).order_by(ParcelFlat.unit_number.asc()).all()
    return [FlatResponseWithFlag.model_validate(f) for f in flats]


@app.post("/admin/floors/{floor_id}/flats", response_model=FlatResponseWithFlag)
def create_single_flat(
    floor_id: int,
    body: FlatCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Surveyor manual single-flat creation. Surveyor only."""
    floor = db.query(ParcelFloor).filter(ParcelFloor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found.")

    feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first()
    parcel_id = feature.parcel_id if feature else None

    unit_clean = body.unit_number.strip()
    existing = db.query(ParcelFlat).filter(
        ParcelFlat.floor_id == floor_id,
        ParcelFlat.unit_number == unit_clean,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Unit '{unit_clean}' already exists on this floor.")

    flat = ParcelFlat(
        floor_id=floor.id,
        unit_number=unit_clean,
        unit_ulpin=None,
        unit_type=body.unit_type or "Residential",
        area_sqm=body.area_sqm,
        owner_name=body.owner_name.strip() if body.owner_name else None,
        flag_status="clean",
    )
    # AI Flagging — R4 ownership, R6 unit pattern
    owner_ctx = {"unit_number": unit_clean, "parcel_id": parcel_id}
    if body.owner_name:
        owner_ctx["new_owner_name"] = body.owner_name.strip()
    evaluate_suspicion("flat", flat, owner_ctx, db)
    db.add(flat)
    db.commit()
    db.refresh(flat)
    return FlatResponseWithFlag.model_validate(flat)


@app.put("/admin/flats/{flat_id}", response_model=FlatResponseWithFlag)
def update_flat(
    flat_id: int,
    body: FlatUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Edit a flat's unit_number, unit_type, area_sqm, owner_name manually. Surveyor only."""
    flat = db.query(ParcelFlat).filter(ParcelFlat.id == flat_id).first()
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found.")

    floor = db.query(ParcelFloor).filter(ParcelFloor.id == flat.floor_id).first()
    feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first() if floor else None
    parcel_id = feature.parcel_id if feature else None

    if body.unit_number is not None and body.unit_number.strip():
        unit_clean = body.unit_number.strip()
        conflict = db.query(ParcelFlat).filter(
            ParcelFlat.floor_id == flat.floor_id,
            ParcelFlat.unit_number == unit_clean,
            ParcelFlat.id != flat.id,
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Unit '{unit_clean}' already exists on this floor.")
        flat.unit_number = unit_clean

    if body.unit_type is not None:
        flat.unit_type = body.unit_type
    if body.area_sqm is not None:
        flat.area_sqm = body.area_sqm
    if body.owner_name is not None:
        flat.owner_name = body.owner_name.strip() or None

    flat.updated_at = datetime.now(timezone.utc)

    # AI Flagging — R4 ownership, R6 unit pattern
    flag_ctx = {"unit_number": flat.unit_number, "parcel_id": parcel_id}
    if body.owner_name:
        flag_ctx["new_owner_name"] = body.owner_name.strip()
    evaluate_suspicion("flat", flat, flag_ctx, db)

    db.commit()
    db.refresh(flat)
    return FlatResponseWithFlag.model_validate(flat)


@app.delete("/admin/flats/{flat_id}", response_model=MessageResponse)
def delete_flat(
    flat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """Remove a flat. Surveyor only."""
    flat = db.query(ParcelFlat).filter(ParcelFlat.id == flat_id).first()
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found.")

    db.delete(flat)
    db.commit()
    return MessageResponse(detail=f"Unit {flat_id} deleted.")


@app.post("/admin/floors/{floor_id}/assign-ulpin", response_model=AssignUlpinResponse)
def assign_floor_ulpin(
    floor_id: int,
    force: bool = Query(False, description="Set true to force-reissue an already-assigned ULPIN (surveyor only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """
    Generates and saves a real 3D ULPIN for this floor using generate_ulpin()
    from Layer 5. Surveyor-exclusive (returns 403 for citizen tokens).

    Idempotency: if floor_ulpin is already set, returns 409 Conflict unless
    force=true is passed by the surveyor — in which case the old ULPIN is
    archived in previous_ulpin/reissued_at/reissued_by before overwriting.

    Platform-wide uniqueness: checks that no other floor already holds the
    generated ULPIN before saving (returns 409 on collision).
    """
    floor = db.query(ParcelFloor).filter(ParcelFloor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found.")

    feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Parent building not found.")

    parcel = db.query(Parcel).filter(Parcel.id == feature.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parent parcel not found.")

    generated, found, is_force_reissue, flag_result = _assign_floor_ulpin(
        floor, feature, parcel, db, current_user, force=force
    )

    db.commit()

    msg = f"Floor ULPIN '{generated}' successfully assigned with valid checksum (C{found})."
    if is_force_reissue:
        msg += f" Previous ULPIN '{floor.previous_ulpin}' archived."

    return AssignUlpinResponse(
        id=floor.id,
        ulpin_3d=generated,
        status="assigned",
        message=msg,
        flag_status=getattr(floor, "flag_status", "clean") if flag_result.fired else "clean",
        flag_reason=getattr(floor, "flag_reason", None) if flag_result.fired else None,
        flag_score=getattr(floor, "flag_score", None) if flag_result.fired else None,
    )


@app.post("/admin/flats/{flat_id}/assign-ulpin", response_model=AssignUlpinResponse)
def assign_flat_ulpin(
    flat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_surveyor),
):
    """
    Generates and saves a real 3D ULPIN for this flat using generate_ulpin() with
    vertical_level = its parent floor's floor_number and unit_code = its unit_number.
    Surveyor-exclusive (returns 403 for citizen tokens).

    Overlap check: calls check_spatial_overlap() from the ULPIN engine (R1 rule) to
    verify the building footprint doesn't conflict with a different parcel's feature.
    Also runs the exact-string duplicate check within the same building.
    Platform-wide global uniqueness check across all flats.
    """
    flat = db.query(ParcelFlat).filter(ParcelFlat.id == flat_id).first()
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found.")

    floor = db.query(ParcelFloor).filter(ParcelFloor.id == flat.floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Parent floor not found.")

    feature = db.query(ParcelFeature).filter(ParcelFeature.id == floor.parcel_feature_id).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Parent building not found.")

    parcel = db.query(Parcel).filter(Parcel.id == feature.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parent parcel not found.")

    # Spatial overlap check (R1 — wired in from live route per Feature B spec)
    try:
        from services.ulpin_generator import check_spatial_overlap
        geom_dict = json.loads(feature.geometry_json)
        overlapping = check_spatial_overlap(geom_dict, db)
        others = [u for u in overlapping if u != feature.ulpin_3d]
        if others:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Spatial overlap detected: Building #{feature.fid or feature.id} footprint "
                    f"intersects {len(others)} existing feature(s): {', '.join(others[:3])}. "
                    "Resolve geometry conflict before assigning ULPIN."
                ),
            )
    except HTTPException:
        raise
    except Exception:
        pass  # Shapely not installed — skip gracefully

    # Clean unit code to alphanumeric (max 6 chars)
    clean_unit = re.sub(r"[^A-Za-z0-9]", "", flat.unit_number).upper()
    if not clean_unit:
        clean_unit = f"{flat.id:04d}"
    clean_unit = clean_unit[:6]

    base_ulpin = _extract_base_ulpin(parcel)
    generated_code = generate_ulpin(base_ulpin, floor.floor_number, clean_unit)

    # Exact-string duplicate check within the same building
    sibling_floor_ids = [
        sf.id for sf in db.query(ParcelFloor.id)
        .filter(ParcelFloor.parcel_feature_id == feature.id).all()
    ]
    conflicting_flat = (
        db.query(ParcelFlat)
        .filter(
            ParcelFlat.floor_id.in_(sibling_floor_ids),
            ParcelFlat.id != flat.id,
            ParcelFlat.unit_ulpin == generated_code,
        )
        .first()
    )
    if conflicting_flat:
        raise HTTPException(
            status_code=400,
            detail=(
                f"ULPIN Duplicate Collision: Building #{feature.fid or feature.id} already has ULPIN "
                f"'{generated_code}' at V{floor.floor_number} for unit '{conflicting_flat.unit_number}'. "
                "A unit cannot duplicate an existing 3D strata parcel within the same building."
            ),
        )

    # Feature B — Platform-wide global uniqueness check
    global_collision = db.query(ParcelFlat).filter(
        ParcelFlat.unit_ulpin == generated_code,
        ParcelFlat.id != flat.id,
    ).first()
    if global_collision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Global ULPIN Collision: '{generated_code}' is already assigned globally "
                f"to flat #{global_collision.id}. This indicates a data integrity issue."
            ),
        )

    valid, expected, found = validate_ulpin(generated_code)
    if not valid:
        raise HTTPException(status_code=500, detail="Generated ULPIN failed internal checksum verification.")

    flat.unit_ulpin = generated_code
    flat.updated_at = datetime.now(timezone.utc)

    # AI Flagging — R3 checksum, R4 ownership, R6 unit pattern
    flag_result = evaluate_suspicion("flat", flat, {
        "assigned_ulpin": generated_code,
        "unit_number": flat.unit_number,
        "parcel_id": parcel.id,
    }, db)

    db.commit()

    return AssignUlpinResponse(
        id=flat.id,
        ulpin_3d=generated_code,
        status="assigned",
        message=f"Flat ULPIN '{generated_code}' assigned with verified checksum (C{found}).",
        flag_status=getattr(flat, "flag_status", "clean") if flag_result.fired else "clean",
        flag_reason=getattr(flat, "flag_reason", None) if flag_result.fired else None,
        flag_score=getattr(flat, "flag_score", None) if flag_result.fired else None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Layer 6 — Stub Integration Endpoints
# (MOCK — clearly labeled, not real government API connections)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/integrations/digilocker/{ulpin_id}", response_model=DigiLockerStub)
def digilocker_stub(ulpin_id: str):
    """
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║  STUB — NOT A REAL DIGILOCKER INTEGRATION                               ║
    ║                                                                          ║
    ║  Returns mock: true. This endpoint demonstrates the INTENT of Layer 6's  ║
    ║  DigiLocker integration point for pitch/demo purposes.                   ║
    ║                                                                          ║
    ║  A real integration would require:                                       ║
    ║    - MeitY DigiLocker Partner API credentials (government partnership)   ║
    ║    - Citizen OTP consent flow (Aadhaar-linked)                           ║
    ║    - Bilateral data sharing agreement with DILRMP                        ║
    ║                                                                          ║
    ║  None of these are available at hackathon stage.                         ║
    ╚══════════════════════════════════════════════════════════════════════════╝
    """
    return DigiLockerStub(
        mock=True,
        ulpin_id=ulpin_id,
        linked_documents=[
            {
                "doc_type": "Sale Deed",
                "doc_ref": "REGSTRY/UP/GBN/2019/00112345",
                "issued_by": "Sub-Registrar Office, Gautam Buddha Nagar",
                "verified": False,
                "note": "MOCK — not a real document",
            },
            {
                "doc_type": "Building Sanction Plan",
                "doc_ref": "GNIDA/BSP/KP2/2017/00098",
                "issued_by": "Greater Noida Industrial Development Authority",
                "verified": False,
                "note": "MOCK — not a real document",
            },
        ],
        status="mock_linked",
        note=(
            "STUB RESPONSE — mock: true. Real DigiLocker integration requires "
            "MeitY Partner API credentials and citizen OTP consent. "
            "See SIH26011 solution document Section 6 for production integration spec."
        ),
    )


@app.get("/integrations/bank-kyc/{ulpin_id}", response_model=BankKYCStub)
def bank_kyc_stub(ulpin_id: str):
    """
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║  STUB — NOT A REAL BANK KYC INTEGRATION                                  ║
    ║                                                                          ║
    ║  Returns mock: true. Demonstrates Layer 6's loan-eligibility integration  ║
    ║  intent for pitch/demo purposes.                                          ║
    ║                                                                          ║
    ║  A real integration would require:                                        ║
    ║    - Bilateral API agreement with participating lenders (SBI, HDFC, etc.) ║
    ║    - RBI-compliant KYC data handling                                      ║
    ║    - Property valuation certified API (govt-approved valuers)             ║
    ╚══════════════════════════════════════════════════════════════════════════╝
    """
    return BankKYCStub(
        mock=True,
        ulpin_id=ulpin_id,
        loan_eligibility="eligible",
        estimated_property_value_inr=45_000_000,
        ltv_ratio_percent=75.0,
        status="mock_approved",
        note=(
            "STUB RESPONSE — mock: true. Real bank KYC integration requires bilateral "
            "API agreements with lenders and RBI-compliant property valuation. "
            "See SIH26011 solution document Section 6 for production integration spec."
        ),
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
