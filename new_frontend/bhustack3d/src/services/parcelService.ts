import { request } from './api';
import { Parcel, Building, ValidationResult, SearchResult, DashboardKPIs } from '../types';
import { INITIAL_PARCELS, INITIAL_BUILDINGS, INITIAL_FLOORS, INITIAL_FLATS } from './mockData';
import { adminService, AdminParcel, BackendFeature } from './adminService';

/**
 * Map a backend AdminParcel row → frontend Parcel type.
 */
function mapBackendParcel(p: AdminParcel): Parcel {
  return {
    id: String(p.id),
    name: p.name || `Parcel #${p.id}`,
    ulpin: p.ulpin_3d,
    area: p.total_area || 0,
    state: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar',
    zone: 'Knowledge Park-II, GNIDA Special Zone',
    classification: 'Industrial & Commercial Multi-Cluster',
    confidence: 90,
    coordinates: { lat: p.centroid_lat, lng: p.centroid_lon },
    buildingCount: p.feature_count || 0,
    lastVerified: p.last_verified_date || new Date().toISOString(),
    verificationLayers: { satellite: 92, drone: 90, lidar: 88, sanctionPlan: 90 },
    status: 'VERIFIED',
  };
}

/**
 * Map a backend ParcelFeature → frontend Building type.
 */
function mapBackendFeature(f: BackendFeature, parcelId: string): Building {
  const floorHeight = f.floor_height_m || 3.0;
  const totalHeight = (f.floor_count || 1) * floorHeight;
  return {
    id: String(f.id),
    parcelId,
    name: f.feature_name || `Building #${f.id}`,
    code: `BUILDING ${String(f.id).padStart(2, '0')}`,
    height: f.height || totalHeight,
    area: f.area || 0,
    floorsCount: f.floor_count || 1,
    buildingType: f.building_type || 'yes',
    ulpin: f.ulpin_3d,
    position: [0, 0, 0] as [number, number, number],
    dimensions: [16, f.height || totalHeight, 14] as [number, number, number],
    status: f.flag_status === 'clean' ? 'ACTIVE' : f.flag_status === 'flagged' ? 'DISPUTED' : 'PENDING_APPROVAL',
    flaggedReason: f.flag_reason || undefined,
    lastSurveyDate: undefined,
    surveyorName: undefined,
  };
}

