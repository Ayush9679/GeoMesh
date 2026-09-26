import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCadastral } from '../../context/CadastralContext';
import { parcelService } from '../../services/parcelService';
import { floorService } from '../../services/floorService';
import { flatService } from '../../services/flatService';
import { DashboardKPIs, Parcel, Building, Floor, Flat } from '../../types';
import { Cadastral3DViewer } from '../../components/cadastral-3d/Cadastral3DViewer';
import {
  LayoutDashboard,
  MapPin,
  Building2,
  Layers,
  Box,
  ShieldCheck,
  Radio,
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

type ActiveTab = 'dashboard' | 'parcels' | 'buildings' | 'floors' | 'flats' | 'ulpin' | 'integrations' | 'settings';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    parcels,
    buildings,
    floors,
    flats,
    selectParcel,
    selectBuilding,
    selectFloor,
    refreshData,
    autoAssign3DUlpinAllBuildings,
    autoFlagBuildingsForApproval,
    lastActionFeedback,
    clearFeedback,
  } = useCadastral();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals for editing/creating cadastral records
  const [showAddParcelModal, setShowAddParcelModal] = useState(false);
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);

  // Form states for new parcel
  const [newParcelName, setNewParcelName] = useState('');
  const [newParcelUlpin, setNewParcelUlpin] = useState('');
  const [newParcelArea, setNewParcelArea] = useState(5000);
  const [newParcelZone, setNewParcelZone] = useState('Zone 02 — Central District');
  const [newParcelState, setNewParcelState] = useState('Uttar Pradesh');

  // Form states for new building
  const [newBldgName, setNewBldgName] = useState('');
  const [newBldgCode, setNewBldgCode] = useState('BUILDING 04');
  const [newBldgHeight, setNewBldgHeight] = useState(45);
  const [newBldgFloors, setNewBldgFloors] = useState(10);

  const isCitizen = user?.role === 'Citizen';

  useEffect(() => {
    async function loadKpis() {
      try {
        const data = await parcelService.getDashboardKPIs();
        setKpis(data);
      } catch (err) {
        console.warn('Failed to load KPIs:', err);
      }
    }
    loadKpis();
  }, [parcels, buildings]);

  const handleCreateParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCitizen) return;
    try {
      await parcelService.createParcel({
        name: newParcelName,
        ulpin: newParcelUlpin || `UP-GNB-Z2-${Math.floor(1000 + Math.random() * 9000)}`,
        area: Number(newParcelArea),
        zone: newParcelZone,
        state: newParcelState,
      });
      await refreshData();
      setShowAddParcelModal(false);
      setNewParcelName('');
      setNewParcelUlpin('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCitizen || parcels.length === 0) return;
    try {
      await parcelService.createBuilding(parcels[0].id, {
        name: newBldgName,
        code: newBldgCode,
        height: Number(newBldgHeight),
        floorsCount: Number(newBldgFloors),
      });
      await refreshData();
      setShowAddBuildingModal(false);
      setNewBldgName('');
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'parcels', label: 'Parcels', icon: MapPin },
    { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'floors', label: 'Floors', icon: Layers },
    { id: 'flats', label: 'Flats', icon: Box },
    { id: 'ulpin', label: 'ULPIN Index', icon: ShieldCheck },
    { id: 'integrations', label: 'Integrations', icon: Radio },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Filtered parcels table
  const filteredParcels = parcels.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      p.ulpin.toLowerCase().includes(tableSearch.toLowerCase()) ||
      p.state.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#071426] flex flex-col md:flex-row">
      {/* 1. SIDEBAR (Strict Section 22: Lucide icons, no emojis) */}
      <aside className="w-full md:w-64 bg-[#0B1F33] border-r border-[#243B53] p-4 flex flex-col justify-between shrink-0 font-mono text-xs">
        <div className="space-y-6">
          {/* Surveyor Profile Header */}
          <div className="p-3 rounded-lg bg-[#10253D] border border-[#243B53] space-y-1">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">Command Authority</div>
            <div className="font-bold text-[#F8FAFC] truncate">{user?.fullName || 'Cadastral Surveyor'}</div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-[#38BDF8] text-[11px]">{user?.role || 'Surveyor'} Mode</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-sm'
                      : 'text-[#94A3B8] hover:bg-[#10253D] hover:text-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#243B53]/60">
            <Link
              to="/surveyor"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#10253D] text-[#38BDF8] border border-[#38BDF8]/30 hover:bg-[#1A365D] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                <span>Surveyor Portal</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Session actions */}
        <div className="pt-6 border-t border-[#243B53] space-y-3">

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#EF4444] hover:bg-[#10253D] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Protected Notice for Citizens */}
        {isCitizen && (
          <div className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-between text-xs font-mono text-[#F59E0B]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                READ-ONLY PUBLIC CITIZEN MODE: Editing and mutation capabilities are restricted to certified Surveyors & Administrators.
              </span>
            </div>
          </div>
        )}

        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
                  GIS CADASTRAL COMMAND CENTER
                </h1>
                <p className="text-xs font-mono text-[#94A3B8] mt-1">
                  Real-time spatial records registry & 3D digital twin telemetry
                </p>
              </div>

              {!isCitizen && (
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {/* Auto Assign 3D ULPIN */}
                  <button
                    onClick={async () => {
                      setIsProcessingAction(true);
                      try {
                        await autoAssign3DUlpinAllBuildings();
                      } finally {
                        setIsProcessingAction(false);
                      }
                    }}
                    disabled={isProcessingAction}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#38BDF8] text-[#071426] font-bold hover:bg-[#60A5FA] transition-colors disabled:opacity-50"
                    title="Auto-assign 3D ULPINs to all buildings"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Auto 3D ULPIN</span>
                  </button>

                  {/* Auto Flag for Approval */}
                  <button
                    onClick={async () => {
                      setIsProcessingAction(true);
                      try {
                        await autoFlagBuildingsForApproval();
                      } finally {
                        setIsProcessingAction(false);
                      }
                    }}
                    disabled={isProcessingAction}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F59E0B] text-[#071426] font-bold hover:bg-[#FBBF24] transition-colors disabled:opacity-50"
                    title="Auto-flag buildings for sanction & surveyor approval"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Auto-Flag Approval</span>
                  </button>

                  {/* Surveyor Dashboard Link */}
                  <Link
                    to="/surveyor"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#10253D] text-[#38BDF8] border border-[#38BDF8]/40 hover:bg-[#1A365D] transition-colors"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Surveyor Logs</span>
                  </Link>

                  <button
                    onClick={() => setShowAddParcelModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#10253D] text-[#F8FAFC] border border-[#243B53] hover:bg-[#1A365D] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>NEW PARCEL</span>
                  </button>
                  <button
                    onClick={() => setShowAddBuildingModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#10253D] text-[#38BDF8] border border-[#38BDF8]/40 hover:bg-[#142D48] transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>ADD BUILDING</span>
                  </button>
                </div>
              )}
            </div>

            {/* Toast Feedback */}
            {lastActionFeedback && (
              <div className="p-3 rounded-xl bg-[#0B1F33] border border-[#38BDF8]/40 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-[#F8FAFC]">
                  {lastActionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  )}
                  <span>{lastActionFeedback.message}</span>
                </div>
                <button
                  onClick={clearFeedback}
                  className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* KPI Cards (Section 23: Total Parcels, Buildings, Floors, Flats) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
              {[
                { label: 'Total Parcels', value: kpis?.totalParcels ?? parcels.length, unit: 'Parcels' },
                { label: 'Total Buildings', value: kpis?.totalBuildings ?? buildings.length, unit: 'Towers' },
                { label: 'Total Floors', value: kpis?.totalFloors ?? floors.length, unit: 'Plates' },
                { label: 'Total Flats', value: kpis?.totalFlats ?? flats.length, unit: 'Units' },
                {
                  label: 'Registered Area',
                  value: `${Math.round((kpis?.totalAreaSqM ?? 67350) / 1000)}k`,
                  unit: 'Sq. Meters',
                },
                { label: 'Avg Confidence', value: `${kpis?.avgConfidence ?? 93}%`, unit: 'Multi-Sensor' },
              ].map((kpi) => (
                <div key={kpi.label} className="p-3.5 rounded-xl bg-[#0B1F33] border border-[#243B53]">
                  <div className="text-[10px] text-[#64748B] uppercase">{kpi.label}</div>
                  <div className="text-xl sm:text-2xl font-black text-[#F8FAFC] mt-1">{kpi.value}</div>
                  <div className="text-[10px] text-[#38BDF8]">{kpi.unit}</div>
                </div>
              ))}
            </div>

            {/* Interactive 3D Cadastral Activity Visualization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#38BDF8]" />
                  Active 3D Cadastral Scene (Knowledge Park II)
                </span>
                <button
                  onClick={() => navigate('/explore')}
                  className="text-[#38BDF8] hover:underline flex items-center gap-1"
                >
                  <span>Open Full Inspector</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
              <Cadastral3DViewer heightClass="h-[420px]" />
            </div>

            {/* Parcels Overview Table */}
            <div className="p-5 rounded-2xl bg-[#0B1F33] border border-[#243B53] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="font-bold text-sm text-[#F8FAFC]">Registered Cadastral Parcels</div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#64748B]" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Filter parcels..."
                      className="pl-8 pr-3 py-1 bg-[#10253D] border border-[#243B53] rounded text-xs text-[#F8FAFC]"
                    />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#243B53] text-[#64748B] uppercase text-[10px]">
                      <th className="py-2.5 px-3">Parcel</th>
                      <th className="py-2.5 px-3">ULPIN</th>
                      <th className="py-2.5 px-3">Area (m²)</th>
                      <th className="py-2.5 px-3">Confidence</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243B53]/50">
                    {filteredParcels.map((p) => (
                      <tr key={p.id} className="hover:bg-[#10253D]/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#F8FAFC]">{p.name}</div>
                          <div className="text-[10px] text-[#64748B]">{p.district}, {p.state}</div>
                        </td>
                        <td className="py-3 px-3 text-[#38BDF8] font-bold">{p.ulpin}</td>
                        <td className="py-3 px-3 text-[#F8FAFC]">{p.area.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <span className="text-[#22C55E] font-bold">{p.confidence}%</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              selectParcel(p.id);
                              navigate('/explore');
                            }}
                            className="p-1.5 rounded hover:bg-[#10253D] text-[#38BDF8] transition-colors"
                            title="View 3D Cadastral Model"
                          >
                            <Eye className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PARCELS */}
        {activeTab === 'parcels' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#F8FAFC]">Cadastral Parcels Registry</h2>
                <p className="text-xs font-mono text-[#94A3B8]">Ground boundaries and spatial polygon records</p>
              </div>
              {!isCitizen && (
                <button
                  onClick={() => setShowAddParcelModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD PARCEL</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              {parcels.map((p) => (
                <div key={p.id} className="p-5 rounded-xl bg-[#0B1F33] border border-[#243B53] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#F8FAFC]">{p.name}</span>
                    <span className="text-[#22C55E] text-[10px] px-2 py-0.5 rounded bg-[#22C55E]/10 border border-[#22C55E]/30">
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#38BDF8]">{p.ulpin}</div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#243B53] text-[11px]">
                    <div>
                      <span className="text-[#64748B]">Area: </span>
                      <span className="text-[#F8FAFC] font-semibold">{p.area.toLocaleString()} m²</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Buildings: </span>
                      <span className="text-[#F8FAFC] font-semibold">{p.buildingCount}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Confidence: </span>
                      <span className="text-[#22C55E] font-semibold">{p.confidence}%</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Zone: </span>
                      <span className="text-[#F8FAFC] truncate">{p.zone.split('(')[0]}</span>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        selectParcel(p.id);
                        navigate('/explore');
                      }}
                      className="px-3 py-1.5 rounded bg-[#10253D] text-[#38BDF8] hover:bg-[#142D48] transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect in 3D</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: BUILDINGS */}
        {activeTab === 'buildings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#F8FAFC]">3D Building Models (LOD-2)</h2>
                <p className="text-xs font-mono text-[#94A3B8]">Sanctioned architectural volumes and vertical envelopes</p>
              </div>
              {!isCitizen && (
                <button
                  onClick={() => setShowAddBuildingModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD BUILDING</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              {buildings.map((b) => (
                <div key={b.id} className="p-5 rounded-xl bg-[#0B1F33] border border-[#243B53] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#F8FAFC]">{b.name}</span>
                    <span className="text-[#38BDF8]">{b.code}</span>
                  </div>
                  <div className="text-xs text-[#94A3B8]">{b.buildingType}</div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#243B53] text-[11px]">
                    <div>
                      <span className="text-[#64748B]">Height: </span>
                      <span className="text-[#F8FAFC] font-semibold">{b.height}m</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Floors: </span>
                      <span className="text-[#F8FAFC] font-semibold">{b.floorsCount}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Area: </span>
                      <span className="text-[#F8FAFC] font-semibold">{b.area.toLocaleString()} m²</span>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-[10px] text-[#64748B]">ULPIN: {b.ulpin}</span>
                    <button
                      onClick={() => {
                        selectBuilding(b.id);
                        navigate('/explore');
                      }}
                      className="px-3 py-1.5 rounded bg-[#10253D] text-[#38BDF8] hover:bg-[#142D48] transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Explore Floors</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: FLOORS */}
        {activeTab === 'floors' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F8FAFC]">Vertical Floor Slices</h2>
              <p className="text-xs font-mono text-[#94A3B8]">Floor plates from basement levels (B2, B1), Ground (G) to Upper Floors</p>
            </div>

            <div className="p-5 rounded-xl bg-[#0B1F33] border border-[#243B53]">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#243B53] text-[#64748B] uppercase text-[10px]">
                      <th className="py-2.5 px-3">Floor Level</th>
                      <th className="py-2.5 px-3">Vertical Offset</th>
                      <th className="py-2.5 px-3">Area (m²)</th>
                      <th className="py-2.5 px-3">Units</th>
                      <th className="py-2.5 px-3">Floor ULPIN</th>
                      <th className="py-2.5 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243B53]/50">
                    {floors.map((fl) => (
                      <tr key={fl.id} className="hover:bg-[#10253D]/40">
                        <td className="py-3 px-3 font-bold text-[#38BDF8]">Floor {fl.floorLabel}</td>
                        <td className="py-3 px-3 text-[#F8FAFC]">{fl.heightOffset >= 0 ? `+${fl.heightOffset}` : fl.heightOffset} meters</td>
                        <td className="py-3 px-3 text-[#F8FAFC]">{fl.area} m²</td>
                        <td className="py-3 px-3 text-[#22C55E]">{fl.flatsCount} Units</td>
                        <td className="py-3 px-3 text-[#94A3B8]">{fl.ulpin}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              selectFloor(fl.id);
                              navigate('/explore');
                            }}
                            className="px-2 py-1 rounded bg-[#10253D] text-[#38BDF8] hover:bg-[#142D48]"
                          >
                            View Units
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FLATS */}
        {activeTab === 'flats' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F8FAFC]">Flat & Spatial Unit Registry</h2>
              <p className="text-xs font-mono text-[#94A3B8]">Individuated unit titles with deed status and 3D ULPIN</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              {flats.map((flat) => (
                <div key={flat.id} className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F8FAFC]">{flat.flatNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                      flat.status === 'CLEAR' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                    }`}>
                      {flat.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#38BDF8] font-bold">{flat.ulpin}</div>
                  <div className="text-[11px] text-[#94A3B8]">{flat.type} • {flat.area} m²</div>
                  <div className="text-[10px] text-[#64748B] pt-1 border-t border-[#243B53]">
                    {flat.ownerStatus}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ULPIN */}
        {activeTab === 'ulpin' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F8FAFC]">3D ULPIN Generation & Validation</h2>
              <p className="text-xs font-mono text-[#94A3B8]">Alphanumeric digital land identifiers adhering to national 3D cadastral specifications</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B1F33] border border-[#243B53] space-y-4">
              <div className="font-mono text-xs text-[#38BDF8]">
                BASE SPECIFICATION: ISO 19152 (Land Administration Domain Model - 3D LADM)
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                GeoMesh deterministically links ground parcel envelopes (BASE), vertical floor indices (V01-V99), and unit centroids (U0101-U9999) combined with a Mod-37 Luhn-derivative checksum (CX).
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => navigate('/validate')}
                  className="px-4 py-2 rounded-lg bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs"
                >
                  Launch Public Identity Validator
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F8FAFC]">National Ecosystem Integrations</h2>
              <p className="text-xs font-mono text-[#94A3B8]">Simulated gateways to DigiLocker Document Vault and Banking KYC</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl bg-[#0B1F33] border border-[#243B53] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#F8FAFC]">DigiLocker Title Gateway</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                    DEMO INTEGRATION
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Enables instantaneous pull of 3D Cadastral Spatial Deeds into citizen DigiLocker accounts upon mutation.
                </p>
                <div className="text-xs font-mono text-[#22C55E] flex items-center gap-1.5 pt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sandbox Protocol Active</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B1F33] border border-[#243B53] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#F8FAFC]">Bank KYC & Encumbrance API</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                    DEMO INTEGRATION
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Provides commercial banks real-time query access to verify title encumbrance before mortgage disbursals.
                </p>
                <div className="text-xs font-mono text-[#22C55E] flex items-center gap-1.5 pt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Encumbrance Register Linked (Mock)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F8FAFC]">Cadastral Engine Configuration</h2>
              <p className="text-xs font-mono text-[#94A3B8]">FastAPI backend bindings and geospatial CRS configurations</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B1F33] border border-[#243B53] space-y-4 font-mono text-xs">
              <div>
                <div className="text-[#64748B] mb-1">FastAPI Backend URL</div>
                <div className="p-2.5 rounded bg-[#10253D] border border-[#243B53] text-[#38BDF8]">
                  {import.meta.env.VITE_API_BASE_URL || '/api (proxied to http://localhost:8000)'}
                </div>
              </div>
              <div>
                <div className="text-[#64748B] mb-1">Cadastral Reference Datum</div>
                <div className="p-2.5 rounded bg-[#10253D] border border-[#243B53] text-[#F8FAFC]">
                  WGS84 / EPSG:4326 (Horizontal) + EGM2008 (Vertical Geoid)
                </div>
              </div>
              <div>
                <div className="text-[#64748B] mb-1">Active Authentication Token</div>
                <div className="p-2.5 rounded bg-[#10253D] border border-[#243B53] text-[#94A3B8] truncate">
                  {localStorage.getItem('GEOMESH_access_token') || 'Active Bearer Session'}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: New Parcel */}
      {showAddParcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071426]/80 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-2xl space-y-4 font-mono text-xs">
            <h3 className="text-base font-bold text-[#F8FAFC]">Register New 3D Cadastral Parcel</h3>
            <form onSubmit={handleCreateParcel} className="space-y-3">
              <div>
                <label className="block text-[#94A3B8] mb-1">Parcel Name / Sector</label>
                <input
                  type="text"
                  required
                  value={newParcelName}
                  onChange={(e) => setNewParcelName(e.target.value)}
                  placeholder="e.g. Sector 62 IT Corridor — Block 8"
                  className="w-full px-3 py-2 bg-[#10253D] border border-[#243B53] rounded text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-1">Assigned ULPIN</label>
                <input
                  type="text"
                  value={newParcelUlpin}
                  onChange={(e) => setNewParcelUlpin(e.target.value)}
                  placeholder="Leave empty for auto 3D generation"
                  className="w-full px-3 py-2 bg-[#10253D] border border-[#243B53] rounded text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-1">Registered Ground Area (m²)</label>
                <input
                  type="number"
                  required
                  value={newParcelArea}
                  onChange={(e) => setNewParcelArea(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#10253D] border border-[#243B53] rounded text-[#F8FAFC]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddParcelModal(false)}
                  className="px-4 py-2 rounded bg-[#10253D] text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#38BDF8] text-[#071426] font-bold"
                >
                  Create Parcel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Building */}
      {showAddBuildingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071426]/80 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-2xl space-y-4 font-mono text-xs">
            <h3 className="text-base font-bold text-[#F8FAFC]">Add 3D Superstructure Model</h3>
            <form onSubmit={handleCreateBuilding} className="space-y-3">
              <div>
                <label className="block text-[#94A3B8] mb-1">Building Name</label>
                <input
                  type="text"
                  required
                  value={newBldgName}
                  onChange={(e) => setNewBldgName(e.target.value)}
                  placeholder="e.g. Ramanujan Tower"
                  className="w-full px-3 py-2 bg-[#10253D] border border-[#243B53] rounded text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-1">Building Code</label>
                <input
                  type="text"
                  required
                  value={newBldgCode}
                  onChange={(e) => setNewBldgCode(e.target.value)}
                  placeholder="BUILDING 04"
                  className="w-full px-3 py-2 bg-[#10253D] border border-[#243B53] rounded text-[#F8FAFC]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Height (m)</label>
                  <input
                    type="number"
                    value={newBldgHeight}
                    onChange={(e) => setNewBldgHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#10253D] border border-[#243B53] rounded text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Floors</label>
                  <input
                    type="number"
                    value={newBldgFloors}
                    onChange={(e) => setNewBldgFloors(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#10253D] border border-[#243B53] rounded text-[#F8FAFC]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBuildingModal(false)}
                  className="px-4 py-2 rounded bg-[#10253D] text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#38BDF8] text-[#071426] font-bold"
                >
                  Add Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
