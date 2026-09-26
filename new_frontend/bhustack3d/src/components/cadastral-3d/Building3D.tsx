import React, { useState, useRef, useMemo } from 'react';
import { Html, Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Building, Floor, Flat } from '../../types';
import { useCadastral } from '../../context/CadastralContext';
import { Home, ShieldCheck, Layers, ArrowUpRight } from 'lucide-react';

interface Building3DProps {
  building: Building;
  isSelected: boolean;
  selectedFloor: Floor | null;
  selectedFlat: Flat | null;
  floors: Floor[];
  flats: Flat[];
  showExploded: boolean;
  onSelectBuilding: (id: string) => void;
  onSelectFloor: (id: string) => void;
  onSelectFlat: (id: string) => void;
}

export const Building3D: React.FC<Building3DProps> = ({
  building,
  isSelected,
  selectedFloor,
  selectedFlat,
  floors,
  flats,
  showExploded,
  onSelectBuilding,
  onSelectFloor,
  onSelectFlat,
}) => {
  const { visualMode, explosionFactor } = useCadastral();
  const [hoveredFloorId, setHoveredFloorId] = useState<string | null>(null);
  const [hoveredFlatId, setHoveredFlatId] = useState<string | null>(null);

  const [bx, by, bz] = building.position;
  const [bw, totalHeight, bd] = building.dimensions;
  const footprintShapes = useMemo(() => {
    const geometry = building.footprint;
    if (!geometry) return [] as THREE.Shape[];
    const polygons: any[] = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates as any[];
    return polygons.map((rings) => {
      const outer = rings[0] || [];
      const shape = new THREE.Shape();
      outer.forEach((point: number[], index: number) => {
        const x = point[0]; const y = -point[1];
        if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      });
      rings.slice(1).forEach((ring: number[][]) => {
        const hole = new THREE.Path();
        ring.forEach((point, index) => {
          const x = point[0]; const y = -point[1];
          if (index === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
        });
        shape.holes.push(hole);
      });
      return shape;
    });
  }, [building.footprint]);

  // Animated elevator cab and rooftop aviation beacon light
  const elevatorCabRef = useRef<THREE.Mesh>(null);
  const beaconLightRef = useRef<THREE.PointLight>(null);
  const beaconMeshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    // Elevator movement up and down inside core
    if (elevatorCabRef.current) {
      const t = state.clock.elapsedTime * 0.8;
      const elevY = (Math.sin(t) * 0.45 + 0.5) * (totalHeight * 0.85) + 1;
      elevatorCabRef.current.position.y = elevY;
    }
    // FAA rooftop beacon blinking
    if (beaconLightRef.current && beaconMeshRef.current) {
      const isBlink = Math.sin(state.clock.elapsedTime * 4) > 0.3;
      beaconLightRef.current.intensity = isBlink ? 2.5 : 0.2;
      (beaconMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(
        isBlink ? 0xef4444 : 0x7f1d1d
      );
    }
  });

  // Render floors list
  const floorList = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);

  const floorThickness = totalHeight / Math.max(floorList.length, 1);
  const effectiveExplosion = showExploded ? Math.max(0.6, explosionFactor || 0.8) : (explosionFactor || 0);

  const isDaylight = visualMode === 'daylight';
  const isXray = visualMode === 'xray';

  return (
    <group position={[bx, by, bz]}>
      {/* 1. CENTRAL STRUCTURAL / ELEVATOR CORE */}
      {!building.footprint && <group position={[0, 0, 0]}>
        {/* Core shaft column */}
        <mesh position={[0, totalHeight / 2, 0]} castShadow>
          <boxGeometry args={[bw * 0.28, totalHeight, bd * 0.28]} />
          <meshStandardMaterial
            color={isDaylight ? '#475569' : isXray ? '#0A2540' : '#0E2439'}
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={isXray ? 0.4 : 0.85}
          />
          <Edges color={isDaylight ? '#94A3B8' : '#38BDF8'} threshold={15} />
        </mesh>

        {/* Animated Internal Elevator Cab */}
        <mesh ref={elevatorCabRef} position={[0, 4, 0]}>
          <boxGeometry args={[bw * 0.18, floorThickness * 0.7, bd * 0.18]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.75} />
        </mesh>
      </group>}

      {/* 2. ROOFTOP HELIPAD & FAA AVIATION BEACON */}
      {!building.footprint && <group position={[0, totalHeight + (effectiveExplosion > 0 ? (floorList.length - 1) * floorThickness * effectiveExplosion : 0), 0]}>
        {/* Helipad deck */}
        <mesh position={[0, 0.2, 0]} receiveShadow>
          <boxGeometry args={[bw * 0.85, 0.4, bd * 0.85]} />
          <meshStandardMaterial
            color={isDaylight ? '#334155' : '#0B1F33'}
            roughness={0.8}
          />
          <Edges color={isDaylight ? '#CBD5E1' : '#38BDF8'} />
        </mesh>

        {/* Helipad 'H' Circle Marking */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]}>
          <ringGeometry args={[bw * 0.22, bw * 0.26, 32]} />
          <meshBasicMaterial color={isDaylight ? '#FBBF24' : '#38BDF8'} side={THREE.DoubleSide} />
        </mesh>

        {/* Rooftop Antenna Mast with FAA Blinking Beacon */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 5, 8]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} />
        </mesh>
        <mesh ref={beaconMeshRef} position={[0, 5.1, 0]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
        <pointLight ref={beaconLightRef} position={[0, 5.1, 0]} color="#EF4444" distance={25} />
      </group>}

      {floorList.length === 0 && footprintShapes.map((shape, index) => (
        <mesh key={`mass-${index}`} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelectBuilding(building.id); }} castShadow receiveShadow>
          <extrudeGeometry args={[shape, { depth: Math.max(1, totalHeight), bevelEnabled: false }]} />
          <meshStandardMaterial color={building.status === 'DISPUTED' ? '#F59E0B' : '#10253D'} transparent opacity={0.78} metalness={0.4} roughness={0.3} />
          <Edges color={building.status === 'DISPUTED' ? '#FBBF24' : '#38BDF8'} />
        </mesh>
      ))}

      {/* 3. VERTICAL FLOOR STRATA STACK */}
      {floorList.map((flr, index) => {
        const isFloorActive = isSelected && selectedFloor?.id === flr.id;
        const isHovered = hoveredFloorId === flr.id;
        const isBasement = flr.floorNumber < 0;
        const slabThickness = Math.max(0.4, flr.heightM || floorThickness);
        const isFlagged = ['flagged', 'under_review'].includes(flr.flagStatus || '') || flr.status === 'PENDING_APPROVAL';

        // Dynamic vertical exploded offset
        let yOffset = flr.heightOffset + slabThickness / 2;
        if (effectiveExplosion > 0 || (isSelected && selectedFloor)) {
          yOffset += index * floorThickness * effectiveExplosion;
          if (isFloorActive) {
            yOffset += 1.8; // Lift and isolate active floor plate
          }
        }

        // Ghost mode for non-active floors when a floor is active
        const hasFloorIsolation = !!selectedFloor && isSelected;
        const isGhost = hasFloorIsolation && !isFloorActive;

        // Visual floor material styling
        const floorColor = isFlagged
          ? '#F59E0B'
          : isFloorActive
          ? '#38BDF8'
          : isHovered
          ? '#60A5FA'
          : isBasement
          ? '#1E293B'
          : isSelected
          ? '#142D48'
          : isDaylight
          ? '#F1F5F9'
          : isXray
          ? '#081B2F'
          : '#10253D';

        const floorOpacity = isFloorActive
          ? 0.92
          : isGhost
          ? 0.18
          : isSelected
          ? 0.75
          : isDaylight
          ? 0.85
          : isXray
          ? 0.35
          : 0.7;

        return (
          <group key={flr.id} position={[0, yOffset - slabThickness / 2, 0]}>
            {/* Floor Volume Mesh */}
            {footprintShapes.length > 0 ? footprintShapes.map((shape, shapeIndex) => <mesh
              key={`${flr.id}-${shapeIndex}`}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => { e.stopPropagation(); onSelectBuilding(building.id); onSelectFloor(flr.id); }}
              onPointerOver={(e) => { e.stopPropagation(); setHoveredFloorId(flr.id); }}
              onPointerOut={() => setHoveredFloorId(null)}
              castShadow receiveShadow
            >
              <extrudeGeometry args={[shape, { depth: slabThickness * 0.88, bevelEnabled: false }]} />
              <meshStandardMaterial color={floorColor} transparent opacity={floorOpacity} depthWrite={!isGhost} roughness={isDaylight ? 0.15 : 0.25} metalness={isDaylight ? 0.6 : 0.4} />
              <Edges threshold={15} color={isFlagged ? '#FBBF24' : isFloorActive ? '#FFFFFF' : '#38BDF8'} />
            </mesh>) : <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectBuilding(building.id);
                onSelectFloor(flr.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredFloorId(flr.id);
              }}
              onPointerOut={() => setHoveredFloorId(null)}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[bw, slabThickness * 0.88, bd]} />
              <meshStandardMaterial
                color={floorColor}
                roughness={isDaylight ? 0.15 : 0.25}
                metalness={isDaylight ? 0.6 : 0.4}
                transparent
                opacity={floorOpacity}
                depthWrite={!isGhost}
              />
              <Edges
                threshold={15}
                color={
                  isFloorActive
                    ? '#FFFFFF'
                    : isFlagged
                    ? '#FBBF24'
                    : isGhost
                    ? '#1E3A5F'
                    : isSelected
                    ? '#38BDF8'
                    : isDaylight
                    ? '#64748B'
                    : '#243B53'
                }
              />
            </mesh>}

            {/* Subdivided Flats on Active Floor */}
            {isFloorActive && flats.length > 0 && (
              <group position={[0, 0, 0]}>
                {flats.map((flat, fIdx) => {
                  const isFlatActive = selectedFlat?.id === flat.id;
                  const isFlatHovered = hoveredFlatId === flat.id;

                  // 6 spatial sections across floor
                  const cols = 3;
                  const col = fIdx % cols;
                  const row = Math.floor(fIdx / cols);

                  const flatW = (bw * 0.92) / cols;
                  const flatD = (bd * 0.92) / 2;
                  const fx = -bw * 0.46 + flatW * (col + 0.5);
                  const fz = -bd * 0.46 + flatD * (row + 0.5);

                  return (
                    <group key={flat.id} position={[fx, 0.05, fz]}>
                      {/* Flat Volume Mesh */}
                      <mesh
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFlat(flat.id);
                        }}
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          setHoveredFlatId(flat.id);
                        }}
                        onPointerOut={() => setHoveredFlatId(null)}
                      >
                        <boxGeometry args={[flatW * 0.88, floorThickness * 0.82, flatD * 0.88]} />
                        <meshStandardMaterial
                          color={
                            isFlatActive
                              ? '#22C55E'
                              : isFlatHovered
                              ? '#60A5FA'
                              : '#38BDF8'
                          }
                          roughness={0.2}
                          metalness={0.6}
                          transparent
                          opacity={isFlatActive ? 0.95 : isFlatHovered ? 0.75 : 0.45}
                          emissive={isFlatActive ? '#22C55E' : isFlatHovered ? '#38BDF8' : '#000000'}
                          emissiveIntensity={isFlatActive ? 0.45 : isFlatHovered ? 0.25 : 0}
                        />
                        <Edges
                          color={isFlatActive ? '#FFFFFF' : isFlatHovered ? '#38BDF8' : '#60A5FA'}
                          threshold={10}
                        />
                      </mesh>

                      {/* Volumetric Hologram Light Pillar on Selected Unit */}
                      {isFlatActive && (
                        <group position={[0, 0, 0]}>
                          {/* Vertical laser light beam extending upward */}
                          <mesh position={[0, 6, 0]}>
                            <cylinderGeometry args={[0.08, 0.08, 12, 8]} />
                            <meshBasicMaterial color="#22C55E" transparent opacity={0.65} />
                          </mesh>
                          <pointLight color="#22C55E" intensity={2} distance={8} />

                          {/* 3D Unit Annotation Badge */}
                          <Html position={[0, floorThickness + 1.2, 0]} center distanceFactor={35}>
                            <div className="pointer-events-auto bg-[#071426]/95 border border-[#22C55E] rounded-lg px-2.5 py-1.5 shadow-2xl backdrop-blur-md text-xs font-mono select-none flex flex-col gap-0.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-[#22C55E] font-bold">
                                <Home className="w-3.5 h-3.5" />
                                <span>{flat.flatNumber}</span>
                                <span className="text-[10px] px-1 py-0.2 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">
                                  {flat.type}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#94A3B8]">
                                Carpet: {flat.area} m² ({Math.round((flat.area / 1680) * 100)}% Share)
                              </div>
                              <div className="text-[9px] text-[#64748B] flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
                                <span>{flat.ulpin}</span>
                              </div>
                            </div>
                          </Html>
                        </group>
                      )}
                    </group>
                  );
                })}
              </group>
            )}

            {/* Floor Tag Badge on Hover or Active */}
            {(isFloorActive || isHovered) && (
              <Html position={[bw / 2 + 1.4, 0, 0]} distanceFactor={36}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFloor(flr.id);
                  }}
                  className={`pointer-events-auto cursor-pointer text-xs font-mono px-2.5 py-1 rounded-md shadow-xl border whitespace-nowrap select-none transition-all flex items-center gap-1.5 ${
                    isFloorActive
                      ? 'bg-[#38BDF8] text-[#071426] font-bold border-white'
                      : 'bg-[#0B1F33]/95 text-[#38BDF8] border-[#38BDF8]/40 hover:border-[#38BDF8]'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Floor {flr.floorLabel}</span>
                  <span className="opacity-80 text-[10px]">
                    ({flr.flatsCount} Units • {flr.area}m²)
                  </span>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* 4. BUILDING HEADER PIN MARKER */}
      <Html position={[0, totalHeight + (effectiveExplosion > 0 ? 10 : 3.5), 0]} distanceFactor={48} center>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectBuilding(building.id);
          }}
          className={`pointer-events-auto cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-200 select-none shadow-xl ${
            isSelected
              ? 'bg-[#10253D] text-[#38BDF8] border-[#38BDF8] shadow-lg shadow-[#38BDF8]/30 scale-105'
              : 'bg-[#071426]/90 text-[#94A3B8] border-[#243B53] hover:border-[#38BDF8] hover:text-[#F8FAFC]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#38BDF8] animate-ping' : 'bg-[#64748B]'}`} />
          <span className="font-bold">{building.name}</span>
          <span className="text-[10px] text-[#64748B]">
            ({building.floorsCount}F • {building.height}m)
          </span>
          <ArrowUpRight className="w-3 h-3 text-[#38BDF8] opacity-70" />
        </div>
      </Html>
    </group>
  );
};
