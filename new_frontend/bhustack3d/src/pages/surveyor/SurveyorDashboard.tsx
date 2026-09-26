import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCadastral } from '../../context/CadastralContext';
import { surveyService } from '../../services/surveyService';
import { SurveyRecord, Building } from '../../types';
import { Cadastral3DViewer } from '../../components/cadastral-3d/Cadastral3DViewer';
import { CadastralModal } from '../../components/ui/CadastralModal';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Building2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Sparkles,
  Search,
  Filter,
  Layers,
  Box,
  Eye,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Radio,
  Download,
  Printer,
  FileText,
  Activity,
  Award,
  Navigation,
} from 'lucide-react';

export const SurveyorDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    buildings,
    parcels,
    selectBuilding,
    selectParcel,
    autoAssign3DUlpinAllBuildings,
    autoFlagBuildingsForApproval,
    lastActionFeedback,
    clearFeedback,
    currentTheme,
  } = useCadastral();
  const navigate = useNavigate();

  const [surveyRecords, setSurveyRecords] = useState<SurveyRecord[]>([]);
  const [stats, setStats] = useState({
    totalBuildingsSurveyed: 0,
    approvedCount: 0,
    pendingApprovalCount: 0,
    totalArea: 0,
    avgScore: 96,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING_APPROVAL'>('ALL');
  const [show3DViewport, setShow3DViewport] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Modal states
  const [showNewSurveyModal, setShowNewSurveyModal] = useState(false);
  const [selectedRecordForCert, setSelectedRecordForCert] = useState<SurveyRecord | null>(null);

  // New Survey Form state
  const [newBldgName, setNewBldgName] = useState('');
  const [newLocation, setNewLocation] = useState('Knowledge Park II, Greater Noida, Uttar Pradesh');
  const [newSurveyDate, setNewSurveyDate] = useState(new Date().toISOString().split('T')[0]);
  const [newHeight, setNewHeight] = useState('42');
  const [newFloors, setNewFloors] = useState('9');
  const [newMethodology, setNewMethodology] = useState<SurveyRecord['methodology']>('Drone Photogrammetry');
  const [newNotes, setNewNotes] = useState('Volumetric boundary and height envelope audited against master layout plan.');

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    const records = await surveyService.getSurveyRecords();
    setSurveyRecords(records);
    const s = await surveyService.getSurveyStats();
    setStats(s);
  };

  const handleAutoAssign = async () => {
    setIsProcessingAction(true);
    try {
      await autoAssign3DUlpinAllBuildings();
      await loadSurveys();
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAutoFlag = async () => {
    setIsProcessingAction(true);
    try {
      await autoFlagBuildingsForApproval();
      await loadSurveys();
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleApproveRecord = async (recordId: string) => {
    const updated = await surveyService.approveSurveyRecord(recordId);
    setSurveyRecords(updated);
    const s = await surveyService.getSurveyStats();
    setStats(s);
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBldgName.trim()) return;

    const bldgNum = String(surveyRecords.length + 1).padStart(2, '0');
    await surveyService.addSurveyRecord({
      buildingId: `bldg-custom-${Date.now()}`,
      buildingName: newBldgName,
      parcelId: 'parcel-kp2-0442',
      parcelName: 'Knowledge Park II — Institutional Sector 3',
      location: newLocation,
      coordinates: { lat: 28.4682 + (Math.random() - 0.5) * 0.01, lng: 77.5042 + (Math.random() - 0.5) * 0.01 },
      surveyDate: newSurveyDate,
      surveyorId: user?.id || 'usr-surv-01',
      surveyorName: user?.fullName || 'Chief Cadastral Surveyor (Officer #704)',
      ulpin3D: `UP-GNB-B${bldgNum}-3DULPIN-${Math.floor(1000 + Math.random() * 9000)}`,
      heightMeters: Number(newHeight) || 35,
      floorsCount: Number(newFloors) || 8,
      areaSqM: (Number(newFloors) || 8) * 1600,
      methodology: newMethodology,
      status: 'APPROVED',
      complianceScore: 97,
      notes: newNotes,
      inspectionRef: `SURV/2026/UP-GNB/${Math.floor(1000 + Math.random() * 9000)}`,
    });

    await loadSurveys();
    setShowNewSurveyModal(false);
    setNewBldgName('');
  };

  const handleViewBuildingIn3D = (record: SurveyRecord) => {
    const bldg = buildings.find((b) => b.id === record.buildingId || b.name.includes(record.buildingName.split('(')[0].trim()));
    if (bldg) {
      selectBuilding(bldg.id);
    }
    navigate(`/explore?bldg=${record.buildingId}`);
  };

  // Filter records
  const filteredRecords = surveyRecords.filter((rec) => {
    const matchesSearch =
      rec.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.ulpin3D.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.inspectionRef.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'APPROVED' && rec.status === 'APPROVED') ||
      (statusFilter === 'PENDING_APPROVAL' && (rec.status === 'PENDING_APPROVAL' || rec.status === 'FLAGGED_DISCREPANCY'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#071426] text-[#F8FAFC] pb-16">
      {/* Toast Feedback Notification */}
      {lastActionFeedback && (
        <div className="sticky top-16 z-50 px-4 py-2.5 bg-[#0B1F33] border-b border-[#38BDF8]/40 shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 max-w-5xl mx-auto w-full">
            {lastActionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-mono text-[#F8FAFC]">
              {lastActionFeedback.message}
            </span>
            <button
              onClick={clearFeedback}
              className="ml-auto text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 1. SURVEYOR IDENTITY & BANNER */}
      <div className="border-b border-[#243B53] bg-gradient-to-b from-[#0B1F33] to-[#071426] pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                OFFICIAL FIELD SURVEYOR PORTAL
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                RTK-GNSS LIVE FIX (±0.012m)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] flex items-center gap-3">
              <Compass className="w-7 h-7 text-[#38BDF8]" />
              SURVEYOR CADASTRE DASHBOARD
            </h1>
            <p className="text-xs sm:text-sm font-mono text-[#94A3B8]">
              Officer:{' '}
              <span className="text-[#F8FAFC] font-semibold">
                {user?.fullName || 'Chief Cadastral Surveyor (Officer #704)'}
              </span>{' '}
              • Division:{' '}
              <span className="text-[#38BDF8]">
                {user?.designation || 'Cadastral Survey Division — Greater Noida'}
              </span>
            </p>
          </div>

          {/* Live backend actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/surveyor/records" className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[#38BDF8] text-[#071426]">Manage live parcel records</Link>
            <Link to="/flags" className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[#10253D] text-amber-300 border border-amber-400/40">Review flagged records</Link>

            <button
              onClick={() => setShow3DViewport((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-mono border transition-all ${
                show3DViewport
                  ? 'bg-[#22C55E] text-[#071426] font-bold border-[#22C55E]'
                  : 'bg-[#0B1F33] text-[#94A3B8] border-[#243B53] hover:text-[#F8FAFC]'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1.5" />
              {show3DViewport ? 'Close 3D' : 'Open 3D'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* 2. STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] shadow-lg space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
              <span>BUILDINGS SURVEYED</span>
              <Building2 className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#F8FAFC] font-mono">
              {stats.totalBuildingsSurveyed}
            </div>
            <div className="text-[11px] font-mono text-[#22C55E] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{stats.approvedCount} certified & sealed</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] shadow-lg space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
              <span>APPROVAL QUEUE</span>
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#F59E0B] font-mono">
              {stats.pendingApprovalCount}
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8]">
              Awaiting officer field sign-off
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] shadow-lg space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
              <span>TOTAL 3D AREA DEMARCATED</span>
              <Layers className="w-4 h-4 text-[#60A5FA]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#F8FAFC] font-mono">
              {(stats.totalArea).toLocaleString()} <span className="text-sm text-[#94A3B8]">m²</span>
            </div>
            <div className="text-[11px] font-mono text-[#38BDF8]">
              Volumetric multi-level footprint
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] shadow-lg space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
              <span>AVERAGE ACCURACY</span>
              <Award className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#22C55E] font-mono">
              {stats.avgScore}%
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8]">
              LiDAR & Drone point cloud confidence
            </div>
          </div>
        </div>

        {/* 3. OPTIONAL EMBEDDED WIDE 3D VIEWPORT */}
        {show3DViewport && (
          <div className="p-4 rounded-2xl bg-[#0B1F33] border border-[#38BDF8]/40 shadow-2xl space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-xs font-mono font-bold text-[#F8FAFC] uppercase">
                  Interactive 3D Cadastral Digital Twin (Surveyor Mode — Wide Primary)
                </span>
              </div>
              <button
                onClick={() => setShow3DViewport(false)}
                className="text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Hide Viewport ✕
              </button>
            </div>
            <Cadastral3DViewer defaultShape="wide" heightClass="h-[440px] sm:h-[500px]" />
          </div>
        )}

        {/* 4. PREVIOUS RECORDS & SURVEY LOG */}
        <div className="rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-xl overflow-hidden">
          {/* Section Header with Search & Filters */}
          <div className="p-4 sm:p-6 border-b border-[#243B53] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC] flex items-center gap-2 font-mono">
                <FileCheck2 className="w-5 h-5 text-[#38BDF8]" />
                PREVIOUS SURVEY RECORDS & BUILDING INSPECTION LOG
              </h2>
              <p className="text-xs font-mono text-[#94A3B8] mt-0.5">
                Historical records of all buildings surveyed by {user?.fullName || 'Officer #704'} with date, GPS coordinates, location, and statutory 3D ULPIN.
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search building, location, ULPIN..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#071426] border border-[#243B53] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center bg-[#071426] p-1 rounded-lg border border-[#243B53] text-xs font-mono">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded ${
                    statusFilter === 'ALL'
                      ? 'bg-[#38BDF8] text-[#071426] font-bold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  All ({surveyRecords.length})
                </button>
                <button
                  onClick={() => setStatusFilter('APPROVED')}
                  className={`px-2.5 py-1 rounded ${
                    statusFilter === 'APPROVED'
                      ? 'bg-[#22C55E] text-[#071426] font-bold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  Approved ({stats.approvedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING_APPROVAL')}
                  className={`px-2.5 py-1 rounded ${
                    statusFilter === 'PENDING_APPROVAL'
                      ? 'bg-[#F59E0B] text-[#071426] font-bold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  Flagged ({stats.pendingApprovalCount})
                </button>
              </div>
            </div>
          </div>

          {/* Table of Records */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#071426] text-[#94A3B8] uppercase text-[10px] tracking-wider border-b border-[#243B53]">
                <tr>
                  <th className="py-3 px-4">Building Name & Code</th>
                  <th className="py-3 px-4">Survey Date</th>
                  <th className="py-3 px-4">Location & Coordinates</th>
                  <th className="py-3 px-4">3D ULPIN</th>
                  <th className="py-3 px-4">Height / Floors</th>
                  <th className="py-3 px-4">Methodology</th>
                  <th className="py-3 px-4">Status & Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243B53]/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs font-mono text-[#64748B]">
                      No previous survey records match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#10253D]/50 transition-colors group"
                    >
                      {/* Building Name */}
                      <td className="py-3.5 px-4 font-semibold text-[#F8FAFC]">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                          <div>
                            <div>{rec.buildingName}</div>
                            <div className="text-[10px] text-[#64748B]">Ref: {rec.inspectionRef}</div>
                          </div>
                        </div>
                      </td>

                      {/* Survey Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#94A3B8]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                          <span>{rec.surveyDate}</span>
                        </div>
                      </td>

                      {/* Location & GPS */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#60A5FA] shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[#F8FAFC] truncate">{rec.location}</div>
                            <div className="text-[10px] text-[#64748B]">
                              {rec.coordinates.lat.toFixed(4)}°N, {rec.coordinates.lng.toFixed(4)}°E
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3D ULPIN */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#38BDF8]">
                        <span className="px-2 py-0.5 rounded bg-[#10253D] border border-[#38BDF8]/40 text-[11px]">
                          {rec.ulpin3D}
                        </span>
                      </td>

                      {/* Height / Floors */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#94A3B8]">
                        <div>{rec.heightMeters} m</div>
                        <div className="text-[10px] text-[#64748B]">{rec.floorsCount} Floors</div>
                      </td>

                      {/* Methodology */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-[#94A3B8] bg-[#071426] px-2 py-0.5 rounded border border-[#243B53]">
                          {rec.methodology}
                        </span>
                      </td>

                      {/* Status & Compliance */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {rec.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E]">
                              <CheckCircle2 className="w-3 h-3" />
                              APPROVED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B]">
                              <AlertTriangle className="w-3 h-3" />
                              PENDING SIGN-OFF
                            </span>
                          )}
                          <div className="text-[10px] text-[#64748B]">
                            Score: <span className="text-[#22C55E]">{rec.complianceScore}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleViewBuildingIn3D(rec)}
                          className="px-2.5 py-1 rounded bg-[#10253D] text-[#38BDF8] border border-[#243B53] hover:border-[#38BDF8] text-[11px] inline-flex items-center gap-1"
                          title="View 3D Digital Twin"
                        >
                          <Eye className="w-3 h-3" />
                          <span>3D</span>
                        </button>

                        <button
                          onClick={() => setSelectedRecordForCert(rec)}
                          className="px-2.5 py-1 rounded bg-[#071426] text-[#94A3B8] border border-[#243B53] hover:text-[#F8FAFC] text-[11px] inline-flex items-center gap-1"
                          title="View Official Survey Certificate"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Cert</span>
                        </button>

                        {rec.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveRecord(rec.id)}
                            className="px-2.5 py-1 rounded bg-[#22C55E] text-[#071426] font-bold text-[11px] inline-flex items-center gap-1 hover:bg-emerald-400"
                            title="Sign and Approve Survey"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary */}
          <div className="p-4 bg-[#071426] border-t border-[#243B53] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-[#94A3B8]">
            <div>
              Showing {filteredRecords.length} of {surveyRecords.length} historical survey records
            </div>
            <div className="flex items-center gap-4">
              <span>National Cadastre Datum: WGS-84</span>
              <span className="text-[#243B53]">|</span>
              <span className="text-[#22C55E]">All records cryptographically signed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. LOG NEW SURVEY RECORD MODAL */}
      <CadastralModal
        isOpen={showNewSurveyModal}
        onClose={() => setShowNewSurveyModal(false)}
        title="Log New Field Building Survey"
        subtitle="Survey of India Cadastral Mutation Register"
        badge="NEW INSPECTION"
        badgeColor="text-[#38BDF8] border-[#38BDF8]/40 bg-[#38BDF8]/10"
      >
        <form onSubmit={handleCreateSurvey} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[#94A3B8] mb-1 uppercase">Building Name</label>
            <input
              type="text"
              required
              value={newBldgName}
              onChange={(e) => setNewBldgName(e.target.value)}
              placeholder="e.g. Aryabhata Innovation Tower"
              className="w-full px-3 py-2 rounded-lg bg-[#071426] border border-[#243B53] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#94A3B8] mb-1 uppercase">Survey Date</label>
              <input
                type="date"
                value={newSurveyDate}
                onChange={(e) => setNewSurveyDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#071426] border border-[#243B53] text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] mb-1 uppercase">Methodology</label>
              <select
                value={newMethodology}
                onChange={(e) => setNewMethodology(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[#071426] border border-[#243B53] text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
              >
                <option value="Drone Photogrammetry">Drone Photogrammetry</option>
                <option value="Terrestrial LiDAR">Terrestrial LiDAR</option>
                <option value="RTK GNSS + Laser">RTK GNSS + Laser</option>
                <option value="Total Station & Satellite">Total Station & Satellite</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#94A3B8] mb-1 uppercase">Height (Meters)</label>
              <input
                type="number"
                value={newHeight}
                onChange={(e) => setNewHeight(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#071426] border border-[#243B53] text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] mb-1 uppercase">Floors Count</label>
              <input
                type="number"
                value={newFloors}
                onChange={(e) => setNewFloors(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#071426] border border-[#243B53] text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#94A3B8] mb-1 uppercase">Location / Zone</label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#071426] border border-[#243B53] text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div>
            <label className="block text-[#94A3B8] mb-1 uppercase">Officer Inspection Notes</label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#071426] border border-[#243B53] text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewSurveyModal(false)}
              className="px-4 py-2 rounded-lg bg-[#10253D] text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#38BDF8] text-[#071426] font-bold hover:bg-[#60A5FA]"
            >
              Save Survey Record
            </button>
          </div>
        </form>
      </CadastralModal>

      {/* 6. SURVEY CERTIFICATE / SPECIMEN MODAL */}
      <CadastralModal
        isOpen={!!selectedRecordForCert}
        onClose={() => setSelectedRecordForCert(null)}
        title="Official 3D Cadastral Survey Certificate"
        subtitle="Department of Land Resources & Survey of India"
        badge="STATUTORY RECORD"
        badgeColor="text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10"
      >
        {selectedRecordForCert && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#071426] border border-[#243B53] space-y-2">
              <div className="flex justify-between border-b border-[#243B53] pb-2">
                <span className="text-[#64748B]">Inspection Reference:</span>
                <span className="text-[#38BDF8] font-bold">{selectedRecordForCert.inspectionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Building Name:</span>
                <span className="text-[#F8FAFC] font-semibold">{selectedRecordForCert.buildingName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Assigned 3D ULPIN:</span>
                <span className="text-[#22C55E] font-bold">{selectedRecordForCert.ulpin3D}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Survey Date:</span>
                <span className="text-[#F8FAFC]">{selectedRecordForCert.surveyDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Location:</span>
                <span className="text-[#F8FAFC] text-right">{selectedRecordForCert.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">GPS Datum:</span>
                <span className="text-[#94A3B8]">
                  Lat {selectedRecordForCert.coordinates.lat.toFixed(4)}°, Lng {selectedRecordForCert.coordinates.lng.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Z-Axis Height & Floors:</span>
                <span className="text-[#F8FAFC]">{selectedRecordForCert.heightMeters}m ({selectedRecordForCert.floorsCount} Floors)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Survey Officer:</span>
                <span className="text-[#38BDF8]">{selectedRecordForCert.surveyorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Compliance Score:</span>
                <span className="text-[#22C55E] font-bold">{selectedRecordForCert.complianceScore}% Verified</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#10253D] border border-[#243B53] text-[11px] text-[#94A3B8]">
              <span className="font-bold text-[#F8FAFC]">Inspector Remarks: </span>
              {selectedRecordForCert.notes}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-[#64748B]">
                Cryptographic Checksum: SHA-256 Verified
              </span>
              <button
                onClick={() => setSelectedRecordForCert(null)}
                className="px-4 py-1.5 rounded-lg bg-[#38BDF8] text-[#071426] font-bold hover:bg-[#60A5FA]"
              >
                Close Certificate
              </button>
            </div>
          </div>
        )}
      </CadastralModal>
    </div>
  );
};
