# KP2 search-to-viewer action audit

This update records the live-data path relevant to the KP2 hologram and the
viewer fixes. Visual acceptance remains pending human browser review.

| Button/action | Page | Intended behavior | Backend endpoint / data source | Status |
|---|---|---|---|---|
| Search form submit | `/explore` (`CitizenRegistryPage`) | Find area/ULPIN records for the signed-in user | `GET /citizen/search?q=...` | Wired; live API verified |
| Search result card | `/explore` | Load the selected parcel’s real building footprints and focus its 3D scene | `GET /citizen/parcels/{parcel_ulpin}/buildings`, then `GET /citizen/parcels/{parcel_ulpin}/features/{feature_id}/floors` | Wired; local API returned 575 features |
| Floor selector | `/explore` | Highlight a live floor and show its ULPIN, elevation and review status | Uses the selected floor and redacted flats already returned by the citizen floors endpoint; no surveyor-only request | Wired; API source verified, visual check pending |
| Building/floor mesh selection | 3D viewer on `/explore` | Select a building or floor in the scene | Uses the live building and floor state loaded above | Wired; visual check pending |
| Back to search | `/explore` | Clear the selected viewer focus and show search results again | Local state reset, then `GET /citizen/search?q=...` | Wired |
| Viewer controls (camera, display mode, measurement, sound) | 3D viewer | Change only the local presentation or view state | No backend call expected | Local-only controls |

The citizen floor selector uses the nested, redacted flat data from the citizen
endpoint. It must not fall back to `flatService` demo fixtures.
