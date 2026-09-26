import React, { useState } from 'react';
import {
  RotateCcw,
  Grid,
  Building2,
  Layers,
  Scan,
  ArrowUp,
  Maximize2,
  Ruler,
  Compass,
  Sun,
  Volume2,
  VolumeX,
  Eye,
  Radio,
  Sliders,
  Globe,
  Circle,
  Square,
  Wind,
} from 'lucide-react';
import { useCadastral } from '../../context/CadastralContext';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

interface ViewerToolbarProps {
  onToggleFullscreen?: () => void;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({ onToggleFullscreen }) => {
  const {
    showGrid,
    showBuildings,
    showFloorsExploded,
    showScanning,
    toggleGrid,
    toggleBuildings,
    toggleFloorsExploded,
    toggleScanning,
    resetCamera,
    stepUpHierarchy,
    selectedBuilding,
    selectedFloor,
    selectedFlat,
    visualMode,
    setVisualMode,
    cinematicOrbit,
    setCinematicOrbit,
    cameraPreset,
    setCameraPreset,
    explosionFactor,
    setExplosionFactor,
    measurementMode,
    setMeasurementMode,
    clearMeasurement,
    sunHour,
    setSunHour,
    soundEnabled,
    toggleSound,
    globeSurfing,
    toggleGlobeSurfing,
    surfSpeed,
    setSurfSpeed,
    viewerShape,
    setViewerShape,
    toggleViewerShape,
  } = useCadastral();

  const [showSunControl, setShowSunControl] = useState(false);
  const [showExplodeControl, setShowExplodeControl] = useState(false);
  const [showSpeedControl, setShowSpeedControl] = useState(false);

  const hasSubSelection = !!(selectedBuilding || selectedFloor || selectedFlat);

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#071426]/95 border border-[#243B53] backdrop-blur-md shadow-2xl max-w-[calc(100%-2rem)]">
      {/* 1. Step Up Hierarchy */}
      {hasSubSelection && (
        <button
          onClick={stepUpHierarchy}
          title="Step Up Property Hierarchy"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-[#10253D] text-[#38BDF8] border border-[#38BDF8]/50 hover:bg-[#38BDF8]/20 transition-all shadow-sm"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>UP</span>
        </button>
      )}

      {/* 2. Reset Camera */}
      <button
        onClick={resetCamera}
        title="Reset Camera View"
        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#10253D] transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-[#243B53]" />

      {/* 3. Camera Angle Presets (Iso, Top, Street) */}
      <div className="flex items-center rounded-lg bg-[#0B1F33] p-0.5 border border-[#243B53]">
        <button
          onClick={() => setCameraPreset('iso')}
          title="Isometric 3D View"
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            cameraPreset === 'iso'
              ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          3D
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          title="Top-Down 2D Cadastral Map"
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            cameraPreset === 'top'
              ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          2D
        </button>
        <button
          onClick={() => setCameraPreset('street')}
          title="Street-Level Eye View"
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            cameraPreset === 'street'
              ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          EYE
        </button>
      </div>

      {/* 4. Globe Surfing Mode Toggle & Speed */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleGlobeSurfing}
          title={globeSurfing ? 'Pause Globe Surfing Motion' : 'Start Surfing on Globe'}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-mono font-bold transition-all ${
            globeSurfing
              ? 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8] text-[#071426] shadow-md shadow-[#38BDF8]/25'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#10253D]'
          }`}
        >
          <Globe className={`w-3.5 h-3.5 ${globeSurfing ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
          <span>Surf</span>
        </button>
        {globeSurfing && (
          <div className="flex items-center rounded-md bg-[#0B1F33] p-0.5 border border-[#243B53]">
            {[1, 2, 3].map((spd) => (
              <button
                key={spd}
                onClick={() => setSurfSpeed(spd)}
                className={`px-1 py-0.5 text-[10px] font-mono rounded ${
                  surfSpeed === spd
                    ? 'bg-[#38BDF8] text-[#071426] font-bold'
                    : 'text-[#64748B] hover:text-[#F8FAFC]'
                }`}
                title={`Surf Speed ${spd}x`}
              >
                {spd}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. Viewport Shape Toggle (Wide Primary vs Circular) */}
      <div className="flex items-center rounded-lg bg-[#0B1F33] p-0.5 border border-[#243B53]">
        <button
          onClick={() => setViewerShape('wide')}
          title="Wide Viewport (Primary)"
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            viewerShape === 'wide'
              ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Square className="w-3 h-3" />
          <span className="hidden sm:inline">Wide</span>
        </button>
        <button
          onClick={() => setViewerShape('circle')}
          title="Circular Holographic Globe View"
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            viewerShape === 'circle'
              ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Circle className="w-3 h-3" />
          <span className="hidden sm:inline">Circle</span>
        </button>
      </div>

      {/* 6. Cinematic Drone Orbit Toggle */}
      <button
        onClick={() => setCinematicOrbit((prev) => !prev)}
        title={cinematicOrbit ? 'Stop Drone Orbit' : 'Start Cinematic Drone Orbit'}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all ${
          cinematicOrbit
            ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-md shadow-[#38BDF8]/30 animate-pulse'
            : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#10253D]'
        }`}
      >
        <Compass className={`w-3.5 h-3.5 ${cinematicOrbit ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        <span className="hidden md:inline font-mono text-[11px]">Orbit</span>
      </button>

      <div className="w-[1px] h-4 bg-[#243B53]" />

      {/* 7. Render Style Modes (Cyber, Daylight, X-Ray) */}
      <div className="flex items-center rounded-lg bg-[#0B1F33] p-0.5 border border-[#243B53]">
        <button
          onClick={() => setVisualMode('cyber')}
          title="Cyber Neon Digital Twin Mode"
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            visualMode === 'cyber'
              ? 'bg-[#10253D] text-[#38BDF8] font-bold border border-[#38BDF8]/40'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          Cyber
        </button>
        <button
          onClick={() => setVisualMode('daylight')}
          title="Daylight Sun & Architectural Mode"
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            visualMode === 'daylight'
              ? 'bg-[#10253D] text-[#F59E0B] font-bold border border-[#F59E0B]/40'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          Sun
        </button>
        <button
          onClick={() => setVisualMode('xray')}
          title="Technical X-Ray / LiDAR Mode"
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            visualMode === 'xray'
              ? 'bg-[#10253D] text-[#A855F7] font-bold border border-[#A855F7]/40'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          X-Ray
        </button>
      </div>

      <div className="w-[1px] h-4 bg-[#243B53]" />

      {/* 6. Vertical Explosion Stepper Control */}
      <div className="relative">
        <button
          onClick={() => setShowExplodeControl((p) => !p)}
          title="Vertical Floor Separation Control"
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all ${
            showFloorsExploded || explosionFactor > 0
              ? 'bg-[#10253D] text-[#38BDF8] border border-[#38BDF8]/50'
              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#10253D]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono text-[11px]">
            {explosionFactor === 0 ? 'Floors' : `${Math.round(explosionFactor * 100)}%`}
          </span>
        </button>

        {showExplodeControl && (
          <div className="absolute top-full left-0 mt-2 p-2 rounded-xl bg-[#071426]/95 border border-[#243B53] shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-[170px] z-30 font-mono text-xs">
            <span className="text-[10px] text-[#64748B] uppercase font-bold">
              Vertical Strata Separation
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '0%', val: 0 },
                { label: '60%', val: 0.6 },
                { label: '120%', val: 1.2 },
              ].map((step) => (
                <button
                  key={step.label}
                  onClick={() => {
                    setExplosionFactor(step.val);
                    if (step.val > 0) toggleFloorsExploded();
                    setShowExplodeControl(false);
                  }}
                  className={`px-1.5 py-1 rounded text-center text-[10px] transition-all ${
                    explosionFactor === step.val
                      ? 'bg-[#38BDF8] text-[#071426] font-bold'
                      : 'bg-[#0B1F33] text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={explosionFactor}
              onChange={(e) => setExplosionFactor(parseFloat(e.target.value))}
              className="w-full accent-[#38BDF8] cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 7. 3D Laser Measurement Ruler */}
      <button
        onClick={() => {
          setMeasurementMode((prev) => {
            const next = !prev;
            if (!next) clearMeasurement();
            return next;
          });
        }}
        title={measurementMode ? 'Deactivate Laser Ruler' : 'Activate 3D Laser Measurement'}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all ${
          measurementMode
            ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-md shadow-[#38BDF8]/30'
            : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#10253D]'
        }`}
      >
        <Ruler className="w-3.5 h-3.5" />
        <span className="hidden sm:inline font-mono text-[11px]">Measure</span>
      </button>

      {/* 8. Sun / Daylight Time Control */}
      {visualMode === 'daylight' && (
        <div className="relative">
          <button
            onClick={() => setShowSunControl((p) => !p)}
            title="Adjust Sun Hour & Shadow Angle"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-[#F59E0B] bg-[#10253D] border border-[#F59E0B]/40"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{sunHour}:00</span>
          </button>

          {showSunControl && (
            <div className="absolute top-full left-0 mt-2 p-2.5 rounded-xl bg-[#071426]/95 border border-[#243B53] shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-[180px] z-30 font-mono text-xs">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">
                Sun Hour ({sunHour}:00)
              </span>
              <input
                type="range"
                min="6"
                max="20"
                step="1"
                value={sunHour}
                onChange={(e) => setSunHour(parseInt(e.target.value))}
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#64748B]">
                <span>06:00 Dawn</span>
                <span>13:00 Noon</span>
                <span>20:00 Dusk</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. LiDAR Laser Scanner Toggle */}
      <button
        onClick={toggleScanning}
        title={showScanning ? 'Pause LiDAR Scan' : 'Resume LiDAR Scan'}
        className={`p-1.5 rounded-lg transition-colors ${
          showScanning
            ? 'text-[#22C55E] bg-[#10253D]'
            : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#10253D]'
        }`}
      >
        <Scan className="w-4 h-4" />
      </button>

      {/* 10. Sound FX Synthesizer Toggle */}
      <button
        onClick={toggleSound}
        title={soundEnabled ? 'Disable Interactive Audio FX' : 'Enable Interactive Audio FX'}
        className={`p-1.5 rounded-lg transition-colors ${
          soundEnabled
            ? 'text-[#38BDF8] bg-[#10253D] shadow-sm'
            : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#10253D]'
        }`}
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {/* 11. Color Theme Preset Switcher */}
      <div className="w-[1px] h-4 bg-[#243B53]" />
      <ThemeSwitcher compact align="right" />

      {/* 12. Fullscreen */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          title="Toggle 3D Viewport Fullscreen"
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#10253D] transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
