"""
backend/scripts/seed_demo_users.py
====================================
Idempotent seed script that creates exactly two fixed demo accounts
for the SIH2026 hackathon demo.

IMPORTANT: These are demo-only credentials for live pitch/evaluation purposes.
Do NOT use these in any production or staging deployment.

Usage:
    cd Faltu-main/backend
    python scripts/seed_demo_users.py

Credentials seeded:
  Role      Email                                 Password
  --------  ------------------------------------  ---------------
  Surveyor  surveyor.demo@bhustack3d.local    Surveyor@2026
  Citizen   citizen.demo@bhustack3d.local     Citizen@2026
  Admin     admin.demo@bhustack3d.local       Admin@2026

Both accounts use the same bcrypt hashing as normal /auth/login,
so they work transparently through POST /auth/login.
"""

import sys
import os

# Ensure backend/ is on the path so we can import its modules
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _backend_dir)

from database import engine, Base, get_db
from models import User, Role
from auth import hash_password

# Ensure all tables exist
Base.metadata.create_all(bind=engine)


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
    {
        "name": "Demo Admin",
        "email": "admin.demo@bhustack3d.local",
        "password": "Admin@2026",
        "role": Role.ADMIN.value,
    },
]


def seed_demo_users():
    db = next(get_db())
    try:
        created = []
        skipped = []
        for acc in DEMO_ACCOUNTS:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if existing:
                skipped.append(acc["email"])
                continue
            user = User(
                name=acc["name"],
                email=acc["email"],
                hashed_password=hash_password(acc["password"]),
                role=acc["role"],
            )
            db.add(user)
            created.append(acc["email"])
        db.commit()

        print("\n=== Demo Account Seed Results ===")
        for email in created:
            print(f"  [CREATED] {email}")
        for email in skipped:
            print(f"  [SKIP]    {email} (already exists)")
        print(f"\nTotal: {len(created)} created, {len(skipped)} skipped.")
        print("\nBoth accounts are now available via POST /auth/login.")
        print("See DEMO_CREDENTIALS.md at the repo root for credentials.\n")

    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Seed failed: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_users()
