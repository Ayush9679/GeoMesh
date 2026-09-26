/**
 * new_frontend/GeoMesh/src/services/adminService.ts
 * =====================================================
 * Typed API wrappers for all admin/surveyor endpoints.
 * Covers: parcels, features (buildings), floors, flats, flags, bulk ULPIN ops.
 * All mutation routes require a SURVEYOR or ADMIN token — the backend enforces
 * this with _require_surveyor; these wrappers attach the token automatically
 * via the shared `request()` helper in api.ts.
 */

import { request } from './api';

// ─── Parcel / Feature (Building) types ─────────────────────────────────────

export interface AdminParcel {
  id: number;
  ulpin_3d: string;
  name: string | null;
  centroid_lat: number;
  centroid_lon: number;
  total_area: number;
  confidence_score: string;
  last_verified_date: string | null;
  feature_count: number;
}

export interface BackendFeature {
  id: number;
  parcel_id: number;
  fid: number | null;
  ulpin_3d: string;
  height: number | null;
  area: number | null;
  floor_level: number;
  floor_count: number;
  floor_height_m: number;
  building_ulpin?: string | null;
  building_type: string | null;
  feature_name: string | null;
  notes: string | null;
  defined_floor_count: number;
  building_ulpin_assigned_at: string | null;
  building_ulpin_reassigned_by: number | null;
  building_ulpin_history: string | null; // JSON string of history array
  flag_status: string;
  flag_reason: string | null;
  flag_score: number | null;
}

export interface BackendFlat {
  id: number;
  floor_id: number;
  unit_number: string;
  unit_ulpin: string | null;
  unit_type: string;
  area_sqm: number | null;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
  flag_status: string;
  flag_reason: string | null;
  flag_score: number | null;
}

export interface BackendFloor {
  id: number;
  parcel_feature_id: number;
  floor_number: number;
  floor_ulpin: string | null;
  floor_label: string;
  elevation_base_m: number;
  elevation_top_m: number;
  height_m: number;
  created_at: string;
  updated_at: string;
  flat_count: number;
  flats: BackendFlat[];
  flag_status: string;
  flag_reason: string | null;
  flag_score: number | null;
}

export interface AssignUlpinResponse {
  id: number;
  ulpin_3d: string;
  status: string;
  message: string;
  flag_status?: string;
  flag_reason?: string | null;
  flag_score?: number | null;
}

export interface BulkAssignResponse {
  feature_id: number;
  total_floors: number;
  assigned_count: number;
  skipped_count: number;
  failed_count: number;
  assigned: Array<{ id: number; floor_number: number; floor_label: string; floor_ulpin: string; flag_status: string }>;
  skipped: Array<{ id: number; floor_number: number; floor_label: string; reason: string; floor_ulpin: string }>;
  failed: Array<{ id: number; floor_number: number; floor_label: string; error: string }>;
}

export interface BuildingUlpinUpdateResponse {
  id: number;
  ulpin_3d: string;
  status: string;
  message: string;
  previous_ulpin: string | null;
  flag_resolved: boolean;
  flag_status: string;
}

