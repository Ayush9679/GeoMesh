/**
 * flatService.ts
 * ==============
 * Wrappers for flat/unit data. The backend returns flats as part of the floor
 * response (nested in BackendFloor.flats). We cache them after floor loads
 * and filter by floorId.
 */

import { Flat } from '../types';
import { INITIAL_FLATS } from './mockData';

// In-memory flat cache populated by floorService after each floor load
export const flatCache: Record<string, Flat[]> = {};

/**
 * Store flats for a given floorId in the cache.
 * Called by the CadastralContext when floor data is received.
 */
export function cacheFlatsByFloor(floorId: string, flats: Flat[]) {
  flatCache[floorId] = flats;
}

export const flatService = {
  async getFlatsByFloor(floorId: string): Promise<Flat[]> {
    // Check cache first (populated from floor load)
    if (flatCache[floorId] && flatCache[floorId].length > 0) {
      return flatCache[floorId];
    }

    // Fallback to mock data
    const mockFlats = INITIAL_FLATS.filter((f) => f.floorId === floorId);
    if (mockFlats.length > 0) return mockFlats;

    return [];
  },

  async getFlatById(id: string): Promise<Flat | null> {
    // Check all cached flats
    for (const flats of Object.values(flatCache)) {
      const found = flats.find((f) => f.id === id);
      if (found) return found;
    }
    return INITIAL_FLATS.find((f) => f.id === id) || null;
  },

  async createFlat(floorId: string, flatData: Partial<Flat>): Promise<Flat> {
    const newFlat: Flat = {
      id: `flat-${Date.now()}`,
      floorId,
      buildingId: flatData.buildingId || 'bldg-01',
      flatNumber: flatData.flatNumber || `Flat 070${INITIAL_FLATS.length + 1}`,
      area: flatData.area || 180,
      type: flatData.type || 'Commercial Suite',
      ulpin: flatData.ulpin || `BASE-V07-U070${INITIAL_FLATS.length + 1}-CX`,
      ownerStatus: flatData.ownerStatus || 'Allotted',
      status: flatData.status || 'CLEAR',
      positionIndex: INITIAL_FLATS.length,
    };
    if (!flatCache[floorId]) flatCache[floorId] = [];
    flatCache[floorId].push(newFlat);
    INITIAL_FLATS.push(newFlat);
    return newFlat;
  },
};
