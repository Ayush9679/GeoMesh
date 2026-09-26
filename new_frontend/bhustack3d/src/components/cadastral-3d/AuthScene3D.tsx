import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Lightweight, self-contained Three.js scene used as an ambient background
 * on authentication pages (Login / Signup). Does not depend on
 * CadastralContext so it can render safely wherever it's mounted.
 */

const GlobeMesh: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.09;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0001) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Wireframe graticule sphere */}
      <mesh>
        <sphereGeometry args={[2.3, 28, 28]} />
        <meshBasicMaterial color="#38BDF8" wireframe transparent opacity={0.4} />
      </mesh>
      {/* Soft inner core */}
      <mesh>
        <sphereGeometry args={[2.15, 24, 24]} />
        <meshStandardMaterial color="#0B1F33" transparent opacity={0.55} roughness={0.6} />
      </mesh>
      {/* Equatorial ring */}
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[2.7, 0.012, 8, 96]} />
        <meshBasicMaterial color="#60A5FA" transparent opacity={0.45} />
      </mesh>
    </group>
  );
};

interface ParcelPlaneProps {
  position: [number, number, number];
  rotationSpeed: number;
  color: string;
  size?: number;
}

const ParcelPlane: React.FC<ParcelPlaneProps> = ({ position, rotationSpeed, color, size = 0.9 }) => {
  const ref = useRef<THREE.Mesh>(null);
  const baseY = position[1];
  const phase = position[0];

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * rotationSpeed;
      ref.current.rotation.x += delta * rotationSpeed * 0.4;
      ref.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.6 + phase) * 0.18;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.55} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Particles: React.FC = () => {
  const count = 260;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#38BDF8" size={0.035} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
};

export const AuthScene3D: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[6, 4, 6]} intensity={0.9} color="#38BDF8" />
      <pointLight position={[-6, -3, -4]} intensity={0.4} color="#22C55E" />

      <Particles />
      <GlobeMesh />

      <ParcelPlane position={[-3.4, 1.6, -1.2]} rotationSpeed={0.3} color="#22C55E" />
      <ParcelPlane position={[3.6, -1.3, -2]} rotationSpeed={-0.25} color="#38BDF8" size={0.7} />
      <ParcelPlane position={[2.8, 2.2, -3.2]} rotationSpeed={0.2} color="#60A5FA" size={0.6} />
      <ParcelPlane position={[-2.9, -2.0, -2.6]} rotationSpeed={-0.35} color="#38BDF8" size={0.75} />
    </Canvas>
  );
};