export const parcelService = {
  async getParcels(): Promise<Parcel[]> {
    try {
      const adminParcels = await adminService.listParcels();
      if (Array.isArray(adminParcels) && adminParcels.length > 0) {
        return adminParcels.map(mapBackendParcel);
      }
      return INITIAL_PARCELS;
    } catch {
      return INITIAL_PARCELS;
    }
  },

  async getParcelById(id: string): Promise<Parcel | null> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const adminParcels = await adminService.listParcels();
        const found = adminParcels.find((p) => p.id === numId);
        if (found) return mapBackendParcel(found);
      }
      return INITIAL_PARCELS.find((p) => p.id === id || p.ulpin === id) || null;
    } catch {
      return INITIAL_PARCELS.find((p) => p.id === id || p.ulpin === id) || null;
    }
  },

  async searchLocations(q: string): Promise<SearchResult[]> {
    const query = q.trim();
    if (!query) return [];

    try {
      // Try authenticated citizen search first
      try {
        const citizenResults = await request<any[]>(`/citizen/search?q=${encodeURIComponent(query)}`);
        if (Array.isArray(citizenResults) && citizenResults.length > 0) {
          return citizenResults.map((r) => ({
            id: `res-${r.id}`,
            location: r.name,
            state: r.state,
            ulpin: r.ulpin_3d,
            classification: r.classification,
            zone: r.zone || '',
            parcelId: r.id,
          }));
        }
      } catch {
        // Not authenticated — try public search
      }

      const publicResults = await request<any[]>(`/locations/search?q=${encodeURIComponent(query)}`);
      if (Array.isArray(publicResults) && publicResults.length > 0) {
        return publicResults.map((r) => ({
          id: `res-${r.id}`,
          location: r.name,
          state: r.state,
          ulpin: r.ulpin_3d,
          classification: r.classification,
          zone: r.zone || '',
          parcelId: r.id,
        }));
      }
    } catch {
      // pass
    }

    // Final fallback: search mock data
    const lower = query.toLowerCase();
    return INITIAL_PARCELS
      .filter((p) =>
        p.name.toLowerCase().includes(lower) ||
        p.ulpin.toLowerCase().includes(lower) ||
        p.state.toLowerCase().includes(lower) ||
        p.district.toLowerCase().includes(lower) ||
        p.zone.toLowerCase().includes(lower)
      )
      .map((p) => ({
        id: `res-${p.id}`,
        location: p.name,
        state: `${p.district}, ${p.state}`,
        ulpin: p.ulpin,
        classification: p.classification,
        zone: p.zone,
        parcelId: p.id,
      }));
  },

  async getSampleUlpins(): Promise<{ label: string; value: string; level: string; entity_type: string }[]> {
    try {
      const res = await request<{ samples: { label: string; value: string; level: string; entity_type: string }[] }>('/public/sample-ulpins?limit=4');
      if (res?.samples?.length) return res.samples;
    } catch {
      // pass
    }
    return [];
  },

  async validateUlpin(ulpin_id: string): Promise<ValidationResult> {
    const cleanUlpin = ulpin_id.trim();
    if (!cleanUlpin) {
      return { valid: false, ulpin: ulpin_id, error: 'Please enter a valid ULPIN identifier.' };
    }

    try {
      // Backend returns: { ulpin, valid, check_digit_expected, check_digit_found, message,
      //                    entity_type?, details?, error_type? }
      // Map it to frontend ValidationResult shape.
      const raw = await request<any>(`/parcels/${encodeURIComponent(cleanUlpin)}/validate`);
      if (!raw) throw new Error('Empty response');

      const result: ValidationResult = {
        valid: raw.valid,
        ulpin: raw.ulpin || cleanUlpin,
        entityType: raw.entity_type as ValidationResult['entityType'],
        details: raw.details
          ? {
              name: raw.details.name,
              level: raw.details.level,
              parentHierarchy: raw.details.parentHierarchy,
              confidence: raw.details.confidence,
              verificationDate: raw.details.verificationDate,
              issuingAuthority: raw.details.issuingAuthority,
              geographicalBoundary: raw.details.geographicalBoundary,
            }
          : undefined,
        error: raw.valid
          ? undefined
          : (() => {
              if (raw.error_type === 'MALFORMED')
                return `Malformed ULPIN — does not match the expected 3D cadastral format ({14-char base}-V{level}-U{unit}-C{digit}).`;
              if (raw.error_type === 'CHECKSUM_FAILED')
                return `Invalid checksum — check digit mismatch (found ${raw.check_digit_found}, expected ${raw.check_digit_expected}). The ULPIN may have been corrupted or manually edited.`;
              if (raw.error_type === 'NOT_FOUND')
                return `Well-formed ULPIN with valid checksum, but no matching authenticated record exists in the national 3D cadastral registry.`;
              return raw.message || 'The submitted identifier does not match any authenticated 3D cadastral record.';
            })(),
      };
      return result;
    } catch (err: any) {
      // Only reach here on genuine network/backend-offline errors.
      // Never silently validate against stale mock data.
      const isNetworkError =
        err?.status === 0 ||
        !err?.status ||
        err?.message?.toLowerCase().includes('connect') ||
        err?.message?.toLowerCase().includes('network') ||
        err?.message?.toLowerCase().includes('fetch');

      if (isNetworkError) {
        return {
          valid: false,
          ulpin: cleanUlpin,
          error: 'Unable to reach the Cadastral verification service. Please check your connection and try again.',
        };
      }
      return {
        valid: false,
        ulpin: cleanUlpin,
        error: err?.message || 'The submitted identifier does not match any authenticated 3D cadastral record.',
      };
    }
  },


  async getBuildingsByParcel(parcelId: string): Promise<Building[]> {
    try {
      const numId = parseInt(parcelId, 10);
      if (!isNaN(numId)) {
        const features = await adminService.getParcelFeatures(numId);
        if (Array.isArray(features) && features.length > 0) {
          return features.map((f) => mapBackendFeature(f, parcelId));
        }
      }
      return INITIAL_BUILDINGS.filter((b) => b.parcelId === parcelId);
    } catch {
      return INITIAL_BUILDINGS.filter((b) => b.parcelId === parcelId);
    }
  },

  async createParcel(parcelData: Partial<Parcel>): Promise<Parcel> {
    try {
      return await request<Parcel>('/parcels', {
        method: 'POST',
        body: JSON.stringify(parcelData),
      });
    } catch {
      const newParcel: Parcel = {
        id: `parcel-${Date.now()}`,
        name: parcelData.name || 'New Cadastral Parcel',
        ulpin: parcelData.ulpin || `DL-DEL-NDLS-${Math.floor(1000 + Math.random() * 9000)}`,
        area: parcelData.area || 5000,
        state: parcelData.state || 'Delhi',
        district: parcelData.district || 'New Delhi',
        zone: parcelData.zone || 'Zone A',
        classification: parcelData.classification || 'Commercial Mixed-Use',
        confidence: 90,
        coordinates: parcelData.coordinates || { lat: 28.6139, lng: 77.2090 },
        buildingCount: 1,
        lastVerified: new Date().toISOString(),
        verificationLayers: { satellite: 92, drone: 90, lidar: 88, sanctionPlan: 90 },
        status: 'UNDER_SURVEY',
      };
      INITIAL_PARCELS.unshift(newParcel);
      return newParcel;
    }
  },

  async createBuilding(parcelId: string, buildingData: Partial<Building>): Promise<Building> {
    const newBuilding: Building = {
      id: `bldg-${Date.now()}`,
      parcelId,
      name: buildingData.name || 'Building Alpha',
      code: buildingData.code || `BUILDING 0${INITIAL_BUILDINGS.length + 1}`,
      height: buildingData.height || 36,
      area: buildingData.area || 12000,
      floorsCount: buildingData.floorsCount || 8,
      buildingType: buildingData.buildingType || 'Commercial Space',
      ulpin: buildingData.ulpin || `BASE-V01-B0${INITIAL_BUILDINGS.length + 1}-CX`,
      position: [0, 0, 0] as [number, number, number],
      dimensions: [16, buildingData.height || 36, 14] as [number, number, number],
      status: 'ACTIVE',
    };
    INITIAL_BUILDINGS.push(newBuilding);
    return newBuilding;
  },

  async getDashboardKPIs(): Promise<DashboardKPIs> {
    try {
      const stats = await request<any>('/stats');
      if (stats) {
        return {
          totalParcels: stats.total_parcels || 0,
          totalBuildings: stats.total_features || stats.total_buildings || 0,
          totalFloors: stats.total_floors || 0,
          totalFlats: stats.total_flats || 0,
          totalAreaSqM: stats.total_area || 0,
          avgConfidence: stats.avg_confidence || 90,
        };
      }
    } catch {
      // pass
    }

    try {
      const adminParcels = await adminService.listParcels();
      const totalArea = adminParcels.reduce((acc, p) => acc + (p.total_area || 0), 0);
      return {
        totalParcels: adminParcels.length,
        totalBuildings: adminParcels.reduce((acc, p) => acc + (p.feature_count || 0), 0),
        totalFloors: 0,
        totalFlats: 0,
        totalAreaSqM: totalArea,
        avgConfidence: 90,
      };
    } catch {
      const totalArea = INITIAL_PARCELS.reduce((acc, p) => acc + p.area, 0);
      const avgConfidence = Math.round(
        INITIAL_PARCELS.reduce((acc, p) => acc + p.confidence, 0) / INITIAL_PARCELS.length
      );
      return {
        totalParcels: INITIAL_PARCELS.length,
        totalBuildings: INITIAL_BUILDINGS.length,
        totalFloors: INITIAL_FLOORS.length,
        totalFlats: INITIAL_FLATS.length,
        totalAreaSqM: totalArea,
        avgConfidence,
      };
    }
  },
};
