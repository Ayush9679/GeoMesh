import React from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCadastral } from '../../context/CadastralContext';
import { Ruler, X } from 'lucide-react';

export const MeasurementTool3D: React.FC = () => {
  const { measurementMode, measurePoints, addMeasurePoint, clearMeasurement } = useCadastral();
  const { raycaster, camera, scene } = useThree();

  // Handle click on canvas when measurementMode is active
  const handleGroundClick = (e: any) => {
    if (!measurementMode) return;
    e.stopPropagation();

    // Intersection point from event or raycaster
    const point = e.point as THREE.Vector3;
    if (point) {
      addMeasurePoint(new THREE.Vector3(point.x, point.y + 0.1, point.z));
    }
  };

  const p1 = measurePoints[0];
  const p2 = measurePoints[1];

  // Calculate distances
  let distance3D = 0;
  let distHorizontal = 0;
  let distVertical = 0;
  let midPoint: THREE.Vector3 | null = null;

  if (p1 && p2) {
    distance3D = p1.distanceTo(p2);
    const p1xz = new THREE.Vector2(p1.x, p1.z);
    const p2xz = new THREE.Vector2(p2.x, p2.z);
    distHorizontal = p1xz.distanceTo(p2xz);
    distVertical = Math.abs(p2.y - p1.y);
    midPoint = new THREE.Vector3(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2 + 0.8,
      (p1.z + p2.z) / 2
    );
  }

  const lineObject = React.useMemo(() => {
    if (!p1 || !p2) return null;
    const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const mat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.8,
      gapSize: 0.4,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [p1, p2]);

  return (
    <group>
      {/* Invisible measurement raycast catcher plane when in measurement mode */}
      {measurementMode && (
        <mesh
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleGroundClick}
          visible={false}
        >
          <planeGeometry args={[140, 140]} />
        </mesh>
      )}

      {/* Point 1 Marker */}
      {p1 && (
        <group position={[p1.x, p1.y, p1.z]}>
          <mesh>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.8} />
          </mesh>
          <pointLight color="#38BDF8" intensity={1.5} distance={6} />
          <Html distanceFactor={30} position={[0, 0.8, 0]} center>
            <div className="bg-[#071426]/90 border border-[#38BDF8] text-[#38BDF8] px-1.5 py-0.5 rounded font-mono text-[10px] whitespace-nowrap shadow-lg select-none pointer-events-none">
              POINT A
            </div>
          </Html>
        </group>
      )}

      {/* Point 2 Marker */}
      {p2 && (
        <group position={[p2.x, p2.y, p2.z]}>
          <mesh>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.8} />
          </mesh>
          <pointLight color="#22C55E" intensity={1.5} distance={6} />
          <Html distanceFactor={30} position={[0, 0.8, 0]} center>
            <div className="bg-[#071426]/90 border border-[#22C55E] text-[#22C55E] px-1.5 py-0.5 rounded font-mono text-[10px] whitespace-nowrap shadow-lg select-none pointer-events-none">
              POINT B
            </div>
          </Html>
        </group>
      )}

      {/* Dimension Laser Line */}
      {lineObject && <primitive object={lineObject} />}

      {/* Dimension Callout Card */}
      {midPoint && (
        <Html position={[midPoint.x, midPoint.y, midPoint.z]} center distanceFactor={40}>
          <div className="pointer-events-auto bg-[#071426]/95 border border-[#38BDF8] rounded-lg p-2.5 shadow-2xl backdrop-blur-md font-mono text-xs text-[#F8FAFC] flex flex-col gap-1 min-w-[160px] select-none">
            <div className="flex items-center justify-between border-b border-[#243B53] pb-1">
              <span className="flex items-center gap-1 text-[#38BDF8] font-bold text-[11px]">
                <Ruler className="w-3 h-3" />
                CADASTRAL LASER
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearMeasurement();
                }}
                className="text-[#94A3B8] hover:text-[#EF4444]"
                title="Clear measurement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-sm font-bold text-[#38BDF8]">
              {distance3D.toFixed(2)} m{' '}
              <span className="text-[10px] font-normal text-[#94A3B8]">
                ({(distance3D * 3.28084).toFixed(1)} ft)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-[#94A3B8] pt-0.5">
              <div>Run: {distHorizontal.toFixed(1)}m</div>
              <div>Rise: {distVertical.toFixed(1)}m</div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
