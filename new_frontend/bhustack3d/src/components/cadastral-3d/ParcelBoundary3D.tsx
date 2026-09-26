import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Parcel } from '../../types';

interface ParcelBoundary3DProps {
  parcel: Parcel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  position?: [number, number, number];
  size?: [number, number];
}

export const ParcelBoundary3D: React.FC<ParcelBoundary3DProps> = ({
  parcel,
  isSelected,
  onSelect,
  position = [0, 0.05, 0],
  size = [74, 58],
}) => {
  const [hovered, setHovered] = useState(false);

  // Cadastral boundary coordinates
  const halfW = size[0] / 2;
  const halfH = size[1] / 2;

  const points = React.useMemo(() => {
    return [
      new THREE.Vector3(-halfW, 0, -halfH),
      new THREE.Vector3(halfW, 0, -halfH),
      new THREE.Vector3(halfW, 0, halfH),
      new THREE.Vector3(-halfW, 0, halfH),
      new THREE.Vector3(-halfW, 0, -halfH),
    ];
  }, [halfW, halfH]);

  const lineGeometry = React.useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const lineMesh = React.useMemo(() => {
    const lineMat = new THREE.LineBasicMaterial({
      color: isSelected ? 0x38bdf8 : hovered ? 0x93c5fd : 0x243b53,
      linewidth: isSelected ? 2 : 1,
    });
    return new THREE.Line(lineGeometry, lineMat);
  }, [lineGeometry, isSelected, hovered]);

  return (
    <group position={position}>
      {/* Interactive ground boundary surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(parcel.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[size[0], size[1]]} />
        <meshBasicMaterial
          color={isSelected ? '#38BDF8' : hovered ? '#60A5FA' : '#142D48'}
          transparent
          opacity={isSelected ? 0.22 : hovered ? 0.15 : 0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Cadastral Boundary Line */}
      <primitive object={lineMesh} />

      {/* Boundary Corner Survey Peg Markers */}
      {points.slice(0, 4).map((pt, idx) => (
        <mesh key={`peg-${idx}`} position={[pt.x, 0.2, pt.z]}>
          <boxGeometry args={[0.6, 0.4, 0.6]} />
          <meshStandardMaterial
            color={isSelected ? '#38BDF8' : '#64748B'}
            emissive={isSelected ? '#38BDF8' : '#000000'}
            emissiveIntensity={isSelected ? 0.5 : 0}
          />
        </mesh>
      ))}

      {/* Identification Marker HUD tag */}
      <Html position={[halfW - 6, 0.5, -halfH + 4]} center distanceFactor={45}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(parcel.id);
          }}
          className={`pointer-events-auto cursor-pointer transition-all duration-200 select-none px-2.5 py-1 rounded text-xs font-mono border ${
            isSelected
              ? 'bg-[#10253D]/90 text-[#38BDF8] border-[#38BDF8] shadow-lg shadow-[#38BDF8]/20'
              : 'bg-[#071426]/80 text-[#94A3B8] border-[#243B53] hover:border-[#60A5FA] hover:text-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#38BDF8] animate-pulse' : 'bg-[#64748B]'}`} />
            <span className="font-semibold">{parcel.ulpin}</span>
          </div>
        </div>
      </Html>
    </group>
  );
};
