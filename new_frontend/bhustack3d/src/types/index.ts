export type Role = 'Citizen' | 'Surveyor' | 'Admin';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  designation?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface VerificationLayers {
  satellite: number; // 0-100%
  drone: number;     // 0-100%
  lidar: number;     // 0-100%
  sanctionPlan: number; // 0-100%
}

export interface Parcel {
  id: string;
  name: string;
  ulpin: string;
  area: number; // in sq meters
  state: string;
  district: string;
  zone: string;
  classification: string;
  confidence: number; // 0-100
  coordinates: {
    lat: number;
    lng: number;
  };
  boundaryGeoJson?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  buildingCount: number;
  lastVerified: string;
  verificationLayers: VerificationLayers;
  status: 'VERIFIED' | 'UNDER_SURVEY' | 'PENDING_SANCTION';
}

export interface Building {
  id: string;
  parcelId: string;
  name: string;
  code: string;
  height: number; // in meters
  area: number; // in sq.m
  floorsCount: number;
  buildingType: string;
  ulpin: string;
  footprint?: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
  position: [number, number, number]; // x, y, z relative
  dimensions: [number, number, number]; // width, height, depth
  status: 'ACTIVE' | 'SANCTIONED' | 'DISPUTED' | 'PENDING_APPROVAL';
  flaggedReason?: string;
  flaggedDate?: string;
  lastSurveyDate?: string;
  surveyorName?: string;
}

export interface SurveyRecord {
  id: string;
  buildingId: string;
  buildingName: string;
  parcelId: string;
  parcelName: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  surveyDate: string;
  surveyorId: string;
  surveyorName: string;
  ulpin3D: string;
  heightMeters: number;
  floorsCount: number;
  areaSqM: number;
  methodology: 'Drone Photogrammetry' | 'Terrestrial LiDAR' | 'RTK GNSS + Laser' | 'Total Station & Satellite';
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'FLAGGED_DISCREPANCY';
  complianceScore: number;
  notes: string;
  inspectionRef: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  floorNumber: number;
  floorLabel: string; // 'B2', 'B1', 'G', '1', '2', ..., '7'
  heightOffset: number; // meters from ground (elevation_base_m from backend)
  heightTop?: number;   // elevation_top_m from backend (for 3D slab rendering)
  heightM?: number;     // floor thickness in meters
  area: number;
  flatsCount: number;
  status: 'VERIFIED' | 'PENDING' | 'PENDING_APPROVAL';
  ulpin: string;
  flagStatus?: string;
  flagReason?: string;
}

export interface Flat {
  id: string;
  floorId: string;
  buildingId: string;
  flatNumber: string; // e.g. 'Flat 0704'
  area: number; // in sq.m
  type: string; // '2BHK' | '3BHK' | 'Office Suite' | 'Retail'
  ulpin: string; // e.g. 'BASE-V07-U0704-CX'
  ownerStatus: string;
  status: 'CLEAR' | 'ENCUMBERED' | 'MUTATION_IN_PROGRESS';
  positionIndex?: number;
}

export interface ValidationResult {
  valid: boolean;
  ulpin: string;
  entityType?: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'FLAT';
  details?: {
    name: string;
    level: string;
    parentHierarchy: string;
    confidence: number;
    verificationDate: string;
    issuingAuthority: string;
    geographicalBoundary: string;
  };
  error?: string;
}

export interface DigiLockerIntegration {
  isMock: true;
  label: 'DEMO INTEGRATION';
  status: 'LINKED' | 'UNLINKED' | 'VERIFIED';
  documentId: string;
  deedType: string;
  issueDate: string;
  signatory: string;
  verificationHash: string;
}

export interface BankKycIntegration {
  isMock: true;
  label: 'DEMO INTEGRATION';
  status: 'CLEAR' | 'ENCUMBERED';
  lendingInstitution: string;
  mortgageStatus: string;
  loanAccountRef: string;
  lastUpdated: string;
}

export interface SearchResult {
  id: string;
  location: string;
  state: string;
  ulpin: string;
  classification: string;
  zone: string;
  parcelId: string;
}

export interface DashboardKPIs {
  totalParcels: number;
  totalBuildings: number;
  totalFloors: number;
  totalFlats: number;
  totalAreaSqM: number;
  avgConfidence: number;
}

export type ThemeId = 'emerald' | 'amber' | 'nebula' | 'cyan' | 'daylight';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  badge: string;
  dotColor: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgSurface: string;
    bgElevated: string;
    borderColor: string;
    accentPrimary: string;
    accentSecondary: string;
    accentGlow: string;
    textPrimary: string;
    textMuted: string;
    skyColor: string;
    fogColor: string;
    globeOcean: string;
    globeGraticule: string;
    globeContinent: string;
    globeAtmosphere: string;
    satelliteColor: string;
  };
}
