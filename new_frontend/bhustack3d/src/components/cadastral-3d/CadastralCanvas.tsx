import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { GroundGrid } from './GroundGrid';
import { ParcelBoundary3D } from './ParcelBoundary3D';
import { Building3D } from './Building3D';
import { CameraController } from './CameraController';
import { SurroundingLandscape3D } from './SurroundingLandscape3D';
import { MeasurementTool3D } from './MeasurementTool3D';
import { EarthGlobe3D } from './EarthGlobe3D';
import { useCadastral } from '../../context/CadastralContext';

interface CadastralCanvasProps {
  className?: string;
}

export const CadastralCanvas: React.FC<CadastralCanvasProps> = ({ className = 'w-full h-full' }) => {
  const {
    parcels,
    selectedParcel,
    buildings,
    selectedBuilding,
    floors,
    selectedFloor,
    flats,
    selectedFlat,
    showGrid,
    showBuildings,
    showFloorsExploded,
    showScanning,
    cameraResetTrigger,
    visualMode,
    sunHour,
    selectParcel,
    selectBuilding,
    selectFloor,
    selectFlat,
    currentTheme,
  } = useCadastral();

  const isDaylight = visualMode === 'daylight';
  const isXray = visualMode === 'xray';
  const hasLiveFootprints = buildings.some((building) => building.footprint);

  // Compute dynamic sun orbital position & color
  const { sunPos, sunColor, sunIntensity, skyColor, fogColor } = useMemo(() => {
    if (isXray) {
      return {
        sunPos: [30, 50, 30] as [number, number, number],
        sunColor: '#38BDF8',
        sunIntensity: 0.8,
        skyColor: '#030816',
        fogColor: '#030816',
      };
    }

    if (!isDaylight) {
      // Theme-driven night / cyber mode
      return {
        sunPos: [40, 60, 30] as [number, number, number],
        sunColor: currentTheme.colors.accentSecondary,
        sunIntensity: 1.2,
        skyColor: currentTheme.colors.skyColor,
        fogColor: currentTheme.colors.fogColor,
      };
    }

    // Daylight / Sun hour calculation (6am to 8pm)
    const norm = Math.max(0, Math.min(1, (sunHour - 6) / 14));
    const angle = norm * Math.PI;
    const sx = Math.cos(angle) * 65;
    const sy = Math.sin(angle) * 55 + 5;
    const sz = Math.sin(angle * 0.7) * 45;

    // Golden hour colors at dawn/dusk
    const isGolden = sunHour <= 8 || sunHour >= 17;
    const sColor = isGolden ? '#F59E0B' : '#FFFFFF';
    const sIntensity = isGolden ? 1.5 : 1.8;
    const skColor = isGolden ? '#1E1B4B' : currentTheme.id === 'daylight' ? '#E0F2FE' : '#0F172A';

    return {
      sunPos: [sx, sy, sz] as [number, number, number],
      sunColor: sColor,
      sunIntensity: sIntensity,
      skyColor: skColor,
      fogColor: skColor,
    };
  }, [visualMode, sunHour, isDaylight, isXray, currentTheme]);

  return (
    <div className={`relative bg-[#071426] select-none ${className}`}>
      <Canvas
        shadows
        camera={{ position: [45, 38, 55], fov: 42, near: 0.5, far: 10000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {/* Environment Sky Background & Fog */}
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[fogColor, 40, hasLiveFootprints ? 5000 : 210]} />

        {/* Dynamic GIS Lighting Setup */}
        <ambientLight
          color={isDaylight ? '#E2E8F0' : '#60A5FA'}
          intensity={isDaylight ? 0.7 : 0.45}
        />
        <directionalLight
          position={sunPos}
          intensity={sunIntensity}
          color={sunColor}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={10}
          shadow-camera-far={180}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <directionalLight
          position={[-sunPos[0], 25, -sunPos[2]]}
          intensity={0.35}
          color={currentTheme.colors.accentPrimary}
        />
        <hemisphereLight
          args={[
            isDaylight ? '#BAE6FD' : currentTheme.colors.accentPrimary,
            isDaylight ? '#334155' : currentTheme.colors.bgSecondary,
            0.5,
          ]}
        />

        <Suspense fallback={null}>
          {/* Ethereal Floating GIS / Satellite Data Sparkles */}
          <Sparkles
            count={60}
            scale={100}
            size={2.2}
            speed={0.4}
            opacity={isDaylight ? 0.35 : 0.6}
            color={currentTheme.colors.accentPrimary}
          />

          {/* Surrounding Roads, Trees, and Survey Corner Towers */}
          {/* Decorative roads are for the conceptual demo scene. Live cadastral
              footprints already represent a real area and must not be mixed
              with a synthetic road network. */}
          {!hasLiveFootprints && <SurroundingLandscape3D />}

          {/* 3D Planetary Earth Globe with Curved Horizons and Orbital Constellations */}
          {!hasLiveFootprints && <EarthGlobe3D />}

          {/* Ground Grid & Coordinates */}
          {showGrid && <GroundGrid showScanning={showScanning} />}

          {/* 3D Measurement Ruler Tool */}
          <MeasurementTool3D />

          {/* Parcels */}
          {parcels.map((parcel) => (
            <ParcelBoundary3D
              key={parcel.id}
              parcel={parcel}
              isSelected={selectedParcel?.id === parcel.id}
              onSelect={selectParcel}
            />
          ))}

          {/* 3D Buildings with Floor/Flat Stack */}
          {showBuildings &&
            buildings.map((building) => (
              <Building3D
                key={building.id}
                building={building}
                isSelected={selectedBuilding?.id === building.id}
                selectedFloor={selectedBuilding?.id === building.id ? selectedFloor : null}
                selectedFlat={selectedBuilding?.id === building.id ? selectedFlat : null}
                floors={selectedBuilding?.id === building.id ? floors : []}
                flats={selectedBuilding?.id === building.id ? flats : []}
                showExploded={showFloorsExploded}
                onSelectBuilding={selectBuilding}
                onSelectFloor={selectFloor}
                onSelectFlat={selectFlat}
              />
            ))}

          {/* Camera Controller with Presets and Cinematic Drone Orbit */}
        <CameraController
          selectedBuilding={selectedBuilding}
          buildings={buildings}
          cameraResetTrigger={cameraResetTrigger}
        />
        </Suspense>
      </Canvas>
    </div>
  );
};
