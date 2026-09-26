import React, { useState, useEffect } from 'react';
import { CadastralCanvas } from './CadastralCanvas';
import { ViewerToolbar } from './ViewerToolbar';
import { FloorElevatorScrubber } from './FloorElevatorScrubber';
import { useCadastral } from '../../context/CadastralContext';
import {
  Navigation,
  Compass,
  MapPin,
  Ruler,
  Globe,
  Circle,
  Square,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sun,
  Layers,
  Sparkles,
} from 'lucide-react';

interface Cadastral3DViewerProps {
  heightClass?: string;
  showHud?: boolean;
  defaultShape?: 'circle' | 'wide';
}

export const Cadastral3DViewer: React.FC<Cadastral3DViewerProps> = ({
  heightClass = 'h-[580px] lg:h-[680px]',
  showHud = true,
  defaultShape,
}) => {
  const {
    selectedParcel,
    selectedBuilding,
    selectedFloor,
    selectedFlat,
    measurementMode,
    measurePoints,
    clearMeasurement,
    visualMode,
    setVisualMode,
    cinematicOrbit,
    globeSurfing,
    toggleGlobeSurfing,
    surfSpeed,
    setSurfSpeed,
    viewerShape,
    toggleViewerShape,
    setViewerShape,
    soundEnabled,
    toggleSound,
    currentTheme,
  } = useCadastral();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localShape, setLocalShape] = useState<'circle' | 'wide'>(defaultShape || viewerShape || 'wide');

  // Sync if viewerShape in context changes
  useEffect(() => {
    if (viewerShape) {
      setLocalShape(viewerShape);
    }
  }, [viewerShape]);

  // Sync if defaultShape prop changes
  useEffect(() => {
    if (defaultShape) {
      setLocalShape(defaultShape);
    }
  }, [defaultShape]);

  // Determine active shape
  const activeShape = isFullscreen ? 'wide' : localShape;

  const switchToWide = () => {
    setLocalShape('wide');
    setViewerShape('wide');
  };

  const switchToCircle = () => {
    setLocalShape('circle');
    setViewerShape('circle');
  };

  const handleToggleShape = () => {
    const next = activeShape === 'circle' ? 'wide' : 'circle';
    setLocalShape(next);
    setViewerShape(next);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Circular Viewport Presentation
  if (activeShape === 'circle') {
    return (
      <div className="relative w-full py-6 flex flex-col items-center justify-center select-none">
        {/* Outer Atmospheric Radiant Aura */}
        <div
          className="absolute inset-0 max-w-[760px] mx-auto rounded-full blur-3xl pointer-events-none animate-pulse"
          style={{
            background: `radial-gradient(circle, ${currentTheme.colors.accentGlow} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />

        {/* Circular Viewport Housing Container */}
        <div className="relative w-full max-w-[560px] sm:max-w-[640px] lg:max-w-[700px] aspect-square flex items-center justify-center">
          {/* Rotating Outer HUD Compass Bezel Ring */}
          <div
            className="absolute -inset-4 sm:-inset-6 rounded-full border pointer-events-none animate-spin"
            style={{
              animationDuration: '60s',
              borderColor: `${currentTheme.colors.accentPrimary}40`,
            }}
          >
            {/* Cardinal Degree Indicators */}
            <div
              className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono font-bold bg-[#071426] px-1.5 py-0.5 rounded border"
              style={{
                color: currentTheme.colors.accentPrimary,
                borderColor: `${currentTheme.colors.accentPrimary}60`,
              }}
            >
              N 000°
            </div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 text-[10px] font-mono font-bold text-[#94A3B8] bg-[#071426] px-1.5 py-0.5 rounded border border-[#243B53]">
              S 180°
            </div>
            <div className="absolute right-1 top-1/2 translate-x-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#94A3B8] bg-[#071426] px-1.5 py-0.5 rounded border border-[#243B53]">
              E 090°
            </div>
            <div className="absolute left-1 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#94A3B8] bg-[#071426] px-1.5 py-0.5 rounded border border-[#243B53]">
              W 270°
            </div>

            {/* Orbiting Satellite Marker */}
            <div
              className="absolute top-1/4 right-3 w-2 h-2 rounded-full shadow-lg animate-ping"
              style={{
                backgroundColor: currentTheme.colors.accentPrimary,
                boxShadow: `0 0 10px ${currentTheme.colors.accentPrimary}`,
              }}
            />
          </div>

          {/* Secondary Concentric Radar Ring */}
          <div className="absolute -inset-2 rounded-full border border-dashed border-[#243B53]/60 pointer-events-none" />

          {/* CIRCULAR 3D VIEWPORT CANVAS */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden border-2 shadow-2xl ring-4 ring-[#0B1F33] ring-offset-4 ring-offset-[#071426] bg-[#071426]"
            style={{
              borderColor: `${currentTheme.colors.accentPrimary}90`,
              boxShadow: `0 0 80px ${currentTheme.colors.accentGlow}`,
            }}
          >
            {/* Three.js 3D WebGL Canvas */}
            <CadastralCanvas className="w-full h-full" />

            {/* Rotating Radar Conic Beam Overlay */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none animate-spin"
              style={{
                animationDuration: '10s',
                background: `conic-gradient(from 0deg at 50% 50%, ${currentTheme.colors.accentGlow} 0deg, transparent 55deg)`,
              }}
            />

            {/* Optical Specular Glare Reflection on Upper Hemisphere */}
            <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-b from-white/[0.08] via-transparent to-transparent" />

            {/* Center Reticle Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-8 h-8 border border-[#38BDF8]/50 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              </div>
            </div>

            {/* Top Telemetry Floating Badge */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#071426]/90 border border-[#38BDF8]/50 backdrop-blur-md font-mono text-[11px] text-[#38BDF8] shadow-2xl">
              <Globe className={`w-3.5 h-3.5 ${globeSurfing ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
              <span className="font-bold">
                {globeSurfing ? `SURFING GLOBE • MACH ${surfSpeed}.2` : 'GLOBE ORBIT STANDBY'}
              </span>
              <span className="text-[#243B53]">|</span>
              <span className="text-[#22C55E]">28.46°N 77.50°E</span>
            </div>

            {/* Bottom Quick-Action HUD Controls inside Circle */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#071426]/95 border border-[#243B53] backdrop-blur-md shadow-2xl font-mono text-xs max-w-[90%]">
              {/* Globe Surfing Toggle */}
              <button
                onClick={toggleGlobeSurfing}
                title={globeSurfing ? 'Pause Globe Surfing Motion' : 'Resume Surfing on Globe'}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  globeSurfing
                    ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-md shadow-[#38BDF8]/30'
                    : 'bg-[#10253D] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{globeSurfing ? 'Surfing' : 'Surf Off'}</span>
              </button>

              {/* Speed Pills */}
              {globeSurfing && (
                <div className="flex items-center bg-[#0B1F33] rounded-md p-0.5 border border-[#243B53]">
                  {[1, 2, 3].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSurfSpeed(spd)}
                      className={`px-1.5 py-0.5 text-[10px] rounded ${
                        surfSpeed === spd
                          ? 'bg-[#38BDF8] text-[#071426] font-bold'
                          : 'text-[#64748B] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}

              {/* Shape Switcher */}
              <button
                onClick={handleToggleShape}
                title="Expand to Wide Cinematic Canvas"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#10253D] text-[#94A3B8] hover:text-[#38BDF8] border border-[#243B53] transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Wide</span>
              </button>

              {/* Daylight / Cyber Mode */}
              <button
                onClick={() => setVisualMode(visualMode === 'cyber' ? 'daylight' : 'cyber')}
                title="Toggle Daylight / Cyber Mode"
                className="p-1 rounded-lg bg-[#10253D] text-[#F59E0B] hover:text-[#FBBF24] border border-[#243B53]"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>

              {/* Sound */}
              <button
                onClick={toggleSound}
                title="Toggle Spatial Audio"
                className="p-1 rounded-lg bg-[#10253D] text-[#94A3B8] hover:text-[#38BDF8] border border-[#243B53]"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#38BDF8]" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Orb Telemetry Ribbon */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-[#94A3B8]">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1F33] border border-[#243B53]">
            <MapPin className="w-3 h-3 text-[#38BDF8]" />
            <span>{selectedParcel?.name ?? 'Plot C-14, Sec 128'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1F33] border border-[#243B53]">
            <Navigation className="w-3 h-3 text-[#22C55E]" />
            <span>
              {selectedFlat
                ? `FLAT ${selectedFlat.flatNumber} (${selectedFlat.type})`
                : selectedFloor
                ? `FLOOR ${selectedFloor.floorLabel}`
                : 'SURVEY OF INDIA WGS-84'}
            </span>
          </div>
          <button
            onClick={switchToWide}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#38BDF8] text-[#071426] hover:bg-[#60A5FA] transition-all font-bold shadow-md shadow-[#38BDF8]/20"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Switch to Wide View (Primary)</span>
          </button>
        </div>
      </div>
    );
  }

  // WIDE / FULLSCREEN VIEWPORT PRESENTATION
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[#243B53] bg-[#071426] transition-all duration-300 shadow-2xl ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen rounded-none border-none'
          : heightClass
      }`}
    >
      {/* 3D WebGL Canvas */}
      <CadastralCanvas className="w-full h-full" />

      {/* Floating Interactive Toolbar */}
      <ViewerToolbar onToggleFullscreen={toggleFullscreen} />

      {/* Interactive Vertical Floor Scrubber Elevator */}
      <FloorElevatorScrubber />

      {/* Measurement Mode Interactive Instructions Banner */}
      {measurementMode && (
        <div className="absolute top-16 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#071426]/95 border border-[#38BDF8] text-[#38BDF8] shadow-2xl backdrop-blur-md text-xs font-mono animate-pulse">
          <Ruler className="w-3.5 h-3.5" />
          <span>
            {measurePoints.length === 0
              ? 'Click 1st point to start measuring'
              : measurePoints.length === 1
              ? 'Click 2nd target point'
              : 'Measurement calculated • Click again to re-measure'}
          </span>
          {measurePoints.length > 0 && (
            <button
              onClick={clearMeasurement}
              className="ml-2 text-[10px] text-[#EF4444] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Globe Surfing Banner */}
      {globeSurfing && (
        <div className="absolute bottom-16 left-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-[#10253D]/90 border border-[#38BDF8]/50 text-[#38BDF8] text-xs font-mono shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
          <span>SURFING GLOBE • MACH {surfSpeed}.2 VELOCITY</span>
        </div>
      )}

      {/* Technical HUD Overlay Elements */}
      {showHud && (
        <>
          {/* Top Right System Status & Viewport Shape Selector */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#071426]/90 border border-[#243B53] backdrop-blur-md text-xs font-mono shadow-xl">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#94A3B8]">EPSG:4326</span>
            <span className="text-[#243B53]">|</span>
            <span className="text-[#38BDF8] uppercase">{visualMode} LOD-2</span>
            <div className="w-[1px] h-3.5 bg-[#243B53]" />

            {/* Quick Shape Toggles: Wide (Primary) & Circle */}
            <div className="flex items-center rounded-md bg-[#0B1F33] p-0.5 border border-[#243B53]">
              <button
                onClick={switchToWide}
                title="Wide Viewport (Primary)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  viewerShape === 'wide'
                    ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Square className="w-3 h-3" />
                <span>Wide (Primary)</span>
              </button>
              <button
                onClick={switchToCircle}
                title="Circular Holographic Viewport"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  viewerShape === 'circle'
                    ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Circle className="w-3 h-3" />
                <span>Circle</span>
              </button>
            </div>
          </div>

          {/* Bottom Left Coordinate Telemetry */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1 p-2.5 rounded-xl bg-[#071426]/90 border border-[#243B53] backdrop-blur-md text-xs font-mono shadow-xl">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Compass className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>
                LAT {selectedParcel?.coordinates.lat.toFixed(4) ?? '28.4682'}° N
              </span>
              <span className="text-[#243B53]">/</span>
              <span>
                LNG {selectedParcel?.coordinates.lng.toFixed(4) ?? '77.5042'}° E
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
              <MapPin className="w-3 h-3 text-[#60A5FA]" />
              <span className="truncate max-w-[240px]">
                {selectedParcel?.zone ?? 'Zone 04 (Greater Noida Expressway)'}
              </span>
            </div>
          </div>

          {/* Bottom Right Level Indicator */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#10253D]/95 border border-[#38BDF8]/40 backdrop-blur-md text-xs font-mono text-[#38BDF8] shadow-xl">
            <Navigation className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
            <span className="font-bold">
              {selectedFlat
                ? `FOCUS: ${selectedFlat.flatNumber} (${selectedFlat.type})`
                : selectedFloor
                ? `FOCUS: FLOOR ${selectedFloor.floorLabel}`
                : selectedBuilding
                ? `FOCUS: ${selectedBuilding.code}`
                : selectedParcel
                ? `PARCEL: ${selectedParcel.ulpin}`
                : 'CADASTRAL OVERVIEW'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
