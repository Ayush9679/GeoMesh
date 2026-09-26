import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCadastral } from '../../context/CadastralContext';

export const SurroundingLandscape3D: React.FC = () => {
  const { visualMode } = useCadastral();

  // Animated traffic particles along roads
  const trafficRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    // Traffic particles animation
    if (trafficRef.current) {
      trafficRef.current.children.forEach((child, i) => {
        const speed = 12 + (i % 3) * 4;
        const dir = i % 2 === 0 ? 1 : -1;
        child.position.x += delta * speed * dir;
        if (child.position.x > 55) child.position.x = -55;
        if (child.position.x < -55) child.position.x = 55;
      });
    }

    // Beacon laser pulse
    if (pulseRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      pulseRef.current.scale.set(s, 1, s);
    }
  });

  const isDaylight = visualMode === 'daylight';
  const isXray = visualMode === 'xray';

  const roadColor = isDaylight ? '#334155' : '#0B1F33';
  const curbColor = isDaylight ? '#64748B' : '#1E3A5F';
  const roadMarkingColor = isDaylight ? '#FBBF24' : '#38BDF8';
  const treeColor = isDaylight ? '#15803D' : '#059669';

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Surrounding Municipal Road Network (Front Road & Side Avenue) */}
      {/* South Access Highway */}
      <group position={[0, 0.02, 38]}>
        {/* Road Surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[110, 10]} />
          <meshStandardMaterial color={roadColor} roughness={0.8} />
        </mesh>
        {/* Road Curbs */}
        <mesh position={[0, 0.08, -5]}>
          <boxGeometry args={[110, 0.15, 0.4]} />
          <meshStandardMaterial color={curbColor} />
        </mesh>
        <mesh position={[0, 0.08, 5]}>
          <boxGeometry args={[110, 0.15, 0.4]} />
          <meshStandardMaterial color={curbColor} />
        </mesh>
        {/* Center Dashed Road Markings */}
        {[-40, -20, 0, 20, 40].map((rx) => (
          <mesh key={`dash-s-${rx}`} position={[rx, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[7, 0.35]} />
            <meshBasicMaterial color={roadMarkingColor} />
          </mesh>
        ))}
      </group>

      {/* East Arterial Avenue */}
      <group position={[44, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[8, 86]} />
          <meshStandardMaterial color={roadColor} roughness={0.8} />
        </mesh>
        {/* Center Dashed Markings */}
        {[-30, -15, 0, 15, 30].map((rz) => (
          <mesh key={`dash-e-${rz}`} position={[0, 0.03, rz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.35, 6]} />
            <meshBasicMaterial color={roadMarkingColor} />
          </mesh>
        ))}
      </group>

      {/* Animated Traffic Photon Pulses */}
      {!isXray && (
        <group ref={trafficRef} position={[0, 0.25, 38]}>
          <mesh position={[-30, 0, -2]}>
            <boxGeometry args={[1.6, 0.4, 0.8]} />
            <meshBasicMaterial color="#38BDF8" />
          </mesh>
          <mesh position={[10, 0, -2]}>
            <boxGeometry args={[1.8, 0.4, 0.8]} />
            <meshBasicMaterial color="#38BDF8" />
          </mesh>
          <mesh position={[-15, 0, 2]}>
            <boxGeometry args={[1.5, 0.4, 0.8]} />
            <meshBasicMaterial color="#F43F5E" />
          </mesh>
          <mesh position={[35, 0, 2]}>
            <boxGeometry args={[1.8, 0.4, 0.8]} />
            <meshBasicMaterial color="#F43F5E" />
          </mesh>
        </group>
      )}

      {/* 2. Cadastral Green Buffer Corridors (Landscaping & Stylized Trees) */}
      <group position={[-38, 0, 0]}>
        {/* Buffer strip ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <planeGeometry args={[6, 68]} />
          <meshStandardMaterial
            color={isDaylight ? '#14532D' : '#064E3B'}
            roughness={0.9}
          />
        </mesh>
        {/* Stylized Low-Poly Geometric Trees */}
        {[-26, -18, -10, -2, 6, 14, 22].map((tz, i) => (
          <group key={`tree-${i}`} position={[0, 0, tz]}>
            {/* Trunk */}
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.15, 0.2, 1.8, 6]} />
              <meshStandardMaterial color="#78350F" roughness={0.9} />
            </mesh>
            {/* Canopy */}
            <mesh position={[0, 2.4, 0]}>
              <coneGeometry args={[1.1, 2.2, 6]} />
              <meshStandardMaterial
                color={treeColor}
                roughness={0.6}
                transparent={isXray}
                opacity={isXray ? 0.3 : 1}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. Corner Survey Beacon Hologram Towers */}
      {[
        [-37, -29],
        [37, -29],
        [37, 29],
        [-37, 29],
      ].map(([bx, bz], idx) => (
        <group key={`beacon-${idx}`} position={[bx, 0, bz]}>
          {/* Survey Ground Plinth */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.7, 0.9, 0.6, 8]} />
            <meshStandardMaterial
              color="#10253D"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>

          {/* Vertical Laser Light Column */}
          <mesh position={[0, 18, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 36, 8]} />
            <meshBasicMaterial
              color="#38BDF8"
              transparent
              opacity={isDaylight ? 0.25 : 0.65}
            />
          </mesh>

          {/* Glowing Beacon Head */}
          <mesh position={[0, 0.65, 0]}>
            <sphereGeometry args={[0.25, 12, 12]} />
            <meshBasicMaterial color="#38BDF8" />
          </mesh>

          {/* Pulsing Concentric Ground Ring */}
          <mesh
            ref={idx === 0 ? pulseRef : undefined}
            position={[0, 0.04, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[1.2, 1.4, 24]} />
            <meshBasicMaterial
              color="#38BDF8"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Survey Peg Label */}
          <Html position={[0, 1.4, 0]} center distanceFactor={45}>
            <div className="bg-[#071426]/90 text-[#38BDF8] border border-[#38BDF8]/40 px-1 py-0.5 rounded font-mono text-[9px] whitespace-nowrap select-none pointer-events-none shadow-md">
              BM-0{idx + 1}
            </div>
          </Html>
        </group>
      ))}

      {/* 4. Cardinal Direction Ground Compass (North Marker) */}
      <group position={[0, 0.03, -33]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 32]} />
          <meshBasicMaterial color="#0B1F33" transparent opacity={0.6} />
        </mesh>
        {/* North Arrow Pointer */}
        <mesh position={[0, 0.01, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.8, 2, 3]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>
        <Html position={[0, 0.1, -2.6]} center distanceFactor={45}>
          <div className="text-[#38BDF8] font-mono font-extrabold text-[12px] select-none pointer-events-none tracking-widest">
            N
          </div>
        </Html>
      </group>
    </group>
  );
};
