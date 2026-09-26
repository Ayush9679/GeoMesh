import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCadastral } from '../../context/CadastralContext';

// Helper to convert spherical coordinates (lat, lng in degrees, radius) to Cartesian [x, y, z]
function geoToVector(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

export const EarthGlobe3D: React.FC = () => {
  const { visualMode, showGlobeAtmosphere, globeSurfing, surfSpeed, currentTheme } = useCadastral();
  const globeGroupRef = useRef<THREE.Group>(null);
  const satellitesRef = useRef<THREE.Group>(null);
  const waveRipplesRef = useRef<THREE.Group>(null);
  const cloudLayerRef = useRef<THREE.Mesh>(null);

  const GLOBE_RADIUS = 72;
  const GLOBE_CENTER_Y = -70; // Apex at y = 2

  // Continents procedural contour coordinates centered around India / Eurasia
  // Landmass approximations in latitude/longitude degrees
  const continentPolygons = useMemo(() => {
    // Indian Subcontinent & Himalayas
    const india = [
      [8.0, 77.5], [10.0, 76.0], [13.0, 74.8], [15.5, 73.8], [19.0, 72.8],
      [23.0, 68.5], [25.0, 70.0], [28.5, 74.0], [32.0, 75.5], [35.5, 75.0],
      [34.5, 78.5], [31.0, 81.0], [28.0, 84.0], [27.0, 88.5], [26.0, 92.0],
      [24.0, 94.0], [21.5, 89.0], [20.0, 86.5], [16.5, 82.0], [13.0, 80.2],
      [10.0, 79.8], [8.0, 77.5],
    ];

    // Arabian Peninsula
    const arabia = [
      [12.5, 44.0], [15.0, 52.0], [22.0, 59.0], [25.5, 56.5], [29.0, 48.0],
      [31.5, 38.0], [28.0, 35.0], [22.0, 39.0], [14.0, 43.0], [12.5, 44.0],
    ];

    // Southeast Asia & Bay of Bengal Arc
    const seAsia = [
      [22.0, 92.0], [16.0, 96.0], [10.0, 99.0], [4.0, 103.0], [1.5, 104.0],
      [6.0, 108.0], [13.0, 109.0], [20.0, 107.0], [22.0, 102.0], [22.0, 92.0],
    ];

    // East Asia Coast
    const eastAsia = [
      [22.0, 114.0], [28.0, 121.0], [35.0, 126.0], [40.0, 124.0], [42.0, 131.0],
      [36.0, 136.0], [30.0, 122.0], [24.0, 118.0], [22.0, 114.0],
    ];

    // Sri Lanka
    const sriLanka = [
      [6.0, 80.5], [7.5, 81.8], [9.5, 80.2], [8.0, 79.8], [6.0, 80.5],
    ];

    const convertPoly = (poly: number[][]) => {
      const pts: THREE.Vector3[] = [];
      poly.forEach(([lat, lng]) => {
        const [x, y, z] = geoToVector(lat, lng, GLOBE_RADIUS + 0.15);
        pts.push(new THREE.Vector3(x, y, z));
      });
      return pts;
    };

    return [
      convertPoly(india),
      convertPoly(arabia),
      convertPoly(seAsia),
      convertPoly(eastAsia),
      convertPoly(sriLanka),
    ];
  }, []);

  // Latitude parallels (lines of latitude)
  const latitudeLines = useMemo(() => {
    const latitudes = [-45, -30, -15, 0, 15, 23.5, 30, 45, 60];
    const lines: THREE.Vector3[][] = [];

    latitudes.forEach((lat) => {
      const pts: THREE.Vector3[] = [];
      const steps = 72;
      for (let i = 0; i <= steps; i++) {
        const lng = (i / steps) * 360 - 180;
        const [x, y, z] = geoToVector(lat, lng, GLOBE_RADIUS + 0.08);
        pts.push(new THREE.Vector3(x, y, z));
      }
      lines.push(pts);
    });
    return lines;
  }, []);

  // Longitude meridians (lines from north to south)
  const longitudeLines = useMemo(() => {
    const longitudes = [0, 30, 60, 77.5, 90, 120, 150, 180, -150, -120, -90, -60, -30];
    const lines: THREE.Vector3[][] = [];

    longitudes.forEach((lng) => {
      const pts: THREE.Vector3[] = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const lat = (i / steps) * 160 - 80;
        const [x, y, z] = geoToVector(lat, lng, GLOBE_RADIUS + 0.08);
        pts.push(new THREE.Vector3(x, y, z));
      }
      lines.push(pts);
    });
    return lines;
  }, []);

  // Surfing wave ripples over oceanic curvature
  const waveScales = useRef([1, 1.25, 1.5, 1.75]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const effectiveSpeed = globeSurfing ? surfSpeed : 0.4;

    // Slow planetary axial rotation
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y = time * 0.03 * effectiveSpeed;
    }

    // Cloud layer counter-drift
    if (cloudLayerRef.current) {
      cloudLayerRef.current.rotation.y = time * 0.045 * effectiveSpeed;
    }

    // Orbital satellites motion
    if (satellitesRef.current) {
      satellitesRef.current.rotation.y = time * 0.2 * effectiveSpeed;
      satellitesRef.current.rotation.z = Math.sin(time * 0.1) * 0.15;
    }

    // Expanding surfing shockwaves
    if (waveRipplesRef.current) {
      waveRipplesRef.current.children.forEach((child, index) => {
        waveScales.current[index] += delta * 0.4 * effectiveSpeed;
        if (waveScales.current[index] > 2.2) {
          waveScales.current[index] = 1.0;
        }
        const s = waveScales.current[index];
        child.scale.set(s, s, s);
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = Math.max(0, (2.2 - s) * 0.35);
        }
      });
    }
  });

  const isDaylight = visualMode === 'daylight';
  const isXray = visualMode === 'xray';

  // Palette adaptations from active Theme
  const oceanColor = isDaylight ? '#0C2A4A' : currentTheme.colors.globeOcean;
  const graticuleColor = isDaylight ? '#0284C7' : isXray ? '#38BDF8' : currentTheme.colors.globeGraticule;
  const continentGlowColor = isDaylight ? '#10B981' : isXray ? '#60A5FA' : currentTheme.colors.globeContinent;
  const atmosphereColor = isDaylight ? '#38BDF8' : currentTheme.colors.globeAtmosphere;
  const accentColor = currentTheme.colors.accentPrimary;
  const accentSecondary = currentTheme.colors.accentSecondary;

  return (
    <group position={[0, GLOBE_CENTER_Y, 0]}>
      {/* 1. ROTATING PLANETARY EARTH SPHERE */}
      <group ref={globeGroupRef} rotation={[0.41, 0, 0]}>
        {/* Core Ocean Sphere */}
        <mesh receiveShadow>
          <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
          <meshStandardMaterial
            color={oceanColor}
            roughness={0.4}
            metalness={0.3}
            emissive="#020B18"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Latitude Parallels */}
        {latitudeLines.map((pts, i) => (
          <line key={`lat-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={graticuleColor}
              transparent
              opacity={i === 3 ? 0.45 : 0.18}
              linewidth={1}
            />
          </line>
        ))}

        {/* Longitude Meridians */}
        {longitudeLines.map((pts, i) => (
          <line key={`lng-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={graticuleColor}
              transparent
              opacity={i === 3 ? 0.5 : 0.18}
              linewidth={1}
            />
          </line>
        ))}

        {/* Glowing Continents & Coastlines */}
        {continentPolygons.map((pts, i) => (
          <line key={`cont-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={continentGlowColor}
              transparent
              opacity={0.85}
              linewidth={2}
            />
          </line>
        ))}

        {/* High-Tech Cadastral Surface Nodes on Subcontinent */}
        {[
          [28.4682, 77.5042], // Greater Noida
          [19.076, 72.8777],  // Mumbai
          [12.9716, 77.5946], // Bengaluru
          [22.5726, 88.3639], // Kolkata
          [28.6139, 77.209],  // New Delhi
          [13.0827, 80.2707], // Chennai
        ].map(([lat, lng], idx) => {
          const [x, y, z] = geoToVector(lat, lng, GLOBE_RADIUS + 0.35);
          return (
            <group key={`pin-${idx}`} position={[x, y, z]}>
              <mesh>
                <sphereGeometry args={[0.45, 16, 16]} />
                <meshBasicMaterial color={idx === 0 ? '#22C55E' : '#38BDF8'} />
              </mesh>
              {idx === 0 && (
                <mesh>
                  <ringGeometry args={[0.6, 0.9, 24]} />
                  <meshBasicMaterial color="#22C55E" transparent opacity={0.7} side={THREE.DoubleSide} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Semi-transparent Atmospheric Cloud Graticule */}
        <mesh ref={cloudLayerRef}>
          <sphereGeometry args={[GLOBE_RADIUS + 0.6, 48, 48]} />
          <meshStandardMaterial
            color="#38BDF8"
            transparent
            opacity={0.06}
            wireframe
          />
        </mesh>
      </group>

      {/* 2. SURFING CONCENTRIC OCEAN WAVES AROUND SUMMIT */}
      <group ref={waveRipplesRef} position={[0, GLOBE_RADIUS, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[0, 1, 2, 3].map((idx) => (
          <mesh key={`surf-wave-${idx}`} position={[0, 0, 0.05 * idx]}>
            <ringGeometry args={[14, 15, 64]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* 3. ATMOSPHERIC FRESNEL CORONA / GLOWING HALO */}
      {showGlobeAtmosphere && (
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS + 2.2, 64, 64]} />
          <meshBasicMaterial
            color={atmosphereColor}
            transparent
            opacity={isDaylight ? 0.12 : 0.18}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* 4. ORBITAL SATELLITE TRACKS & CONSTELLATION */}
      <group ref={satellitesRef}>
        {/* Polar Orbit Ring */}
        <mesh rotation={[Math.PI / 3, 0.4, 0]}>
          <torusGeometry args={[GLOBE_RADIUS + 8, 0.08, 16, 100]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.35} />
        </mesh>

        {/* Equatorial Orbit Ring */}
        <mesh rotation={[0.2, 0, Math.PI / 4]}>
          <torusGeometry args={[GLOBE_RADIUS + 11, 0.08, 16, 100]} />
          <meshBasicMaterial color={accentSecondary} transparent opacity={0.25} />
        </mesh>

        {/* Navigational Satellite A */}
        <group position={[GLOBE_RADIUS + 8, 4, 0]}>
          {/* Satellite Core */}
          <mesh>
            <boxGeometry args={[1.2, 0.8, 0.8]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.8} />
          </mesh>
          {/* Solar Wings */}
          <mesh position={[-1.6, 0, 0]}>
            <boxGeometry args={[1.8, 0.05, 0.9]} />
            <meshStandardMaterial color="#0284C7" />
          </mesh>
          <mesh position={[1.6, 0, 0]}>
            <boxGeometry args={[1.8, 0.05, 0.9]} />
            <meshStandardMaterial color="#0284C7" />
          </mesh>
          {/* Telemetry Beacon Laser */}
          <mesh position={[0, -0.6, 0]}>
            <sphereGeometry args={[0.25, 12, 12]} />
            <meshBasicMaterial color="#22C55E" />
          </mesh>
        </group>

        {/* Navigational Satellite B */}
        <group position={[-GLOBE_RADIUS - 6, 12, 15]}>
          <mesh>
            <boxGeometry args={[1.0, 0.6, 0.6]} />
            <meshStandardMaterial color="#F8FAFC" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, -1.4]}>
            <boxGeometry args={[0.8, 0.05, 1.6]} />
            <meshStandardMaterial color="#38BDF8" />
          </mesh>
          <mesh position={[0, 0, 1.4]}>
            <boxGeometry args={[0.8, 0.05, 1.6]} />
            <meshStandardMaterial color="#38BDF8" />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshBasicMaterial color="#F59E0B" />
          </mesh>
        </group>
      </group>
    </group>
  );
};
