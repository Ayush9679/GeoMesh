import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CitizenFloorResponse, FloorResponse, CitizenBuildingResponse, FeatureDetailResponse } from '../../services/api';

interface BuildingStrataHologramProps {
  building: CitizenBuildingResponse | FeatureDetailResponse;
  floors: (CitizenFloorResponse | FloorResponse)[];
  activeFloorId?: number | null;
  onSelectFloor?: (floorId: number) => void;
  height?: number | string;
}

// ─── Single Floor Slab ───────────────────────────────────────────────────────
function FloorSlab({
  floor,
  isActive,
  isFlagged,
  width,
  depth,
  onSelect,
}: {
  floor: CitizenFloorResponse | FloorResponse;
  isActive: boolean;
  isFlagged: boolean;
  width: number;
  depth: number;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const baseM = floor.elevation_base_m ?? (floor.floor_number * 3.0);
  const topM = floor.elevation_top_m ?? ((floor.floor_number + 1) * 3.0);
  const heightM = Math.max(0.4, topM - baseM);
  const centerY = baseM + heightM / 2;

  // Scale down meters to Three.js world units (1 unit = 3 meters for convenient viewing)
  const SCALE = 0.5;
  const slabH = heightM * SCALE;
  const posY = centerY * SCALE;
  const slabW = width * SCALE;
  const slabD = depth * SCALE;

  const boxGeo = useMemo(() => new THREE.BoxGeometry(slabW, slabH * 0.94, slabD), [slabW, slabH, slabD]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(boxGeo), [boxGeo]);

  // Gentle breathing animation for active / flagged floors
  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (isActive) {
      mat.emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 3.5) * 0.2;
    } else if (isFlagged) {
      mat.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
    } else if (hovered) {
      mat.emissiveIntensity = 0.45;
    } else {
      mat.emissiveIntensity = 0.2;
    }
  });

  // Color logic
  let bodyColor = 0x0284c7;
  let emissiveColor = 0x0369a1;
  let edgeColor = 0x38bdf8;
  let opacity = 0.28;

  if (isActive) {
    bodyColor = 0x00f2ff;
    emissiveColor = 0x00f2ff;
    edgeColor = 0xffffff;
    opacity = 0.62;
  } else if (isFlagged) {
    bodyColor = 0xf59e0b;
    emissiveColor = 0xd97706;
    edgeColor = 0xfbbf24;
    opacity = 0.45;
  } else if (hovered) {
    bodyColor = 0x38bdf8;
    emissiveColor = 0x0284c7;
    edgeColor = 0x7dd3fc;
    opacity = 0.42;
  }

  return (
    <group position={[0, posY, 0]}>
      {/* 3D Floor Volume */}
      <mesh
        ref={meshRef}
        geometry={boxGeo}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={bodyColor}
          emissive={new THREE.Color(emissiveColor)}
          emissiveIntensity={0.2}
          transparent
          opacity={opacity}
          roughness={0.12}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe Outline */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color={edgeColor}
          transparent
          opacity={isActive ? 0.95 : hovered ? 0.8 : 0.45}
        />
      </lineSegments>

      {/* Floor Divider Slab Plate */}
      <mesh position={[0, -(slabH * 0.94) / 2, 0]}>
        <boxGeometry args={[slabW * 1.02, 0.04, slabD * 1.02]} />
        <meshBasicMaterial color={isActive ? 0x00f2ff : 0x0f172a} />
      </mesh>

      {/* Floor Label & Measurement Overlay */}
      {(isActive || hovered || isFlagged) && (
        <Html position={[slabW / 2 + 0.3, 0, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: isFlagged
                ? 'rgba(239, 68, 68, 0.9)'
                : isActive
                ? 'rgba(2, 132, 199, 0.9)'
                : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${isFlagged ? '#f87171' : isActive ? '#38bdf8' : '#64748b'}`,
              backdropFilter: 'blur(6px)',
              whiteSpace: 'nowrap',
              color: '#ffffff',
              fontSize: '11px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{floor.floor_label || `Level ${floor.floor_number}`}</span>
              <span style={{ fontSize: '9px', opacity: 0.8, fontFamily: 'monospace' }}>
                {baseM >= 0 ? '+' : ''}{baseM.toFixed(1)}m → {topM >= 0 ? '+' : ''}{topM.toFixed(1)}m
              </span>
            </div>
            {isFlagged && (
              <div style={{ fontSize: '9px', color: '#fef08a' }}>
                ⚠ AI Flagged: {floor.flag_reason || 'Anomaly detected'}
              </div>
            )}
            {floor.floor_ulpin && (
              <div style={{ fontSize: '8.5px', fontFamily: 'monospace', opacity: 0.9 }}>
                {floor.floor_ulpin}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Base Grid & Ground Reference ───────────────────────────────────────────
function GroundBase({ width, depth }: { width: number; depth: number }) {
  const SCALE = 0.5;
  const gridW = Math.max(12, width * SCALE * 2.5);
  const gridD = Math.max(12, depth * SCALE * 2.5);

  return (
    <group position={[0, -0.02, 0]}>
      <gridHelper args={[gridW, 16, 0x0284c7, 0x0f2744]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[gridW, gridD]} />
        <meshBasicMaterial color={0x030712} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

export default function BuildingStrataHologram({
  building,
  floors,
  activeFloorId,
  onSelectFloor,
  height = 340,
}: BuildingStrataHologramProps) {
  // Sort floors ascending by floor_number
  const sortedFloors = useMemo(() => {
    return [...floors].sort((a, b) => a.floor_number - b.floor_number);
  }, [floors]);

  // Approximate building dimensions from area or default
  const area = building.area || 200;
  const side = Math.max(6, Math.sqrt(area));
  const width = Math.min(18, side);
  const depth = Math.min(18, side);

  return (
    <div
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 35%, rgba(6, 32, 58, 0.95), rgba(2, 6, 23, 1))',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        position: 'relative',
      }}
    >
      {/* Holographic Header HUD */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 14,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.08em' }}>
            3D STRATA ENVELOPE SLICER
          </span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
          {building.feature_name || `Building #${building.id}`}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>
          {sortedFloors.length} Sliced Floor Slabs · Standard 3.0m Elevation Intervals
        </div>
      </div>

      {/* Quick Controls Info */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 14,
          zIndex: 10,
          fontSize: 10,
          color: '#64748b',
          pointerEvents: 'none',
          fontFamily: 'monospace',
        }}
      >
        Rotate: Drag · Zoom: Scroll · Click slab to inspect
      </div>

      <Canvas
        camera={{ position: [9, 8, 12], fov: 42 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[10, 20, 15]} intensity={1.8} color={0xe0f2fe} />
        <pointLight position={[-10, 10, -10]} intensity={0.6} color={0x0284c7} />
        <pointLight position={[0, 15, 0]} intensity={1.2} color={0x38bdf8} />

        <GroundBase width={width} depth={depth} />

        {/* Render Floor Slabs */}
        {sortedFloors.map((fl) => (
          <FloorSlab
            key={fl.id}
            floor={fl}
            isActive={activeFloorId === fl.id}
            isFlagged={fl.flag_status === 'flagged'}
            width={width}
            depth={depth}
            onSelect={() => onSelectFloor?.(fl.id)}
          />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={35}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  );
}
