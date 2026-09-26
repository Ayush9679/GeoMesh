import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCadastral } from '../../context/CadastralContext';

interface GroundGridProps {
  showScanning?: boolean;
}

export const GroundGrid: React.FC<GroundGridProps> = ({ showScanning = true }) => {
  const { visualMode, currentTheme } = useCadastral();
  const scanLineRef = useRef<THREE.Mesh>(null);
  const sonarRingRef = useRef<THREE.Mesh>(null);
  const scanZ = useRef(-35);
  const sonarRadius = useRef(0);

  useFrame((_, delta) => {
    if (showScanning && scanLineRef.current) {
      scanZ.current += delta * 15;
      if (scanZ.current > 35) {
        scanZ.current = -35;
      }
      scanLineRef.current.position.z = scanZ.current;
    }

    if (showScanning && sonarRingRef.current) {
      sonarRadius.current += delta * 12;
      if (sonarRadius.current > 42) {
        sonarRadius.current = 1;
      }
      const scale = sonarRadius.current / 42;
      sonarRingRef.current.scale.set(sonarRadius.current, sonarRadius.current, 1);
      (sonarRingRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - scale) * 0.45);
    }
  });

  const isDaylight = visualMode === 'daylight';
  const isXray = visualMode === 'xray';

  const groundColor = isDaylight ? '#F1F5F9' : isXray ? '#040D1A' : currentTheme.colors.bgSecondary;
  const gridPrimary = isDaylight ? '#64748B' : isXray ? '#38BDF8' : currentTheme.colors.accentPrimary;
  const gridSecondary = isDaylight ? '#CBD5E1' : isXray ? '#0F2744' : currentTheme.colors.borderColor;
  const ringColor = isDaylight ? '#94A3B8' : currentTheme.colors.borderColor;
  const accentColor = currentTheme.colors.accentPrimary;
  const secondaryAccent = currentTheme.colors.accentSecondary;

  return (
    <group position={[0, -0.05, 0]}>
      {/* Primary GIS Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[130, 130]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={0.9}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Cadastral Primary Grid */}
      <gridHelper
        args={[110, 55, gridPrimary, gridSecondary]}
        position={[0, 0.01, 0]}
      />

      {/* Concentric Elevation / Survey Radius Rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[19.9, 20.1, 64]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[39.9, 40.1, 64]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Expanding Sonar Radar Wave */}
      {showScanning && (
        <mesh
          ref={sonarRingRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.035, 0]}
        >
          <ringGeometry args={[0.96, 1.0, 64]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Axis Coordinate Crosshair Marks */}
      {[-30, -15, 0, 15, 30].map((coord) => (
        <group key={`tick-x-${coord}`} position={[coord, 0.03, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.35, 1.4]} />
            <meshBasicMaterial color={secondaryAccent} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
      {[-30, -15, 15, 30].map((coord) => (
        <group key={`tick-z-${coord}`} position={[0, 0.03, coord]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.4, 0.35]} />
            <meshBasicMaterial color={secondaryAccent} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* Active LiDAR / Drone Scanning Laser Bar with Volumetric Beam Plane */}
      {showScanning && (
        <group ref={scanLineRef} position={[0, 0.04, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[80, 0.8]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Vertical Scanner Light Sheet */}
          <mesh position={[0, 10, 0]}>
            <planeGeometry args={[80, 20]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

