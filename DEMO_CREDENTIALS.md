# DEMO_CREDENTIALS.md
# Bhustack3D — SIH2026 Demo Accounts

> ⚠️ **DEMO ONLY** — These accounts are for hackathon/evaluation purposes exclusively.
> Do NOT use these credentials in any production or staging environment.

## Demo Login Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| **Surveyor** | `surveyor.demo@bhustack3d.local` | `Surveyor@2026` | Full management: bulk ULPIN assign, building ULPIN edit/reassign, flag review queue, all create/edit/delete operations |
| **Citizen** | `citizen.demo@bhustack3d.local` | `Citizen@2026` | Read-only: area/ULPIN search, parcel/building/floor 3D view, flag status badges, validation/confidence info |
| **Admin** | `admin.demo@bhustack3d.local` | `Admin@2026` | Platform administration: create surveyor and admin accounts |

## How to Seed

Run this command from the repo root **before starting the backend**:

```bash
cd Faltu-main/backend
python scripts/seed_demo_users.py
```

The script is idempotent — safe to run multiple times. It checks by email before inserting.

## What Each Account Can Do

### Surveyor (`surveyor.demo@bhustack3d.local`)
- Login → lands on live record management (`/surveyor/records`) with surveyor controls
- Create/edit/delete buildings, floors, flats
- Assign and re-assign 3D ULPINs (floor-level, flat-level, building-level)
- **Bulk auto-assign** all floor ULPINs for a building at once
- View and resolve the **AI suspicion flag queue** (`/flags`)
- See building ULPIN reassignment history log

### Citizen (`citizen.demo@bhustack3d.local`)
- Login → lands on **Explore page** (`/explore`) — read-only 3D viewer
- Search by area name, parcel ULPIN, or location
- View parcel → building → floor hierarchy in the 3D hologram
- See flag status badges on floors/buildings that are under surveyor review
- **Cannot** see any ULPIN assignment, edit, delete, or resolve controls

## Security Notes

- Both accounts use bcrypt-hashed passwords stored in `bhustack.db`
- They authenticate through the normal `POST /auth/login` endpoint
- The backend enforces role-based access: citizen tokens receive **HTTP 403** on any mutation route
- UI-level hiding of controls is supplementary — the real boundary is the backend `_require_surveyor` dependency
