import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as THREE from 'three';
import { Parcel, Building, Floor, Flat, ThemeConfig, ThemeId } from '../types';
import { parcelService } from '../services/parcelService';
import { floorService } from '../services/floorService';
import { flatService } from '../services/flatService';
import { surveyService } from '../services/surveyService';
import { cadastralAudio } from '../utils/cadastralAudio';
import { request } from '../services/api';
import { useAuth } from './AuthContext';
import {
  THEMES,
  THEME_LIST,
  applyThemeToDocument,
  getSavedTheme,
  DEFAULT_THEME_ID,
} from '../services/themeService';

interface CadastralContextType {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  buildings: Building[];
  selectedBuilding: Building | null;
  floors: Floor[];
  selectedFloor: Floor | null;
  flats: Flat[];
  selectedFlat: Flat | null;
  loading: boolean;
  error: string | null;

  // Theme state
  themeId: ThemeId;
  currentTheme: ThemeConfig;
  setTheme: (id: ThemeId) => void;
  cycleTheme: () => void;

  // View state
  showGrid: boolean;
  showBuildings: boolean;
  showFloorsExploded: boolean;
  showScanning: boolean;
  cameraResetTrigger: number;
  visualMode: 'cyber' | 'daylight' | 'xray';
  cinematicOrbit: boolean;
  cameraPreset: 'iso' | 'top' | 'street';
  explosionFactor: number;
  measurementMode: boolean;
  measurePoints: [THREE.Vector3, THREE.Vector3] | [THREE.Vector3] | [];
  sunHour: number;
  soundEnabled: boolean;
  viewerShape: 'circle' | 'wide';
  globeSurfing: boolean;
  surfSpeed: number;
  showGlobeAtmosphere: boolean;

  // Actions
  selectParcel: (id: string) => Promise<void>;
  selectBuilding: (id: string | null) => Promise<void>;
  selectFloor: (id: string | null) => Promise<void>;
  selectFlat: (id: string | null) => Promise<void>;
  stepUpHierarchy: () => void;
  resetSelection: () => void;
  toggleGrid: () => void;
  toggleBuildings: () => void;
  toggleFloorsExploded: () => void;
  toggleScanning: () => void;
  resetCamera: () => void;
  setVisualMode: (mode: 'cyber' | 'daylight' | 'xray') => void;
  setCinematicOrbit: (active: boolean | ((prev: boolean) => boolean)) => void;
  setCameraPreset: (preset: 'iso' | 'top' | 'street') => void;
  setExplosionFactor: (factor: number) => void;
  setMeasurementMode: (active: boolean | ((prev: boolean) => boolean)) => void;
  addMeasurePoint: (point: THREE.Vector3) => void;
  clearMeasurement: () => void;
  setSunHour: (hour: number) => void;
  toggleSound: () => void;
  setViewerShape: (shape: 'circle' | 'wide') => void;
  toggleViewerShape: () => void;
  setGlobeSurfing: (active: boolean | ((prev: boolean) => boolean)) => void;
  toggleGlobeSurfing: () => void;
  setSurfSpeed: (speed: number) => void;
  setShowGlobeAtmosphere: (show: boolean) => void;
  autoAssign3DUlpinAllBuildings: () => Promise<{ updatedCount: number }>;
  autoFlagBuildingsForApproval: () => Promise<{ flaggedCount: number }>;
  lastActionFeedback: { message: string; type: 'success' | 'warning' | 'info' } | null;
  clearFeedback: () => void;
  refreshData: () => Promise<void>;
  loadCitizenParcel: (location: { id: string; name: string; state: string; ulpin_3d: string; parcel_ulpin?: string; classification: string; area: string; lat: number; lon: number }) => Promise<void>;
}

const CadastralContext = createContext<CadastralContextType | undefined>(undefined);

