# Citizen KP2 search and explorer audit

Scope: the citizen registry search results and the 3D Explorer entry path added to the live backend flow.

| Button/action | Page | Behavior | Backend endpoint | Status |
|---|---|---|---|---|
| Search | Citizen Registry (`/explore`) | Search by location name, classification, or ULPIN and refresh result cards | `GET /citizen/search?q=...` | Wired |
| Knowledge Park 2 result card | Citizen Registry (`/explore`) | Load the selected location's linked parcel buildings, select the first building, and display its floors in the viewer | `GET /citizen/parcels/{parcel_ulpin}/buildings`, then `GET /citizen/parcels/{parcel_ulpin}/features/{feature_id}/floors` | Wired |
| Floor card | Citizen Registry (`/explore`) | Select and highlight a returned floor in the live footprint viewer | No additional request; selects the already-loaded floor record | Wired |
| Back to search | Citizen Registry (`/explore`) | Clear selected building/floor and return to result cards | No additional request; existing results remain available | Wired |
| Generate KP2 floors and assign ULPINs | Surveyor Records (`/surveyor/records`) | Create missing 3 m floor strata for seeded KP2 footprints and assign validated floor ULPINs | `POST /admin/kp2/generate-floors-and-assign` (surveyor/admin only) | Wired |

The search result includes both its display ULPIN and `parcel_ulpin`. The former is retained for the location card; the latter identifies the Layer 4 parcel used by building and floor requests.
