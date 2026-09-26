import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService, FlaggedItem } from '../../services/adminService';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Filter,
  RefreshCw,
  Building2,
  Layers,
  Home,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

const FLAG_STATUS_COLORS: Record<string, string> = {
  flagged: 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]',
  under_review: 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]',
  resolved_ok: 'bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E]',
  resolved_rejected: 'bg-[#6B7280]/20 border-[#6B7280]/40 text-[#94A3B8]',
  clean: 'bg-[#243B53]/40 border-[#243B53] text-[#94A3B8]',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  feature: <Building2 className="w-4 h-4 text-[#38BDF8]" />,
  floor: <Layers className="w-4 h-4 text-[#60A5FA]" />,
  flat: <Home className="w-4 h-4 text-[#A78BFA]" />,
};

export const FlagQueuePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('flagged');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [resolving, setResolving] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getFlaggedItems(statusFilter, entityFilter);
      setItems(data);
    } catch (e: any) {
      setError(e?.status === 401 ? 'Your session has expired. Please log in again.' : e?.status === 403 ? 'Your account does not have surveyor access.' : e?.status === 404 ? `Flag queue endpoint is missing: ${e.message}` : (e?.message || 'Failed to load flag queue.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, entityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async (item: FlaggedItem, decision: 'ok' | 'rejected', notes?: string) => {
    setResolving(item.entity_id);
    try {
      await adminService.resolveFlag(item.entity_type, item.entity_id, decision, notes);
      showToast(
        `${item.entity_label} resolved as ${decision === 'ok' ? 'VERIFIED ✓' : 'REJECTED ✗'}.`,
        decision === 'ok'
      );
      await load();
    } catch (e: any) {
      showToast(e?.message || 'Failed to resolve flag.', false);
    } finally {
      setResolving(null);
    }
  };

  const flaggedCount = items.filter((i) => i.flag_status === 'flagged').length;
  const underReviewCount = items.filter((i) => i.flag_status === 'under_review').length;
  const resolvedCount = items.filter((i) => i.flag_status?.startsWith('resolved')).length;

  const isSurveyor = user?.role === 'Surveyor' || user?.role === 'Admin';

  return (
    <div className="min-h-screen bg-[#071426] text-[#F8FAFC] pb-16" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-sm font-mono font-medium transition-all ${
            toast.ok
              ? 'bg-[#064E3B] border-[#22C55E]/50 text-[#22C55E]'
              : 'bg-[#450A0A] border-[#EF4444]/50 text-[#EF4444]'
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#243B53] bg-gradient-to-b from-[#0B1F33] to-[#071426] pt-8 pb-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              AI SUSPICION FLAG QUEUE — LAYER 3
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8]">
              Rule-Based Heuristic v1 (6 Named Rules)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] flex items-center gap-3 mb-2">
            <ShieldCheck className="w-7 h-7 text-[#EF4444]" />
            CADASTRAL ANOMALY REVIEW QUEUE
          </h1>
          <p className="text-xs font-mono text-[#94A3B8]">
            Surveyor: <span className="text-[#F8FAFC] font-semibold">{user?.fullName || '—'}</span>
            {' • '}Review and resolve AI-flagged anomalies. Decisions are logged with your officer ID.
          </p>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-center">
              <div className="text-2xl font-black text-[#EF4444] font-mono">{flaggedCount}</div>
              <div className="text-[11px] font-mono text-[#94A3B8] mt-0.5">Active Flags</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-center">
              <div className="text-2xl font-black text-[#F59E0B] font-mono">{underReviewCount}</div>
              <div className="text-[11px] font-mono text-[#94A3B8] mt-0.5">Under Review</div>
            </div>
            <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-center">
              <div className="text-2xl font-black text-[#22C55E] font-mono">{resolvedCount}</div>
              <div className="text-[11px] font-mono text-[#94A3B8] mt-0.5">Resolved</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#0B1F33] p-1 rounded-lg border border-[#243B53] text-xs font-mono">
            {[
              { value: 'flagged', label: 'Flagged' },
              { value: 'all', label: 'All' },
              { value: 'resolved_ok', label: 'Resolved OK' },
              { value: 'resolved_rejected', label: 'Rejected' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  statusFilter === value
                    ? 'bg-[#38BDF8] text-[#071426] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-1 bg-[#0B1F33] p-1 rounded-lg border border-[#243B53] text-xs font-mono">
            {[
              { value: 'all', label: 'All Types' },
              { value: 'feature', label: '🏢 Buildings' },
              { value: 'floor', label: '🏗️ Floors' },
              { value: 'flat', label: '🏠 Flats' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setEntityFilter(value)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  entityFilter === value
                    ? 'bg-[#38BDF8] text-[#071426] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={load}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1F33] border border-[#243B53] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-sm font-mono text-[#EF4444] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            {error.includes('session has expired') && <button onClick={() => navigate('/login')} className="ml-3 underline">Log in</button>}
          </div>
        )}

        {/* Not surveyor warning */}
        {!isSurveyor && (
          <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-sm font-mono text-[#F59E0B] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            This page requires a Surveyor or Admin role. You are currently logged in as a{' '}
            <strong>{user?.role || 'Guest'}</strong>.
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#38BDF8] font-mono text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading flag queue from backend...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 font-mono text-[#64748B]">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[#22C55E]/40" />
            <p className="text-sm">No flagged items found for the selected filters.</p>
            <p className="text-xs mt-1">Run a mutation operation to trigger AI flag evaluation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const key = `${item.entity_type}-${item.entity_id}`;
              const isExpanded = expandedId === key;
              const isResolving = resolving === item.entity_id;
              const colorClass = FLAG_STATUS_COLORS[item.flag_status] || FLAG_STATUS_COLORS['clean'];

              return (
                <div
                  key={key}
                  className="rounded-xl bg-[#0B1F33] border border-[#243B53] shadow-lg overflow-hidden"
                >
                  {/* Card Header */}
                  <div
                    className="p-4 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-[#112133] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : key)}
                  >
                    {ENTITY_ICONS[item.entity_type]}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-semibold text-sm text-[#F8FAFC] truncate">
                        {item.entity_label}
                      </div>
                      <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                        {item.entity_type.toUpperCase()} #{item.entity_id}
                        {item.parcel_id && ` · Parcel #${item.parcel_id}`}
                        {item.flagged_at && (
                          <span className="ml-2">
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {new Date(item.flagged_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Flag Status Badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border uppercase ${colorClass}`}>
                      {item.flag_status?.replace('_', ' ')}
                    </span>

                    {/* Score */}
                    {item.flag_score != null && (
                      <span className="font-mono text-xs text-[#F59E0B] font-bold">
                        Score: {item.flag_score.toFixed(2)}
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#64748B]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#64748B]" />
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#1A3250] space-y-4">
                      {/* Flag Reason */}
                      {item.flag_reason && (
                        <div className="mt-3 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
                          <div className="text-[11px] font-mono uppercase text-[#EF4444] mb-1">AI Anomaly Reason</div>
                          <div className="text-sm font-mono text-[#F8FAFC]">{item.flag_reason}</div>
                        </div>
                      )}

                      {/* Resolution info if already resolved */}
                      {item.flag_status?.startsWith('resolved') && (
                        <div className="p-3 rounded-lg bg-[#243B53]/40 border border-[#243B53]">
                          <div className="text-[11px] font-mono uppercase text-[#94A3B8] mb-1">Resolution</div>
                          <div className="text-xs font-mono text-[#F8FAFC]">
                            {item.review_notes || '—'}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B] mt-1">
                            Reviewed by Officer #{item.reviewed_by}
                            {item.reviewed_at && ` · ${new Date(item.reviewed_at).toLocaleString()}`}
                          </div>
                        </div>
                      )}

                      {/* Action buttons — only for active flags and surveyors */}
                      {isSurveyor && (item.flag_status === 'flagged' || item.flag_status === 'under_review') && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            disabled={isResolving}
                            onClick={() =>
                              handleResolve(item, 'ok', `Verified and resolved by ${user?.fullName || 'Surveyor'}`)
                            }
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#22C55E] text-[#071426] font-mono font-bold text-xs hover:bg-[#16A34A] transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verify & Resolve
                          </button>
                          <button
                            disabled={isResolving}
                            onClick={() =>
                              handleResolve(item, 'rejected', `Rejected and flagged for re-survey by ${user?.fullName || 'Surveyor'}`)
                            }
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EF4444] text-white font-mono font-bold text-xs hover:bg-[#DC2626] transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject Record
                          </button>
                          {isResolving && (
                            <span className="font-mono text-xs text-[#94A3B8] flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Submitting...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlagQueuePage;
