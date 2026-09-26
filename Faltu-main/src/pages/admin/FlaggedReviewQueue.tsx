import { useState, useEffect, useCallback } from 'react';
import {
  api,
  FlaggedItemResponse,
  FlagResolveRequest,
} from '../../services/api';
import {
  Badge,
  Panel,
  PrimaryButton,
  GhostButton,
  DangerButton,
  LoadingBlock,
  EmptyState,
} from './ui';

const STATUS_OPTIONS = [
  { value: 'flagged', label: 'Pending Review (Flagged)' },
  { value: 'all', label: 'All Non-Clean Items' },
  { value: 'resolved_ok', label: 'Resolved (Approved Clean)' },
  { value: 'resolved_rejected', label: 'Resolved (Rejected)' },
];

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entity Types' },
  { value: 'feature', label: 'Buildings (Features)' },
  { value: 'floor', label: 'Floors' },
  { value: 'flat', label: 'Flats / Units' },
];

export default function FlaggedReviewQueue({ token }: { token: string }) {
  const [items, setItems] = useState<FlaggedItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('flagged');
  const [entityFilter, setEntityFilter] = useState('all');

  // Resolve modal state
  const [resolveModal, setResolveModal] = useState<{
    item: FlaggedItemResponse;
    decision: 'ok' | 'rejected';
    notes: string;
    busy: boolean;
    error: string | null;
  } | null>(null);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFlags(token, {
        status: statusFilter,
        entity_type: entityFilter,
        page: 1,
        size: 100,
      });
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, entityFilter]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleOpenResolve = (item: FlaggedItemResponse, decision: 'ok' | 'rejected') => {
    setResolveModal({
      item,
      decision,
      notes: '',
      busy: false,
      error: null,
    });
  };

  const handleSubmitResolve = async () => {
    if (!resolveModal) return;
    setResolveModal((prev) => prev ? { ...prev, busy: true, error: null } : null);
    try {
      const payload: FlagResolveRequest = {
        decision: resolveModal.decision,
        notes: resolveModal.notes.trim() || undefined,
      };
      await api.resolveFlag(token, resolveModal.item.entity_type, resolveModal.item.entity_id, payload);
      setResolveModal(null);
      await loadFlags();
    } catch (err: any) {
      setResolveModal((prev) => prev ? { ...prev, busy: false, error: err.message || 'Failed to resolve flag' } : null);
    }
  };

  return (
    <div style={{ padding: '24px 40px 60px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>
              AI Cadastral Review Queue
            </h1>
            <Badge variant="accent" dot="#38bdf8">Layer 3 Active</Badge>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 0', maxWidth: 640 }}>
            Real-time rule-based heuristics monitor 3D cadastral changes for geometric collisions, height anomalies,
            checksum integrity, and unauthorized owner mismatches.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>STATUS</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: '#0f172a' }}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>ENTITY TYPE</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: '#0f172a' }}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <GhostButton onClick={loadFlags}>↻ Refresh</GhostButton>
          </div>
        </div>
      </div>

      {loading && <LoadingBlock label="Loading flagged cadastral items…" />}

      {!loading && error && (
        <Panel style={{ padding: 20, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: '#f87171', margin: 0 }}>⚠ {error}</p>
        </Panel>
      )}

      {!loading && !error && items.length === 0 && (
        <Panel style={{ padding: 40, textAlign: 'center', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <EmptyState>
            No items matching the selected filter ({statusFilter}, {entityFilter}).
          </EmptyState>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 10 }}>
            {statusFilter === 'flagged' ? 'All cadastral layers are currently clean! No anomalies detected.' : 'Try selecting a different filter.'}
          </p>
        </Panel>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((it) => {
            const isFlagged = it.flag_status === 'flagged';
            const isResolvedOk = it.flag_status === 'resolved_ok';
            const isResolvedRejected = it.flag_status === 'resolved_rejected';

            return (
              <Panel
                key={`${it.entity_type}-${it.entity_id}`}
                style={{
                  padding: '16px 20px',
                  borderColor: isFlagged
                    ? 'rgba(239, 68, 68, 0.3)'
                    : isResolvedOk
                    ? 'rgba(16, 185, 129, 0.25)'
                    : 'rgba(244, 63, 94, 0.25)',
                  background: isFlagged ? 'rgba(239, 68, 68, 0.03)' : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                        {it.entity_label}
                      </span>
                      <Badge variant="neutral">
                        {it.entity_type.toUpperCase()} #{it.entity_id}
                      </Badge>
                      {isFlagged && (
                        <Badge variant="danger" dot="#ef4444">
                          ⚠ Flagged (Suspicion Score: {it.flag_score ? it.flag_score.toFixed(2) : '1.0'})
                        </Badge>
                      )}
                      {isResolvedOk && (
                        <Badge variant="success" dot="#10b981">
                          ✓ Resolved Clean (Approved)
                        </Badge>
                      )}
                      {isResolvedRejected && (
                        <Badge variant="danger" dot="#f43f5e">
                          ✕ Resolved Rejected
                        </Badge>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                      <strong style={{ color: '#fca5a5' }}>AI Reason: </strong>
                      {it.flag_reason || 'Anomaly detected during automated cadastral check'}
                    </div>

                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
                      {it.flagged_at && (
                        <span>Flagged: {new Date(it.flagged_at).toLocaleString('en-IN')}</span>
                      )}
                      {it.reviewed_at && (
                        <span>Reviewed: {new Date(it.reviewed_at).toLocaleString('en-IN')} by Surveyor #{it.reviewed_by}</span>
                      )}
                      {it.review_notes && (
                        <span style={{ color: '#94a3b8' }}>Notes: "{it.review_notes}"</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isFlagged && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <PrimaryButton
                        id={`resolve-ok-${it.entity_type}-${it.entity_id}`}
                        onClick={() => handleOpenResolve(it, 'ok')}
                        style={{ background: '#059669', fontSize: 12, padding: '7px 14px' }}
                      >
                        ✓ Approve Clean
                      </PrimaryButton>
                      <DangerButton
                        id={`resolve-reject-${it.entity_type}-${it.entity_id}`}
                        onClick={() => handleOpenResolve(it, 'rejected')}
                        style={{ fontSize: 12, padding: '7px 14px' }}
                      >
                        ✕ Reject Anomaly
                      </DangerButton>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Resolve Dialog Modal */}
      {resolveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <Panel style={{ maxWidth: 480, width: '100%', padding: 24, background: 'rgba(15, 23, 42, 0.98)', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: resolveModal.decision === 'ok' ? '#34d399' : '#f87171', marginTop: 0, marginBottom: 12 }}>
              {resolveModal.decision === 'ok' ? '✓ Approve Flagged Item as Clean' : '✕ Reject / Confirm Cadastral Anomaly'}
            </h3>
            <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 14 }}>
              Item: <strong>{resolveModal.item.entity_label}</strong> ({resolveModal.item.entity_type})<br />
              Flag reason: <span style={{ color: '#fca5a5' }}>{resolveModal.item.flag_reason}</span>
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Resolution Notes (Optional / Audit trail):
              </label>
              <textarea
                value={resolveModal.notes}
                onChange={(e) => setResolveModal((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="e.g. Verified on-site ground truth sanction plan permits structural variance."
                rows={3}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {resolveModal.error && (
              <p style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>
                ⚠ {resolveModal.error}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <GhostButton onClick={() => setResolveModal(null)} disabled={resolveModal.busy}>
                Cancel
              </GhostButton>
              <PrimaryButton
                onClick={handleSubmitResolve}
                busy={resolveModal.busy}
                style={{
                  background: resolveModal.decision === 'ok' ? '#059669' : '#e11d48',
                }}
              >
                Confirm {resolveModal.decision === 'ok' ? 'Approval' : 'Rejection'}
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
