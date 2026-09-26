import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LandingHero3D } from '../components/cadastral-3d/LandingHero3D';
import { CadastralModal } from '../components/ui/CadastralModal';
import { ConfidenceMeter } from '../components/ui/ConfidenceMeter';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { useCadastral } from '../context/CadastralContext';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  Building2,
  Layers,
  Box,
  MapPin,
  CheckCircle2,
  Radio,
  Search,
  ChevronRight,
  Info,
  Maximize2,
  Sparkles,
  Cpu,
  FileCheck2,
  Sliders,
  ExternalLink,
  Globe,
  Circle,
  Square,
  Lock,
  Mail,
  UserCheck,
  AlertTriangle,
  LogOut,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface StageModalData {
  title: string;
  subtitle: string;
  stage: string;
  icon: any;
  specs: { label: string; value: string }[];
  summary: string;
  actionRoute: string;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectParcel,
    selectBuilding,
    selectFloor,
    selectFlat,
    toggleFloorsExploded,
    setVisualMode,
    setCameraPreset,
    setExplosionFactor,
    globeSurfing,
    toggleGlobeSurfing,
    surfSpeed,
    setSurfSpeed,
    viewerShape,
    setViewerShape,
    toggleViewerShape,
    lastActionFeedback,
    clearFeedback,
  } = useCadastral();

  const { user, isAuthenticated, login, logout } = useAuth();

  const [heroSearch, setHeroSearch] = useState('');
  const [activeModalData, setActiveModalData] = useState<StageModalData | null>(null);
  const [activeUlpinSegment, setActiveUlpinSegment] = useState<string | null>(null);
  const [activeSensorModal, setActiveSensorModal] = useState<string | null>(null);

  // Main Page In-Place Authentication States
  const [authEmail, setAuthEmail] = useState('surveyor.demo@bhustack3d.local');
  const [authPassword, setAuthPassword] = useState('Surveyor@2026');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleLandingLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);
    try {
      const session = await login(authEmail, authPassword);
      setAuthSuccess(`Authenticated successfully as ${session?.user.role || 'user'}! Session active.`);
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/explore?q=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  // Quick 3D specimen interactive triggers
  const handleFocusSpecimen = (type: 'parcel' | 'building' | 'floor' | 'flat') => {
    if (type === 'parcel') {
      selectBuilding(null);
      selectFloor(null);
      selectFlat(null);
      setCameraPreset('iso');
      setExplosionFactor(0);
    } else if (type === 'building') {
      selectBuilding('bldg-01');
      selectFloor(null);
      selectFlat(null);
      setCameraPreset('iso');
    } else if (type === 'floor') {
      selectBuilding('bldg-01');
      selectFloor('flr-07');
      selectFlat(null);
      setExplosionFactor(0.8);
      toggleFloorsExploded();
    } else if (type === 'flat') {
      selectBuilding('bldg-01');
      selectFloor('flr-07');
      selectFlat('flat-0704');
      setExplosionFactor(0.8);
    }
  };

  const STAGES: StageModalData[] = [
    {
      stage: '01',
      title: '2D Ground Parcel',
      subtitle: 'Primary Revenue Polygon',
      icon: MapPin,
      specs: [
        { label: 'Cadastral ID', value: 'UP-GNB-KP2-0442' },
        { label: 'Ground Area', value: '14,850 m² (3.67 Acres)' },
        { label: 'Coordinate System', value: 'WGS84 / EPSG:4326' },
        { label: 'Boundary Verification', value: 'Survey of India Verified' },
      ],
      summary: 'Base land parcel registered with the State Revenue Department defining legal perimeter coordinates and setback lines.',
      actionRoute: '/explore?parcel=UP-GNB-KP2-0442',
    },
    {
      stage: '02',
      title: 'Superstructure LOD-2',
      subtitle: 'Volumetric Envelope',
      icon: Building2,
      specs: [
        { label: 'Building Code', value: 'BASE-V01-B01-CX' },
        { label: 'Sanctioned Height', value: '48.00 Meters' },
        { label: 'Floors Above Ground', value: '10 Storeys + Roof Helipad' },
        { label: 'Basement Levels', value: '2 Subterranean (B2, B1)' },
      ],
      summary: 'Sanctioned architectural superstructure footprint with 3D height profile, FAR compliance, and structural core geometry.',
      actionRoute: '/explore?building=bldg-01',
    },
    {
      stage: '03',
      title: 'Floor Plate Strata',
      subtitle: 'Vertical Plinth Slices',
      icon: Layers,
      specs: [
        { label: 'Specimen Level', value: 'Floor 07 (+33.6m Datum)' },
        { label: 'Plate Gross Area', value: '1,680 m²' },
        { label: 'Units on Floor', value: '6 Subdivided Units' },
        { label: 'Vertical Separation', value: 'Z-Axis Stratified Index' },
      ],
      summary: 'Discrete horizontal planes separating multi-owner rights along the Z-axis, eliminating 2D boundary overlap conflicts.',
      actionRoute: '/explore?floor=flr-07',
    },
    {
      stage: '04',
      title: 'Subdivided Unit',
      subtitle: 'Individuated Property Rights',
      icon: Box,
      specs: [
        { label: 'Unit Designation', value: 'Flat 0704 (3BHK Premium)' },
        { label: 'Carpet Area', value: '185.00 m²' },
        { label: 'Undivided Land Share', value: '11.01%' },
        { label: 'Registry Deed Ref', value: 'REG-2024-NOI-88190' },
      ],
      summary: 'Individual volumetric unit tied to legal title, encumbrance certificates, and verified boundary demarcation.',
      actionRoute: '/explore?flat=flat-0704',
    },
    {
      stage: '05',
      title: 'Unified 3D ULPIN',
      subtitle: '14-Digit Spatial Identity',
      icon: ShieldCheck,
      specs: [
        { label: '3D Identifier', value: 'UP28KP2GNIDA0A-V07-U704-C9' },
        { label: 'Cryptographic Checksum', value: 'Mod-37 Spatial Verification' },
        { label: 'DigiLocker Linked', value: 'Active / Verified' },
        { label: 'Bank KYC Mortgage', value: 'SBI Certified No-Lien' },
      ],
      summary: 'National unique property identity extending Aadhaar-like determinism into 3D verticality for unforgeable property records.',
      actionRoute: '/validate?ulpin=UP28KP2GNIDA0A-V07-U704-C9',
    },
  ];

  return (
    <div className="min-h-screen bg-[#071426] text-[#F8FAFC]">
      {/* 1. CINEMATIC INTERACTIVE 3D HERO */}
      <section className="relative pt-6 pb-12 lg:pt-10 lg:pb-16 border-b border-[#243B53] gis-grid overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Title & Interactive Quick Teleport Ribbon */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#10253D] border border-[#38BDF8]/40 text-[11px] font-mono font-bold text-[#38BDF8] tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
                <span>3D CADASTRAL DIGITAL TWIN</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F8FAFC]">
                LAND & BUILDINGS. <span className="text-[#38BDF8]">IN 3D.</span>
              </h1>
            </div>

            {/* Theme Switcher Quick Access */}
            <div className="hidden sm:block">
              <ThemeSwitcher compact />
            </div>
          </div>

          {/* Large Hero 3D Digital Twin Viewport */}
          <div className="relative">
            <LandingHero3D heightClass="h-[520px] sm:h-[600px] lg:h-[650px]" />
          </div>

          {/* Quick Bottom Search & Telemetry Strip */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-xl bg-[#0B1F33] border border-[#243B53]">
            {/* Inline Fast Search */}
            <form onSubmit={handleHeroSearch} className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search location, ULPIN, zone..."
                className="w-full pl-8 pr-16 py-1.5 text-xs font-mono bg-[#071426] border border-[#243B53] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-2.5 text-[10px] font-mono font-bold rounded bg-[#38BDF8] text-[#071426] hover:bg-[#60A5FA]"
              >
                GO
              </button>
            </form>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3 text-xs font-mono text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>EPSG:4326</span>
              </div>
              <span className="text-[#243B53]">|</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>3D ULPIN Ready</span>
              </div>
              <span className="text-[#243B53]">|</span>
              <Link
                to="/explore"
                className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline font-bold"
              >
                <span>Full Cadastral Workspace</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Action Feedback Banner */}
          {lastActionFeedback && (
            <div className="mt-3 p-3 rounded-xl bg-[#0B1F33] border border-[#38BDF8]/40 shadow-lg flex items-center justify-between animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-mono text-[#F8FAFC]">
                {lastActionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                )}
                <span>{lastActionFeedback.message}</span>
              </div>
              <button
                onClick={clearFeedback}
                className="text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] underline shrink-0 ml-3"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Cadastral Quick Automation Controls Strip */}
          <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-[#0B1F33] via-[#10253D] to-[#0B1F33] border border-[#243B53] flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
              <span className="text-xs font-mono font-bold text-[#F8FAFC] uppercase tracking-wider">
                Cadastral Operations:
              </span>
              <span className="text-xs font-mono text-[#94A3B8] hidden md:inline">
                National 3D Spatial Pipeline
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Surveyor Dashboard Direct Link */}
              <Link
                to="/surveyor"
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-[#10253D] text-[#38BDF8] border border-[#38BDF8]/40 hover:bg-[#1A365D] transition-all"
                title="Open Surveyor Cadastre Dashboard & Historical Records"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Surveyor Records</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AUTHENTICATION & OFFICIAL CADASTRAL ACCESS (ON MAIN PAGE ITSELF) */}
      <section className="py-10 border-b border-[#243B53] bg-gradient-to-b from-[#071426] via-[#0B1F33] to-[#071426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Explanatory & Role Context */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-mono font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>OFFICIAL PORTAL ACCESS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                Authentication & Field Credential Terminal
              </h2>
              <p className="text-xs sm:text-sm font-mono text-[#94A3B8] leading-relaxed">
                Direct authentication on the main portal for Field Cadastral Surveyors, Municipal Administrators, and Citizen Title Holders. Sign in to review survey records, sign off 3D ULPIN mutations, and audit volumetric compliance.
              </p>

              <div className="pt-2 space-y-2.5 font-mono text-xs text-[#94A3B8]">
                <div className="flex items-center gap-2 text-[#F8FAFC]">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  <span>Field Surveyor: Inspect previous records, verify LiDAR height & sign off</span>
                </div>
                <div className="flex items-center gap-2 text-[#F8FAFC]">
                  <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
                  <span>Cadastral Admin: Execute bulk 3D ULPIN generation & municipal sanctions</span>
                </div>
                <div className="flex items-center gap-2 text-[#F8FAFC]">
                  <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
                  <span>Citizen Owner: DigiLocker integration & clean encumbrance certificates</span>
                </div>
              </div>
            </div>

            {/* Right: Embedded Authentication Card */}
            <div className="lg:col-span-7">
              <div className="p-6 sm:p-7 rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-2xl space-y-5">
                {/* If already authenticated: Show Active Session Profile */}
                {isAuthenticated && user ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#243B53]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#10253D] border border-[#22C55E]/40 flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-[#22C55E]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#F8FAFC] font-mono">
                              {user.fullName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">
                              ACTIVE SESSION
                            </span>
                          </div>
                          <div className="text-xs font-mono text-[#94A3B8]">
                            {user.email} • {user.designation}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={logout}
                        className="px-3 py-1.5 rounded-lg bg-[#071426] border border-[#243B53] hover:border-[#EF4444] text-xs font-mono text-[#94A3B8] hover:text-[#EF4444] transition-colors flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>

                    {/* Action Links */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <Link
                        to="/surveyor"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs text-center flex items-center justify-center gap-2 hover:bg-[#60A5FA] shadow-lg shadow-[#38BDF8]/20 transition-all"
                      >
                        <FileCheck2 className="w-4 h-4" />
                        <span>Open Surveyor Dashboard & Previous Records</span>
                      </Link>

                      <Link
                        to="/explore"
                        className="py-2.5 px-4 rounded-xl bg-[#10253D] text-[#F8FAFC] border border-[#243B53] hover:border-[#38BDF8] font-mono text-xs text-center flex items-center justify-center gap-2 transition-colors"
                      >
                        <Compass className="w-4 h-4 text-[#38BDF8]" />
                        <span>Open 3D Explorer</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* If not authenticated: Show in-page login form */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#243B53]">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#38BDF8]" />
                        <span className="text-xs font-mono font-bold text-[#F8FAFC] uppercase">
                          Main Page Cadastral Sign In
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#22C55E] flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        Live Security Engine
                      </span>
                    </div>

                    {authError && (
                      <div className="p-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center gap-2 text-xs font-mono text-[#EF4444]">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    {authSuccess && (
                      <div className="p-2.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/40 flex items-center gap-2 text-xs font-mono text-[#22C55E]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{authSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleLandingLogin} className="space-y-3.5">
                      {/* Email & Password */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#94A3B8] uppercase mb-1">
                            Officer / User Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748B]" />
                            <input
                              type="email"
                              required
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#071426] border border-[#243B53] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-[#94A3B8] uppercase mb-1">
                            Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748B]" />
                            <input
                              type="password"
                              required
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#071426] border border-[#243B53] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick 1-click test credentials buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-[#94A3B8]">
                        <span className="text-[#64748B]">Auto-fill:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthEmail('surveyor.demo@bhustack3d.local');
                            setAuthPassword('Surveyor@2026');
                          }}
                          className="px-2 py-0.5 rounded bg-[#10253D] hover:bg-[#1A365D] text-[#38BDF8] border border-[#243B53]"
                        >
                          Demo Surveyor
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthEmail('citizen.demo@bhustack3d.local');
                            setAuthPassword('Citizen@2026');
                          }}
                          className="px-2 py-0.5 rounded bg-[#10253D] hover:bg-[#1A365D] text-[#94A3B8] border border-[#243B53]"
                        >
                          Demo Citizen
                        </button>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 rounded-xl bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#60A5FA] shadow-lg shadow-[#38BDF8]/20 transition-all disabled:opacity-50"
                      >
                        {authLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Authenticating Session...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Sign In</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FIVE-STAGE 3D STRATA (ULTRA-CLEAN VISUAL CARDS + POPUP INSPECTORS) */}
      <section className="py-12 border-b border-[#243B53] bg-[#071426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-widest font-bold">
                VERTICAL CADASTRAL ARCHITECTURE
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                5-Stage Volumetric Strata
              </h2>
            </div>
            <span className="text-xs font-mono text-[#64748B] hidden sm:inline">
              Click any card to inspect full technical data
            </span>
          </div>

          {/* Interactive Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {STAGES.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.title}
                  onClick={() => setActiveModalData(node)}
                  className="group cursor-pointer p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] hover:border-[#38BDF8] hover:bg-[#10253D] transition-all duration-200 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] font-bold text-[#64748B] group-hover:text-[#38BDF8]">
                        STAGE {node.stage}
                      </span>
                      <Icon className="w-4 h-4 text-[#38BDF8]" />
                    </div>
                    <div className="font-bold text-sm text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors">
                      {node.title}
                    </div>
                    <div className="text-[11px] font-mono text-[#94A3B8]">
                      {node.subtitle}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#243B53]/60 flex items-center justify-between text-[11px] font-mono text-[#38BDF8]">
                    <span>Inspect Specs</span>
                    <Info className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE 3D ULPIN DECODER (CLICK ANY SEGMENT FOR POPUP) */}
      <section className="py-12 border-b border-[#243B53] bg-[#050E1B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-6 space-y-1">
            <span className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-widest font-bold">
              3D DIGITAL IDENTITY DECODER
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
              Interactive 3D ULPIN Specimen
            </h2>
            <p className="text-xs font-mono text-[#64748B]">
              Click each segment to open its cryptographic breakdown
            </p>
          </div>

          <div className="max-w-2xl mx-auto p-5 rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-2xl text-center space-y-4">
            {/* Interactive Segments Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xl sm:text-3xl font-black">
              {[
                { key: 'BASE', label: 'Ground Parcel', color: 'text-[#38BDF8] border-[#38BDF8]/40 hover:bg-[#38BDF8]/10' },
                { key: 'V07', label: 'Floor 07 Plinth', color: 'text-[#60A5FA] border-[#60A5FA]/40 hover:bg-[#60A5FA]/10' },
                { key: 'U0704', label: 'Flat 0704 Unit', color: 'text-[#22C55E] border-[#22C55E]/40 hover:bg-[#22C55E]/10' },
                { key: 'CX', label: 'Mod-37 Checksum', color: 'text-[#A855F7] border-[#A855F7]/40 hover:bg-[#A855F7]/10' },
              ].map((seg, i) => (
                <React.Fragment key={seg.key}>
                  <button
                    onClick={() => setActiveUlpinSegment(seg.key)}
                    className={`px-3 py-2 rounded-xl bg-[#071426] border ${seg.color} transition-all shadow-md active:scale-95 group`}
                    title={`Inspect ${seg.label}`}
                  >
                    <span>{seg.key}</span>
                    <span className="block text-[9px] font-normal tracking-normal text-[#64748B] group-hover:text-[#F8FAFC]">
                      {seg.label}
                    </span>
                  </button>
                  {i < 3 && <span className="text-[#243B53]">-</span>}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-2 flex justify-center gap-3 font-mono text-xs">
              <Link
                to="/validate?ulpin=UP28KP2GNIDA0A-V07-U704-C9"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38BDF8] text-[#071426] font-bold hover:bg-[#60A5FA] transition-colors"
              >
                <span>Verify Specimen in Ledger</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MULTI-SENSOR CONSENSUS (METRIC TILES WITH POPUP AUDITS) */}
      <section className="py-12 border-b border-[#243B53] bg-[#071426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div>
              <span className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-widest font-bold">
                SENSOR CONSENSUS AUDIT
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                94% Cadastral Geometric Proof
              </h2>
            </div>
            <span className="text-xs font-mono text-[#64748B]">
              Multi-sensor fusion verified across 4 spatial layers
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            {[
              { key: 'satellite', name: 'Satellite Ortho', score: '96%', res: '0.3m GSD', icon: Radio, color: 'text-[#38BDF8]' },
              { key: 'drone', name: 'Drone Orthomosaic', score: '98%', res: '0.02m GSD', icon: Sparkles, color: 'text-[#22C55E]' },
              { key: 'lidar', name: 'Mobile 3D LiDAR', score: '92%', res: '120 pts/m²', icon: Cpu, color: 'text-[#60A5FA]' },
              { key: 'sanction', name: 'Sanctioned Blueprints', score: '90%', res: '1:500 Scale', icon: FileCheck2, color: 'text-[#F59E0B]' },
            ].map((sensor) => {
              const Icon = sensor.icon;
              return (
                <div
                  key={sensor.key}
                  onClick={() => setActiveSensorModal(sensor.key)}
                  className="cursor-pointer p-3.5 rounded-xl bg-[#0B1F33] border border-[#243B53] hover:border-[#38BDF8] hover:bg-[#10253D] transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#94A3B8]">{sensor.name}</span>
                    <Icon className={`w-4 h-4 ${sensor.color}`} />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-[#F8FAFC]">{sensor.score}</span>
                    <span className="text-[10px] text-[#64748B]">{sensor.res}</span>
                  </div>
                  <div className="mt-2 text-[10px] text-[#38BDF8] flex items-center justify-between border-t border-[#243B53]/40 pt-1.5">
                    <span>Audit Data</span>
                    <Info className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. QUICK LAUNCH CTA */}
      <section className="py-10 bg-[#050E1B] text-center">
        <div className="max-w-xl mx-auto px-4 space-y-4">
          <h3 className="text-xl font-bold text-[#F8FAFC]">
            Ready to explore 3D Cadastral Intelligence?
          </h3>
          <div className="flex justify-center gap-3 font-mono text-xs">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#38BDF8] text-[#071426] font-bold hover:bg-[#60A5FA] transition-all shadow-lg shadow-[#38BDF8]/20"
            >
              <span>Launch 3D Explorer</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0B1F33] text-[#F8FAFC] border border-[#243B53] hover:border-[#38BDF8] transition-all"
            >
              <span>Surveyor Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* INTERACTIVE POPUPS / MODALS (FOR DETAILED INFORMATION ON DEMAND) */}
      {/* ========================================================================= */}

      {/* 1. Stage Technical Inspector Modal */}
      {activeModalData && (
        <CadastralModal
          isOpen={!!activeModalData}
          onClose={() => setActiveModalData(null)}
          title={activeModalData.title}
          subtitle={activeModalData.subtitle}
          badge={`STAGE ${activeModalData.stage}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#071426] border border-[#243B53] space-y-2">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">
                Geometric & Survey Parameters
              </span>
              <div className="grid grid-cols-2 gap-2">
                {activeModalData.specs.map((sp) => (
                  <div key={sp.label} className="p-2 rounded bg-[#0B1F33]">
                    <div className="text-[10px] text-[#64748B]">{sp.label}</div>
                    <div className="text-xs font-bold text-[#F8FAFC] mt-0.5">{sp.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#94A3B8] leading-relaxed">
              {activeModalData.summary}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setActiveModalData(null)}
                className="px-3 py-1.5 rounded-lg bg-[#0B1F33] text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Close
              </button>
              <Link
                to={activeModalData.actionRoute}
                className="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#071426] font-bold hover:bg-[#60A5FA] flex items-center gap-1.5"
              >
                <span>Jump to 3D View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </CadastralModal>
      )}

      {/* 2. ULPIN Segment Inspector Modal */}
      {activeUlpinSegment && (
        <CadastralModal
          isOpen={!!activeUlpinSegment}
          onClose={() => setActiveUlpinSegment(null)}
          title={`ULPIN Segment: ${activeUlpinSegment}`}
          subtitle="3D Spatial Identifier Encoding Protocol"
          badge="ULPIN SPEC"
        >
          <div className="space-y-4">
            {activeUlpinSegment === 'BASE' && (
              <div className="space-y-3">
                <div className="text-xs text-[#CBD5E1]">
                  Encodes the primary Survey of India ground revenue parcel footprint (UP-GNB-KP2-0442).
                </div>
                <div className="p-3 rounded-lg bg-[#071426] border border-[#243B53] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">State Code:</span>
                    <span className="text-[#F8FAFC]">UP (09)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">District / Tehsil:</span>
                    <span className="text-[#F8FAFC]">Gautam Buddha Nagar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Plot Coordinates:</span>
                    <span className="text-[#38BDF8]">28.4682°N, 77.5042°E</span>
                  </div>
                </div>
              </div>
            )}

            {activeUlpinSegment === 'V07' && (
              <div className="space-y-3">
                <div className="text-xs text-[#CBD5E1]">
                  Specifies vertical elevation datum above Ground Zero (+33.60 meters).
                </div>
                <div className="p-3 rounded-lg bg-[#071426] border border-[#243B53] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Floor Index:</span>
                    <span className="text-[#38BDF8]">Level 07 (Residential)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Floor Plate Height:</span>
                    <span className="text-[#F8FAFC]">3.50 Meters Clear</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Plinth Boundary:</span>
                    <span className="text-[#22C55E]">Sanctioned Profile Matched</span>
                  </div>
                </div>
              </div>
            )}

            {activeUlpinSegment === 'U0704' && (
              <div className="space-y-3">
                <div className="text-xs text-[#CBD5E1]">
                  Designates the exclusive privatized apartment sub-unit boundary.
                </div>
                <div className="p-3 rounded-lg bg-[#071426] border border-[#243B53] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Unit Number:</span>
                    <span className="text-[#22C55E]">Flat 0704</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Carpet Area:</span>
                    <span className="text-[#F8FAFC]">185.00 m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Registry Certificate:</span>
                    <span className="text-[#38BDF8]">Clear Title (Deed Verified)</span>
                  </div>
                </div>
              </div>
            )}

            {activeUlpinSegment === 'CX' && (
              <div className="space-y-3">
                <div className="text-xs text-[#CBD5E1]">
                  Mod-37 Spatial Hash check digit guarding against transcription and cadastral fraud.
                </div>
                <div className="p-3 rounded-lg bg-[#071426] border border-[#243B53] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Checksum Algo:</span>
                    <span className="text-[#A855F7]">ISO/IEC 7064 Mod-37,36</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Integrity Status:</span>
                    <span className="text-[#22C55E]">Cryptographically Valid</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveUlpinSegment(null)}
                className="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#071426] font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </CadastralModal>
      )}

      {/* 3. Sensor Audit Modal */}
      {activeSensorModal && (
        <CadastralModal
          isOpen={!!activeSensorModal}
          onClose={() => setActiveSensorModal(null)}
          title={`Sensor Calibration Audit`}
          subtitle="Multi-Sensor Spatial Consensus Record"
          badge="SENSOR AUDIT"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#071426] border border-[#243B53] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Sensor Feed:</span>
                <span className="text-[#38BDF8] uppercase font-bold">{activeSensorModal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Survey Datum:</span>
                <span className="text-[#F8FAFC]">WGS84 / UTM Zone 43N</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">RMSE Error:</span>
                <span className="text-[#22C55E]">&lt; 0.04m Horizontal / &lt; 0.06m Vertical</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Certification:</span>
                <span className="text-[#F8FAFC]">Survey of India Technical Standard 2024</span>
              </div>
            </div>

            <div className="text-xs text-[#94A3B8]">
              Automated topological validation verifies boundary lines across all 4 sensor inputs with zero self-intersection or parcel encroachment.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveSensorModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#071426] font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        </CadastralModal>
      )}
    </div>
  );
};