export const CadastralProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);

  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
  // Citizen floor responses include their redacted flats; retain that live
  // payload so switching floors never falls back to the demo mock-data service.
  const [citizenFlats, setCitizenFlats] = useState<Flat[]>([]);
  const [citizenParcelUlpin, setCitizenParcelUlpin] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Theme State
  const [themeId, setThemeId] = useState<ThemeId>(getSavedTheme);
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    return applyThemeToDocument(getSavedTheme());
  });

  const handleSetTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    const cfg = applyThemeToDocument(id);
    setCurrentTheme(cfg);
    cadastralAudio.playClick();
  }, []);

  const cycleTheme = useCallback(() => {
    const list: ThemeId[] = ['emerald', 'amber', 'nebula', 'cyan', 'daylight'];
    const idx = list.indexOf(themeId);
    const nextTheme = list[(idx + 1) % list.length];
    handleSetTheme(nextTheme);
  }, [themeId, handleSetTheme]);

  useEffect(() => {
    const cfg = applyThemeToDocument(themeId);
    setCurrentTheme(cfg);
  }, [themeId]);

  // 3D Visual toggles & Interactive Controls
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showBuildings, setShowBuildings] = useState<boolean>(true);
  const [showFloorsExploded, setShowFloorsExploded] = useState<boolean>(false);
  const [showScanning, setShowScanning] = useState<boolean>(true);
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);
  const [visualMode, setVisualMode] = useState<'cyber' | 'daylight' | 'xray'>('cyber');
  const [cinematicOrbit, setCinematicOrbit] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'street'>('iso');
  const [explosionFactor, setExplosionFactor] = useState<number>(0);
  const [measurementMode, setMeasurementMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<[THREE.Vector3, THREE.Vector3] | [THREE.Vector3] | []>([]);
  const [sunHour, setSunHour] = useState<number>(14);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [viewerShape, setViewerShape] = useState<'circle' | 'wide'>('wide');
  const [globeSurfing, setGlobeSurfing] = useState<boolean>(true);
  const [surfSpeed, setSurfSpeed] = useState<number>(1);
  const [showGlobeAtmosphere, setShowGlobeAtmosphere] = useState<boolean>(true);

  const toggleViewerShape = () => {
    setViewerShape((prev) => (prev === 'circle' ? 'wide' : 'circle'));
  };

  const toggleGlobeSurfing = () => {
    setGlobeSurfing((prev) => {
      const next = !prev;
      if (next) {
        cadastralAudio.playSurfGlide(surfSpeed);
      }
      return next;
    });
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      cadastralAudio.setEnabled(next);
      return next;
    });
  };

  const addMeasurePoint = (pt: THREE.Vector3) => {
    cadastralAudio.playMeasurePing();
    setMeasurePoints((prev) => {
      if (prev.length === 0) {
        return [pt];
      }
      if (prev.length === 1) {
        return [prev[0], pt];
      }
      return [pt];
    });
  };

  const clearMeasurement = () => {
    setMeasurePoints([]);
  };

  const loadInitialData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError(null);
    if (user?.role === 'Citizen') {
      setParcels([]); setSelectedParcel(null); setBuildings([]); setSelectedBuilding(null);
      setFloors([]); setSelectedFloor(null); setFlats([]); setSelectedFlat(null); setCitizenFlats([]);
      setLoading(false);
      return;
    }
    try {
      const parcelList = await parcelService.getParcels();
      setParcels(parcelList);
      if (parcelList.length > 0) {
        const defaultParcel = parcelList[0];
        setSelectedParcel(defaultParcel);
        const bldgs = await parcelService.getBuildingsByParcel(defaultParcel.id);
        setBuildings(bldgs);

        if (bldgs.length > 0) {
          const defaultBldg = bldgs[0];
          setSelectedBuilding(defaultBldg);
          const flrs = await floorService.getFloorsByBuilding(defaultBldg.id);
          setFloors(flrs);

          // Find floor 7 by default (matches user prompt: Floor 07 -> Flat 0704)
          const targetFloor = flrs.find((f) => f.floorLabel === '7') || flrs[flrs.length - 1];
          if (targetFloor) {
            setSelectedFloor(targetFloor);
            const flts = await flatService.getFlatsByFloor(targetFloor.id);
            setFlats(flts);
            const defaultFlat = flts.find((f) => f.ulpin === 'BASE-V07-U0704-CX') || flts[0];
            if (defaultFlat) {
              setSelectedFlat(defaultFlat);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load cadastral records');
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.role]);

  const selectParcel = async (id: string) => {
    setLoading(true);
    try {
      const p = await parcelService.getParcelById(id);
      if (p) {
        setSelectedParcel(p);
        const bldgs = await parcelService.getBuildingsByParcel(p.id);
        setBuildings(bldgs);
        if (bldgs.length > 0) {
          setSelectedBuilding(bldgs[0]);
          const flrs = await floorService.getFloorsByBuilding(bldgs[0].id);
          setFloors(flrs);
          if (flrs.length > 0) {
            const f = flrs.find((fl) => fl.floorLabel === '7') || flrs[0];
            setSelectedFloor(f);
            const flts = await flatService.getFlatsByFloor(f.id);
            setFlats(flts);
            setSelectedFlat(flts[0] || null);
          } else {
            setSelectedFloor(null);
            setFlats([]);
            setSelectedFlat(null);
          }
        } else {
          setSelectedBuilding(null);
          setFloors([]);
          setSelectedFloor(null);
          setFlats([]);
          setSelectedFlat(null);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load parcel');
    } finally {
      setLoading(false);
    }
  };

  const loadCitizenParcel = async (location: { id: string; name: string; state: string; ulpin_3d: string; parcel_ulpin?: string; classification: string; area: string; lat: number; lon: number }) => {
    setLoading(true);
    setError(null);
    // Live area views use a fixed survey camera; the conceptual globe flyover
    // would otherwise keep pulling the camera back toward the scene origin.
    setGlobeSurfing(false);
    try {
      const parcel: Parcel = {
        id: location.id, name: location.name, ulpin: location.ulpin_3d,
        area: Number.parseFloat(location.area) || 0, state: location.state,
        district: location.state, zone: location.classification,
        classification: location.classification, confidence: 90,
        coordinates: { lat: location.lat, lng: location.lon }, buildingCount: 0,
        lastVerified: new Date().toISOString(),
        verificationLayers: { satellite: 0, drone: 0, lidar: 0, sanctionPlan: 0 }, status: 'VERIFIED',
      };
      const targetParcelUlpin = location.parcel_ulpin || location.ulpin_3d;
      setCitizenParcelUlpin(targetParcelUlpin);
      setCitizenFlats([]);
      const rawBuildings = await request<any[]>(`/citizen/parcels/${encodeURIComponent(targetParcelUlpin)}/buildings`);
      const projectPoint = (lon: number, lat: number, originLon: number, originLat: number) => ({
        x: (lon - originLon) * 111320 * Math.cos(originLat * Math.PI / 180),
        z: -(lat - originLat) * 110540,
      });
      const featureCenter = (geometry: any) => {
        const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.coordinates || [];
        const points = polygons.flatMap((polygon: any[]) => polygon[0] || []);
        if (!points.length) return [location.lon, location.lat] as [number, number];
        return [points.reduce((sum: number, p: number[]) => sum + p[0], 0) / points.length,
          points.reduce((sum: number, p: number[]) => sum + p[1], 0) / points.length] as [number, number];
      };
      // Use the location's cadastral centroid as one shared projection origin.
      // Per-building origins subtly changed the longitude scale and made the
      // imported KP2 footprints drift relative to each other across the site.
      const origin: [number, number] = [location.lon, location.lat];
      const mappedBuildings: Building[] = rawBuildings.map((b) => {
        const geometry = b.geometry;
        const center = featureCenter(geometry);
        const centerScene = projectPoint(center[0], center[1], origin[0], origin[1]);
        const localize = (point: number[]) => {
          const p = projectPoint(point[0], point[1], origin[0], origin[1]);
          return [p.x - centerScene.x, p.z - centerScene.z];
        };
        const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.coordinates || [];
        const localPolygons = polygons.map((polygon: number[][][]) => polygon.map((ring) => ring.map(localize)));
        const flatPoints = localPolygons.flat(2) as number[][];
        const side = Math.max(4, ...flatPoints.map((point) => Math.abs(point[0])), ...flatPoints.map((point) => Math.abs(point[1]))) * 2;
        const buildingPosition = centerScene;
        const buildingHeight = b.height || (b.floor_count || 1) * 3;
        return {
          id: String(b.id), parcelId: location.id, name: b.feature_name || `Building #${b.id}`,
          code: `BUILDING ${b.id}`, height: buildingHeight, area: b.area || 0,
          floorsCount: b.floor_count || 0, buildingType: b.building_type || 'Building',
          ulpin: b.ulpin_3d, position: [buildingPosition.x, 0, buildingPosition.z], dimensions: [side, buildingHeight, side],
          footprint: geometry ? { type: geometry.type, coordinates: geometry.type === 'Polygon' ? localPolygons[0] : localPolygons } : undefined,
          status: b.flag_status === 'flagged' || b.flag_status === 'under_review' ? 'DISPUTED' : 'ACTIVE',
          flaggedReason: b.flag_reason || undefined,
        };
      });
      setParcels([parcel]); setSelectedParcel(parcel); setBuildings(mappedBuildings);
      const building = mappedBuildings[0] || null;
      setSelectedBuilding(building);
      if (!building) { setFloors([]); setSelectedFloor(null); setFlats([]); setSelectedFlat(null); setCitizenFlats([]); return; }
      const rawFloors = await request<any[]>(`/citizen/parcels/${encodeURIComponent(targetParcelUlpin)}/features/${building.id}/floors`);
      const mappedFloors: Floor[] = rawFloors.map((f) => ({
        id: String(f.id), buildingId: building.id, floorNumber: f.floor_number,
        floorLabel: f.floor_label, heightOffset: f.elevation_base_m,
        heightTop: f.elevation_top_m, heightM: f.height_m,
        area: building.area, flatsCount: f.flat_count,
        status: f.flag_status === 'flagged' || f.flag_status === 'under_review' ? 'PENDING_APPROVAL' : 'VERIFIED',
        ulpin: f.floor_ulpin || '', flagStatus: f.flag_status, flagReason: f.flag_reason,
      }));
      setFloors(mappedFloors); setSelectedFloor(mappedFloors[0] || null);
      const mappedFlats: Flat[] = rawFloors.flatMap((f) => f.flats || []).map((f: any) => ({
        id: String(f.id), floorId: String(f.floor_id), buildingId: building.id,
        flatNumber: f.unit_number, area: f.area_sqm || 0, type: f.unit_type || 'Unit',
        ulpin: f.unit_ulpin || '', ownerStatus: f.owner_name || 'Owner details withheld',
        status: 'CLEAR',
      }));
      setCitizenFlats(mappedFlats);
      const firstFloorFlats = mappedFlats.filter((flat) => flat.floorId === (mappedFloors[0]?.id || ''));
      setFlats(firstFloorFlats);
      setSelectedFlat(firstFloorFlats[0] || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load live citizen parcel data');
      throw err;
    } finally { setLoading(false); }
  };

  const selectBuilding = async (id: string | null) => {
    cadastralAudio.playSelect();
    if (!id) {
      setSelectedBuilding(null);
      setFloors([]);
      setSelectedFloor(null);
      setFlats([]);
      setSelectedFlat(null);
      return;
    }
    const bldg = buildings.find((b) => b.id === id) || null;
    setSelectedBuilding(bldg);
    if (bldg) {
      if (user?.role === 'Citizen' && citizenParcelUlpin) {
        const rows = await request<any[]>(
          `/citizen/parcels/${encodeURIComponent(citizenParcelUlpin)}/features/${bldg.id}/floors`
        );
        const citizenFloors: Floor[] = rows.map((f) => ({
          id: String(f.id), buildingId: bldg.id, floorNumber: f.floor_number,
          floorLabel: f.floor_label, heightOffset: f.elevation_base_m,
          heightTop: f.elevation_top_m, heightM: f.height_m,
          area: bldg.area, flatsCount: f.flat_count,
          status: f.flag_status === 'flagged' || f.flag_status === 'under_review' ? 'PENDING_APPROVAL' : 'VERIFIED',
          ulpin: f.floor_ulpin || '', flagStatus: f.flag_status, flagReason: f.flag_reason,
        }));
        const rowsFlats: Flat[] = rows.flatMap((f) => f.flats || []).map((f: any) => ({
          id: String(f.id), floorId: String(f.floor_id), buildingId: bldg.id,
          flatNumber: f.unit_number, area: f.area_sqm || 0, type: f.unit_type || 'Unit',
          ulpin: f.unit_ulpin || '', ownerStatus: f.owner_name || 'Owner details withheld',
          status: 'CLEAR',
        }));
        setFloors(citizenFloors);
        setCitizenFlats(rowsFlats);
        const initialFloor = citizenFloors.find((floor) => floor.floorLabel === '7') || citizenFloors[0] || null;
        setSelectedFloor(initialFloor);
        const initialFlats = rowsFlats.filter((flat) => flat.floorId === initialFloor?.id);
        setFlats(initialFlats);
        setSelectedFlat(initialFlats[0] || null);
        return;
      }
      const flrs = await floorService.getFloorsByBuilding(bldg.id);
      setFloors(flrs);
      if (flrs.length > 0) {
        const f = flrs.find((fl) => fl.floorLabel === '7') || flrs[0];
        setSelectedFloor(f);
        const flts = await flatService.getFlatsByFloor(f.id);
        setFlats(flts);
        setSelectedFlat(flts[0] || null);
      } else {
        setSelectedFloor(null);
        setFlats([]);
        setSelectedFlat(null);
      }
    }
  };

  const selectFloor = async (id: string | null) => {
    cadastralAudio.playSelect();
    if (!id) {
      setSelectedFloor(null);
      setFlats([]);
      setSelectedFlat(null);
      return;
    }
    const flr = floors.find((f) => f.id === id) || null;
    setSelectedFloor(flr);
    setShowFloorsExploded(true); // Automatically separate floors visually when a floor is clicked
    if (explosionFactor === 0) {
      setExplosionFactor(0.8);
    }
    if (flr) {
      const flts = user?.role === 'Citizen'
        ? citizenFlats.filter((flat) => flat.floorId === flr.id)
        : await flatService.getFlatsByFloor(flr.id);
      setFlats(flts);
      setSelectedFlat(flts[0] || null);
    }
  };

  const selectFlat = async (id: string | null) => {
    cadastralAudio.playSelect();
    if (!id) {
      setSelectedFlat(null);
      return;
    }
    const flt = flats.find((f) => f.id === id) || null;
    setSelectedFlat(flt);
  };

  const stepUpHierarchy = () => {
    if (selectedFlat) {
      setSelectedFlat(null);
    } else if (selectedFloor) {
      setSelectedFloor(null);
      setShowFloorsExploded(false);
    } else if (selectedBuilding) {
      setSelectedBuilding(null);
    }
  };

  const resetSelection = () => {
    if (parcels.length > 0) {
      setSelectedParcel(parcels[0]);
    }
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setSelectedFlat(null);
    setShowFloorsExploded(false);
    resetCamera();
  };

  const toggleGrid = () => {
    cadastralAudio.playSelect();
    setShowGrid((prev) => !prev);
  };
  const toggleBuildings = () => {
    cadastralAudio.playSelect();
    setShowBuildings((prev) => !prev);
  };
  const toggleFloorsExploded = () => {
    setShowFloorsExploded((prev) => {
      const next = !prev;
      cadastralAudio.playFloorExplode(next);
      if (next && explosionFactor === 0) {
        setExplosionFactor(0.8);
      } else if (!next) {
        setExplosionFactor(0);
      }
      return next;
    });
  };
  const toggleScanning = () => {
    cadastralAudio.playSelect();
    setShowScanning((prev) => !prev);
  };
  const resetCamera = () => {
    cadastralAudio.playSelect();
    setCinematicOrbit(false);
    setCameraResetTrigger((prev) => prev + 1);
  };

  const [lastActionFeedback, setLastActionFeedback] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  const clearFeedback = () => setLastActionFeedback(null);

  const autoAssign3DUlpinAllBuildings = async () => {
    cadastralAudio.playSuccess();
    const result = await surveyService.autoAssign3DUlpinAllBuildings(buildings);
    setBuildings(result.buildings);
    if (selectedBuilding) {
      const updatedSel = result.buildings.find((b) => b.id === selectedBuilding.id);
      if (updatedSel) setSelectedBuilding(updatedSel);
    }
    setLastActionFeedback({
      message: `Successfully generated and auto-assigned 14-digit Survey of India 3D ULPINs to all ${result.updatedCount} buildings.`,
      type: 'success',
    });
    return { updatedCount: result.updatedCount };
  };

  const autoFlagBuildingsForApproval = async () => {
    cadastralAudio.playSelect();
    const result = await surveyService.autoFlagBuildingsForApproval(buildings);
    setBuildings(result.buildings);
    if (selectedBuilding) {
      const updatedSel = result.buildings.find((b) => b.id === selectedBuilding.id);
      if (updatedSel) setSelectedBuilding(updatedSel);
    }
    setLastActionFeedback({
      message: `Auto-flagged ${result.flaggedCount} buildings for surveyor verification & statutory sanction approval. Records submitted to surveyor queue.`,
      type: 'warning',
    });
    return { flaggedCount: result.flaggedCount };
  };

  return (
    <CadastralContext.Provider
      value={{
        themeId,
        currentTheme,
        setTheme: handleSetTheme,
        cycleTheme,
        parcels,
        selectedParcel,
        buildings,
        selectedBuilding,
        floors,
        selectedFloor,
        flats,
        selectedFlat,
        loading,
        error,
        showGrid,
        showBuildings,
        showFloorsExploded,
        showScanning,
        cameraResetTrigger,
        visualMode,
        cinematicOrbit,
        cameraPreset,
        explosionFactor,
        measurementMode,
        measurePoints,
        sunHour,
        soundEnabled,
        viewerShape,
        globeSurfing,
        surfSpeed,
        showGlobeAtmosphere,
        autoAssign3DUlpinAllBuildings,
        autoFlagBuildingsForApproval,
        lastActionFeedback,
        clearFeedback,
        selectParcel,
        selectBuilding,
        selectFloor,
        selectFlat,
        stepUpHierarchy,
        resetSelection,
        toggleGrid,
        toggleBuildings,
        toggleFloorsExploded,
        toggleScanning,
        resetCamera,
        setVisualMode,
        setCinematicOrbit,
        setCameraPreset,
        setExplosionFactor,
        setMeasurementMode,
        addMeasurePoint,
        clearMeasurement,
        setSunHour,
        toggleSound,
        setViewerShape,
        toggleViewerShape,
        setGlobeSurfing,
        toggleGlobeSurfing,
        setSurfSpeed,
        setShowGlobeAtmosphere,
        refreshData: loadInitialData,
        loadCitizenParcel,
      }}
    >
      {children}
    </CadastralContext.Provider>
  );
};

export function useCadastral(): CadastralContextType {
  const context = useContext(CadastralContext);
  if (!context) {
    throw new Error('useCadastral must be used within a CadastralProvider');
  }
  return context;
}