export interface FlaggedItem {
  entity_type: 'feature' | 'floor' | 'flat';
  entity_id: number;
  entity_label: string;
  parcel_id: number | null;
  flag_status: string;
  flag_reason: string | null;
  flag_score: number | null;
  flagged_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export interface ULPINReissueHistory {
  floor_id: number;
  current_ulpin: string | null;
  previous_ulpin: string | null;
  reissued_at: string | null;
  reissued_by: number | null;
  has_reissue_history: boolean;
}

// ─── Citizen types ──────────────────────────────────────────────────────────

export interface CitizenSearchResult {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  ulpin_3d: string;
  classification: string;
  area: string;
  elevation: string | null;
  feature_count: number | null;
  is_mine: boolean;
}

export interface CitizenBuilding {
  id: number;
  parcel_id: number;
  fid: number | null;
  ulpin_3d: string;
  height: number | null;
  area: number | null;
  floor_count: number;
  building_type: string | null;
  feature_name: string | null;
  flag_status: string;
  flag_reason: string | null;
}

export interface CitizenFlat {
  id: number;
  floor_id: number;
  unit_number: string;
  unit_ulpin: string | null;
  unit_type: string;
  area_sqm: number | null;
  owner_name: string | null;
  flag_status: string;
  flag_reason: string | null;
}

export interface CitizenFloor {
  id: number;
  parcel_feature_id: number;
  floor_number: number;
  floor_ulpin: string | null;
  floor_label: string;
  elevation_base_m: number;
  elevation_top_m: number;
  height_m: number;
  flat_count: number;
  flats: CitizenFlat[];
  flag_status: string;
  flag_reason: string | null;
}

export interface BackendStats {
  total_parcels: number;
  total_features: number;
  total_floors: number;
  total_flats: number;
  flagged_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Surveyor API functions
// ─────────────────────────────────────────────────────────────────────────────

export const adminService = {
  // ── Parcels ────────────────────────────────────────────────────────────────

  async listParcels(): Promise<AdminParcel[]> {
    return request<AdminParcel[]>('/admin/parcels');
  },

  // ── Buildings (Features) ───────────────────────────────────────────────────

  async getParcelFeatures(parcelId: number): Promise<BackendFeature[]> {
    return request<BackendFeature[]>(`/admin/parcels/${parcelId}/features`);
  },

  async updateFeature(
    parcelId: number,
    featureId: number,
    body: { name?: string; height?: number; notes?: string; floor_height_m?: number }
  ): Promise<BackendFeature> {
    return request<BackendFeature>(`/admin/parcels/${parcelId}/features/${featureId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async updateBuildingUlpin(
    parcelId: number,
    featureId: number,
    body: { action?: 'generate'; ulpin?: string; notes?: string }
  ): Promise<BuildingUlpinUpdateResponse> {
    return request<BuildingUlpinUpdateResponse>(
      `/admin/parcels/${parcelId}/features/${featureId}/ulpin`,
      { method: 'PUT', body: JSON.stringify(body) }
    );
  },

  // ── Floors ─────────────────────────────────────────────────────────────────

  async getFloors(parcelId: number, featureId: number): Promise<BackendFloor[]> {
    return request<BackendFloor[]>(
      `/admin/parcels/${parcelId}/features/${featureId}/floors`
    );
  },

  async generateFloors(
    parcelId: number,
    featureId: number,
    body: { floor_count: number; basement_count?: number }
  ): Promise<BackendFloor[]> {
    return request<BackendFloor[]>(
      `/admin/parcels/${parcelId}/features/${featureId}/floors/generate`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  },

  async createFloor(
    parcelId: number,
    featureId: number,
    body: { floor_number: number; floor_label?: string }
  ): Promise<BackendFloor> {
    return request<BackendFloor>(
      `/admin/parcels/${parcelId}/features/${featureId}/floors`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  },

  async updateFloor(
    floorId: number,
    body: { floor_number?: number; floor_label?: string }
  ): Promise<BackendFloor> {
    return request<BackendFloor>(`/admin/floors/${floorId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteFloor(floorId: number): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/admin/floors/${floorId}`, {
      method: 'DELETE',
    });
  },

  async assignFloorUlpin(floorId: number, force = false): Promise<AssignUlpinResponse> {
    return request<AssignUlpinResponse>(
      `/admin/floors/${floorId}/assign-ulpin?force=${force}`,
      { method: 'POST' }
    );
  },

  async bulkAssignFloorUlpins(
    parcelId: number,
    featureId: number,
    force = false
  ): Promise<BulkAssignResponse> {
    return request<BulkAssignResponse>(
      `/admin/parcels/${parcelId}/features/${featureId}/floors/assign-ulpin-bulk`,
      { method: 'POST', body: JSON.stringify({ force }) }
    );
  },

  async getFloorUlpinHistory(floorId: number): Promise<ULPINReissueHistory> {
    return request<ULPINReissueHistory>(`/admin/floors/${floorId}/ulpin-history`);
  },

  // ── Flats ──────────────────────────────────────────────────────────────────

  async generateFlats(
    floorId: number,
    body: { flat_count: number; starting_unit_number?: number }
  ): Promise<BackendFlat[]> {
    return request<BackendFlat[]>(`/admin/floors/${floorId}/flats/generate`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async createFlat(
    floorId: number,
    body: { unit_number: string; unit_type?: string; area_sqm?: number; owner_name?: string }
  ): Promise<BackendFlat> {
    return request<BackendFlat>(`/admin/floors/${floorId}/flats`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateFlat(
    flatId: number,
    body: { unit_number?: string; unit_type?: string; area_sqm?: number; owner_name?: string }
  ): Promise<BackendFlat> {
    return request<BackendFlat>(`/admin/flats/${flatId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteFlat(flatId: number): Promise<{ detail: string }> {
    return request<{ detail: string }>(`/admin/flats/${flatId}`, {
      method: 'DELETE',
    });
  },

  async assignFlatUlpin(flatId: number): Promise<AssignUlpinResponse> {
    return request<AssignUlpinResponse>(`/admin/flats/${flatId}/assign-ulpin`, {
      method: 'POST',
    });
  },

  // ── Flags / Review Queue ───────────────────────────────────────────────────

  async getFlaggedItems(
    status: string = 'flagged',
    entityType: string = 'all',
    page = 1,
    size = 50
  ): Promise<FlaggedItem[]> {
    return request<FlaggedItem[]>(
      `/admin/flags?status=${status}&entity_type=${entityType}&page=${page}&size=${size}`
    );
  },

  async resolveFlag(
    entityType: 'feature' | 'floor' | 'flat',
    entityId: number,
    decision: 'ok' | 'rejected',
    notes?: string
  ): Promise<{ detail: string }> {
    return request<{ detail: string }>(
      `/admin/flags/${entityType}/${entityId}/resolve`,
      { method: 'POST', body: JSON.stringify({ decision, notes }) }
    );
  },

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<BackendStats> {
    return request<BackendStats>('/stats');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Citizen API functions
// ─────────────────────────────────────────────────────────────────────────────

export const citizenService = {
  async search(q: string): Promise<CitizenSearchResult[]> {
    return request<CitizenSearchResult[]>(`/citizen/search?q=${encodeURIComponent(q)}`);
  },

  async getBuildings(ulpinId: string): Promise<CitizenBuilding[]> {
    return request<CitizenBuilding[]>(`/citizen/parcels/${encodeURIComponent(ulpinId)}/buildings`);
  },

  async getFloors(ulpinId: string, featureId: number): Promise<CitizenFloor[]> {
    return request<CitizenFloor[]>(
      `/citizen/parcels/${encodeURIComponent(ulpinId)}/features/${featureId}/floors`
    );
  },
};
