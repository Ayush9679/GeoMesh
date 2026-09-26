/**
 * floorService.ts
 * ================
 * Wrappers for floor data. The backend's floor endpoints require both
 * parcelId AND featureId: GET /admin/parcels/{parcelId}/features/{featureId}/floors
 *
 * The buildingId passed to getFloorsByBuilding() may be:
 *   - A numeric string ID from the backend (e.g. "12") → parsed and used as featureId
 *   - A mock ID like "bldg-01" → falls back to INITIAL_FLOORS
 *
 * The parcelId is resolved by looking up the building in the parcels list.
 */

import { adminService, BackendFloor } from './adminService';
import { Floor } from '../types';
import { INITIAL_FLOORS } from './mockData';

// Track building→parcel mapping for backend buildings
const buildingParcelMap: Record<string, number> = {};

export function registerBuildingParcel(buildingId: string, parcelId: number) {
  buildingParcelMap[buildingId] = parcelId;
}

/**
 * Map a BackendFloor → frontend Floor type.
 * Uses elevation_base_m and elevation_top_m when available.
 */
function mapBackendFloor(f: BackendFloor, buildingId: string): Floor {
  return {
    id: String(f.id),
    buildingId,
    floorNumber: f.floor_number,
    floorLabel: f.floor_label.replace(/^floor\s+/i, '').replace(/^basement\s+/i, 'B').replace(/^ground\s+floor/i, 'G') || String(f.floor_number),
    // Use backend elevation data for 3D slab rendering
    heightOffset: f.elevation_base_m,
    heightTop: f.elevation_top_m,
    heightM: f.height_m,
    area: 1680, // Not returned by backend per-floor yet
    flatsCount: f.flat_count,
    status: f.flag_status === 'clean' ? 'VERIFIED' : 'PENDING_APPROVAL',
    ulpin: f.floor_ulpin || '',
    flagStatus: f.flag_status,
    flagReason: f.flag_reason || undefined,
  };
}

export const floorService = {
  async getFloorsByBuilding(buildingId: string): Promise<Floor[]> {
    try {
      const numericId = parseInt(buildingId, 10);
      if (isNaN(numericId)) {
        return INITIAL_FLOORS.filter((f) => f.buildingId === buildingId);
      }

      // Look up the parcelId for this building
      const parcelId = buildingParcelMap[buildingId];
      if (!parcelId) {
        // Try all known parcels to find the feature
        const parcels = await adminService.listParcels();
        for (const parcel of parcels) {
          try {
            const features = await adminService.getParcelFeatures(parcel.id);
            const match = features.find((f) => f.id === numericId);
            if (match) {
              buildingParcelMap[buildingId] = parcel.id;
              const floors = await adminService.getFloors(parcel.id, numericId);
              return floors.map((fl) => mapBackendFloor(fl, buildingId));
            }
          } catch {
            continue;
          }
        }
        // Not found in any parcel — return mock
        return INITIAL_FLOORS.filter((f) => f.buildingId === buildingId);
      }

      const floors = await adminService.getFloors(parcelId, numericId);
      if (Array.isArray(floors) && floors.length > 0) {
        return floors.map((fl) => mapBackendFloor(fl, buildingId));
      }

      return INITIAL_FLOORS.filter((f) => f.buildingId === buildingId);
    } catch {
      return INITIAL_FLOORS.filter((f) => f.buildingId === buildingId);
    }
  },

  async getFloorById(id: string): Promise<Floor | null> {
    return INITIAL_FLOORS.find((f) => f.id === id) || null;
  },

  async createFloor(buildingId: string, floorData: Partial<Floor>): Promise<Floor> {
    const newFloor: Floor = {
      id: `floor-${Date.now()}`,
      buildingId,
      floorNumber: floorData.floorNumber ?? 9,
      floorLabel: floorData.floorLabel || '9',
      heightOffset: floorData.heightOffset ?? 43.2,
      area: floorData.area || 1680,
      flatsCount: floorData.flatsCount || 4,
      status: 'VERIFIED',
      ulpin: floorData.ulpin || 'BASE-V09-FL09-CX',
    };
    INITIAL_FLOORS.push(newFloor);
    return newFloor;
  },
};
