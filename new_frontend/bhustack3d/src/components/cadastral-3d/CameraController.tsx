import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Building } from '../../types';
import { useCadastral } from '../../context/CadastralContext';

interface CameraControllerProps {
  selectedBuilding: Building | null;
  buildings: Building[];
  cameraResetTrigger: number;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  selectedBuilding,
  buildings,
  cameraResetTrigger,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const { cinematicOrbit, cameraPreset, globeSurfing, surfSpeed } = useCadastral();

  const isInteractingRef = useRef(false);
  const lastInteractTime = useRef(0);
  const surfAngle = useRef(0.8);

  // Set up interaction listeners on OrbitControls
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onStart = () => {
      isInteractingRef.current = true;
    };
    const onEnd = () => {
      isInteractingRef.current = false;
      lastInteractTime.current = performance.now();
    };

    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);

    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
    };
  }, []);

  // Handle reset
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 8, 0);
      camera.position.set(45, 38, 55);
      controlsRef.current.update();
      surfAngle.current = 0.8;
    }
  }, [cameraResetTrigger, camera]);

  // Handle camera presets
  useEffect(() => {
    if (!controlsRef.current) return;

    const bx = selectedBuilding ? selectedBuilding.position[0] : 0;
    const bz = selectedBuilding ? selectedBuilding.position[2] : 0;
    const targetY = selectedBuilding ? selectedBuilding.position[1] + selectedBuilding.height * 0.4 : 8;

    if (cameraPreset === 'top') {
      controlsRef.current.target.set(bx, 0, bz);
      camera.position.set(bx + 0.01, 95, bz);
    } else if (cameraPreset === 'street') {
      controlsRef.current.target.set(bx, targetY + 10, bz);
      camera.position.set(bx, 3, bz + 38);
    } else {
      // Default Iso
      controlsRef.current.target.set(bx, targetY, bz);
      camera.position.set(bx + 45, 38, bz + 55);
    }
    controlsRef.current.update();
  }, [cameraPreset, selectedBuilding, camera]);

  // Handle focus when building changes
  useEffect(() => {
    if (!controlsRef.current) return;

    if (selectedBuilding) {
      const [bx, by, bz] = selectedBuilding.position;
      const targetY = by + selectedBuilding.height * 0.4;
      controlsRef.current.target.set(bx, targetY, bz);
      controlsRef.current.update();
    } else {
      controlsRef.current.target.set(0, 8, 0);
      controlsRef.current.update();
    }
  }, [selectedBuilding]);

  // Fit the complete live footprint inventory once it loads so a KP2 search
  // opens at area scale. Selecting an individual building still focuses it.
  useEffect(() => {
    const realBuildings = buildings.filter((building) => building.footprint);
    if (realBuildings.length < 2 || !controlsRef.current) return;

    const minX = Math.min(...realBuildings.map((b) => b.position[0] - b.dimensions[0] / 2));
    const maxX = Math.max(...realBuildings.map((b) => b.position[0] + b.dimensions[0] / 2));
    const minZ = Math.min(...realBuildings.map((b) => b.position[2] - b.dimensions[2] / 2));
    const maxZ = Math.max(...realBuildings.map((b) => b.position[2] + b.dimensions[2] / 2));
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const width = Math.max(maxX - minX, maxZ - minZ, 1);
    const height = Math.max(...realBuildings.map((b) => b.height));
    const distance = Math.max(90, (width / (2 * Math.tan((42 * Math.PI) / 360))) * 1.18 + height);
    const target = new THREE.Vector3(centerX, height * 0.35, centerZ);
    controlsRef.current.target.copy(target);
    camera.position.set(centerX + distance * 0.65, target.y + distance * 0.5, centerZ + distance * 0.65);
    controlsRef.current.update();
  }, [buildings, camera]);

  // Continuous Globe Surfing Swoop Motion
  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    // Check if user recently finished interacting (< 2.5s ago)
    const timeSinceInteract = performance.now() - lastInteractTime.current;
    const userIsActive = isInteractingRef.current || timeSinceInteract < 2500;

    if (globeSurfing && !userIsActive && cameraPreset === 'iso') {
      // Advance surfing wave angle
      const speedMult = surfSpeed === 3 ? 0.65 : surfSpeed === 2 ? 0.42 : 0.28;
      surfAngle.current += delta * speedMult;

      // Dynamic surfing radius (in-and-out swells over the globe)
      const swellRadius = 55 + Math.sin(surfAngle.current * 1.5) * 8;

      // Cresting altitude (rising and dipping over the curved planetary horizon)
      const targetAltitude = 32 + Math.cos(surfAngle.current * 1.8) * 10;

      // Desired camera position
      const cx = Math.cos(surfAngle.current) * swellRadius;
      const cz = Math.sin(surfAngle.current) * swellRadius;

      // Smooth aerodynamic lerp
      camera.position.lerp(new THREE.Vector3(cx, targetAltitude, cz), 0.035);

      // Target anchor lerp (slight forward banking lead)
      const focusX = selectedBuilding ? selectedBuilding.position[0] : 0;
      const focusZ = selectedBuilding ? selectedBuilding.position[2] : 0;
      const leadX = focusX + Math.sin(surfAngle.current * 1.2) * 3.5;
      const leadZ = focusZ + Math.cos(surfAngle.current * 1.2) * 3.5;
      const leadY = selectedBuilding ? selectedBuilding.position[1] + 12 : 8;

      controlsRef.current.target.lerp(new THREE.Vector3(leadX, leadY, leadZ), 0.04);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={5000}
      maxPolarAngle={cameraPreset === 'top' ? Math.PI / 2.05 : Math.PI / 2.05}
      autoRotate={cinematicOrbit && !globeSurfing}
      autoRotateSpeed={1.4}
      target={[0, 8, 0]}
    />
  );
};
