import { useEffect, useState } from 'react';
import {
  api,
  FeatureDetailResponse,
  FeatureUpdateRequest,
  AdminParcelRow,
  BuildingUlpinHistoryEntry,
} from '../../services/api';
import {
  Badge,
  Panel,
  PrimaryButton,
  GhostButton,
  AccentGhostButton,
  IconButton,
  InlineInput,
  TextAreaInput,
  InlineError,
  UlpinCode,
  LoadingBlock,
  EmptyState,
  Breadcrumbs,
  FieldLabel,
} from './ui';
import { DRILL_CONTAINER, OnSelectFeature } from './types';

function parcelShortName(p: AdminParcelRow): string {
  const name = p.name ?? '';
  const trimmed = name.split(',')[0].trim();
  return trimmed && trimmed.length > 0 ? trimmed : `Parcel #${p.id}`;
}

function formatArea(m2: number | null): string {
  if (m2 == null) return '—';
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toLocaleString('en-IN', { maximumFractionDigits: 0 })} m²`;
}

export default function BuildingsView({
  token,
  parcel,
  onBack,
  onSelectFeature,
}: {
  token: string;
  parcel: AdminParcelRow;
  onBack: () => void;
  onSelectFeature: OnSelectFeature;
}) {
  const [features, setFeatures] = useState<FeatureDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit building basic attributes
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editFloorHeight, setEditFloorHeight] = useState('3.0');
  const [editNotes, setEditNotes] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Reassign / Manual ULPIN modal
  const [reassignModal, setReassignModal] = useState<{
    feature: FeatureDetailResponse;
    mode: 'generate' | 'manual';
    manualUlpin: string;
    notes: string;
    busy: boolean;
    error: string | null;
  } | null>(null);

  // History modal
  const [historyModal, setHistoryModal] = useState<{
    feature: FeatureDetailResponse;
    entries: BuildingUlpinHistoryEntry[];
  } | null>(null);

  // Success toast
  const [toast, setToast] = useState<string | null>(null);

  const loadFeatures = async () => {
    try {
      const rows = await api.getParcelFeatures(token, parcel.id);
      setFeatures(rows);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load buildings');
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getParcelFeatures(token, parcel.id)
      .then((rows) => { if (mounted) { setFeatures(rows); setError(null); } })
      .catch((e) => { if (mounted) setError(e.message || 'Failed to load buildings'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, parcel.id]);

  const startEdit = (f: FeatureDetailResponse) => {
    setEditingId(f.id);
    setEditName(f.feature_name ?? '');
    setEditHeight(f.height != null ? String(f.height) : '');
    setEditFloorHeight(f.floor_height_m != null ? String(f.floor_height_m) : '3.0');
    setEditNotes(f.notes ?? '');
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = async (featureId: number) => {
    setSavingId(featureId);
    setEditError(null);
    const body: FeatureUpdateRequest = {};
    if (editName.trim()) body.name = editName.trim();
    else body.name = null;
    if (editHeight.trim() !== '' && parseFloat(editHeight) > 0) body.height = parseFloat(editHeight);
    if (editFloorHeight.trim() !== '' && parseFloat(editFloorHeight) > 0) body.floor_height_m = parseFloat(editFloorHeight);
    body.notes = editNotes;

    try {
      const updated = await api.updateFeature(token, parcel.id, featureId, body);
      setFeatures((prev) => prev.map((f) => (f.id === featureId ? updated : f)));
      setEditingId(null);
    } catch (e) {
      setEditError((e as Error).message || 'Failed to save building. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const executeReassign = async () => {
    if (!reassignModal) return;
    setReassignModal((prev) => prev ? { ...prev, busy: true, error: null } : null);

    try {
      const payload = {
        action: reassignModal.mode,
        ulpin: reassignModal.mode === 'manual' ? reassignModal.manualUlpin.trim() : undefined,
        notes: reassignModal.notes.trim() || undefined,
      };
      const res = await api.updateBuildingUlpin(token, parcel.id, reassignModal.feature.id, payload);
      setToast(
        res.flag_resolved
          ? `✓ ULPIN updated to ${res.ulpin_3d}. AI flag automatically resolved to Verified Clean.`
          : `✓ Building ULPIN updated to ${res.ulpin_3d}.`
      );
      setReassignModal(null);
      await loadFeatures();
      setTimeout(() => setToast(null), 6000);
    } catch (err: any) {
      setReassignModal((prev) => prev ? { ...prev, busy: false, error: err.message || 'Failed to update ULPIN.' } : null);
    }
  };

  const openHistory = (f: FeatureDetailResponse) => {
    let entries: BuildingUlpinHistoryEntry[] = [];
    if (f.building_ulpin_history) {
      try {
        const parsed = JSON.parse(f.building_ulpin_history);
        if (Array.isArray(parsed)) entries = parsed;
      } catch {}
    }
    setHistoryModal({ feature: f, entries });
  };

  return (
    <div style={DRILL_CONTAINER}>
      <Breadcrumbs
        segments={[
          { label: 'Parcels', onClick: onBack },
          { label: parcelShortName(parcel), active: true },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
            Buildings in {parcelShortName(parcel)}
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>
            {features.length} digitized building{features.length === 1 ? '' : 's'} · manage 3D building ULPINs, floor elevations, and strata.
          </p>
        </div>
        <GhostButton onClick={onBack}>← Back to parcels</GhostButton>
      </div>

      {toast && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#6ee7b7',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          {toast}
        </div>
      )}

      {loading && <LoadingBlock label="Loading building footprints…" />}

      {!loading && error && (
        <InlineError>{error}</InlineError>
      )}

      {!loading && !error && features.length === 0 && (
        <Panel><EmptyState>No buildings found for this parcel.</EmptyState></Panel>
      )}

      {!loading && !error && features.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {features.map((f) => {
            const editing = editingId === f.id;
            const floorsDefined = f.defined_floor_count;
            let historyCount = 0;
            if (f.building_ulpin_history) {
              try {
                const parsed = JSON.parse(f.building_ulpin_history);
                if (Array.isArray(parsed)) historyCount = parsed.length;
              } catch {}
            }

            return (
              <Panel key={f.id} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <FieldLabel>Building name / label</FieldLabel>
                      <InlineInput value={editName} onChange={setEditName} placeholder="e.g. Expo Mart Tower A" style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <FieldLabel>Height (m)</FieldLabel>
                        <InlineInput value={editHeight} onChange={setEditHeight} placeholder="e.g. 36" type="number" width="100%" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <FieldLabel>Floor Height (m)</FieldLabel>
                        <InlineInput value={editFloorHeight} onChange={setEditFloorHeight} placeholder="3.0" type="number" width="100%" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Notes</FieldLabel>
                      <TextAreaInput value={editNotes} onChange={setEditNotes} placeholder="Surveyor notes…" rows={2} />
                    </div>
                    {editError && <InlineError>{editError}</InlineError>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <PrimaryButton onClick={() => saveEdit(f.id)} busy={savingId === f.id}>Save</PrimaryButton>
                      <GhostButton onClick={cancelEdit}>Cancel</GhostButton>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
                          {f.feature_name ?? <em style={{ color: '#64748b', fontWeight: 400 }}>Unnamed building</em>}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                          fid #{f.fid ?? f.id}
                        </div>
                      </div>
                      <IconButton accent title="Edit building" onClick={() => startEdit(f)}>
                        ✎ Edit
                      </IconButton>
                    </div>

                    {/* AI Flag status indicator */}
                    {f.flag_status === 'flagged' && (
                      <Badge variant="danger" dot="#ef4444" title={f.flag_reason || 'AI Flagged'}>
                        ⚠ AI Flagged: {f.flag_reason || 'Suspicious geometry/elevation'}
                      </Badge>
                    )}
                    {f.flag_status === 'resolved_ok' && (
                      <Badge variant="success" dot="#10b981">
                        ✓ AI Review: Verified Clean
                      </Badge>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                      <UlpinCode code={f.ulpin_3d} />
                      {f.building_type && f.building_type !== 'yes' && f.building_type !== '' && (
                        <Badge variant="muted">{f.building_type}</Badge>
                      )}
                    </div>

                    {/* Building ULPIN Action buttons */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setReassignModal({
                          feature: f,
                          mode: 'generate',
                          manualUlpin: '',
                          notes: '',
                          busy: false,
                          error: null,
                        })}
                        style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ Reassign ULPIN
                      </button>
                      <button
                        type="button"
                        onClick={() => setReassignModal({
                          feature: f,
                          mode: 'manual',
                          manualUlpin: f.ulpin_3d,
                          notes: '',
                          busy: false,
                          error: null,
                        })}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          color: '#94a3b8',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Custom
                      </button>
                      {historyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openHistory(f)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fbbf24',
                            fontSize: 11,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                          }}
                        >
                          📜 History ({historyCount})
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span>Height: <strong style={{ color: '#e2e8f0' }}>{f.height != null ? `${f.height} m` : '—'}</strong></span>
                      <span>Area: <strong style={{ color: '#e2e8f0' }}>{formatArea(f.area)}</strong></span>
                      <span>Floor H: <strong style={{ color: '#38bdf8' }}>{f.floor_height_m || 3.0} m</strong></span>
                    </div>

                    <Badge
                      variant={floorsDefined > 0 ? 'success' : 'warning'}
                      dot={floorsDefined > 0 ? '#34d399' : '#fbbf24'}
                    >
                      {floorsDefined > 0 ? `${floorsDefined} floor${floorsDefined === 1 ? '' : 's'} defined` : 'No floors defined'}
                    </Badge>
                  </>
                )}

                {!editing && (
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 6 }}>
                    <AccentGhostButton
                      id={`manage-floors-${f.id}`}
                      onClick={() => onSelectFeature(f)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Manage Floors & Elevs →
                    </AccentGhostButton>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {/* Building ULPIN Reassignment Modal */}
      {reassignModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <Panel style={{ maxWidth: 480, width: '100%', padding: 24, borderColor: 'rgba(56, 189, 248, 0.35)', background: 'rgba(15, 23, 42, 0.96)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
              {reassignModal.mode === 'generate' ? '⚡ Auto-Generate Building 3D ULPIN' : '✏️ Set Custom Building 3D ULPIN'}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.5 }}>
              Assigning a building-level ULPIN establishes the root 3D cadastre anchor for this structure. If the building is currently flagged, updating its ULPIN will automatically mark the flag as <strong>Verified Clean</strong>.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setReassignModal((p) => p ? { ...p, mode: 'generate' } : null)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: `1px solid ${reassignModal.mode === 'generate' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  background: reassignModal.mode === 'generate' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: reassignModal.mode === 'generate' ? '#38bdf8' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Auto-Generate (Layer 5 BLDG)
              </button>
              <button
                type="button"
                onClick={() => setReassignModal((p) => p ? { ...p, mode: 'manual' } : null)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: `1px solid ${reassignModal.mode === 'manual' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  background: reassignModal.mode === 'manual' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: reassignModal.mode === 'manual' ? '#38bdf8' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Manual Entry
              </button>
            </div>

            {reassignModal.mode === 'manual' && (
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Explicit 3D ULPIN (format: BASE-V00-UBLDG-CC)</FieldLabel>
                <InlineInput
                  value={reassignModal.manualUlpin}
                  onChange={(v) => setReassignModal((p) => p ? { ...p, manualUlpin: v } : null)}
                  placeholder="UP28KP2GNIDA0A-V00-UBLDG-C8"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Surveyor Audit Notes</FieldLabel>
              <TextAreaInput
                value={reassignModal.notes}
                onChange={(v) => setReassignModal((p) => p ? { ...p, notes: v } : null)}
                placeholder="Reason for reassignment, field verification report #, etc."
                rows={2}
              />
            </div>

            {reassignModal.error && (
              <InlineError style={{ marginBottom: 14 }}>{reassignModal.error}</InlineError>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <GhostButton onClick={() => setReassignModal(null)}>Cancel</GhostButton>
              <PrimaryButton onClick={executeReassign} busy={reassignModal.busy}>
                Confirm Reassignment
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      )}

      {/* Building ULPIN History Modal */}
      {historyModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <Panel style={{ maxWidth: 500, width: '100%', padding: 24, borderColor: 'rgba(251, 191, 36, 0.35)', background: 'rgba(15, 23, 42, 0.96)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
              📜 Building ULPIN Audit Trail
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 14px' }}>
              Historical 3D ULPIN assignments for {historyModal.feature.feature_name || `Building #${historyModal.feature.id}`}:
            </p>

            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>ACTIVE ULPIN:</span>
              <div style={{ marginTop: 4 }}><UlpinCode code={historyModal.feature.ulpin_3d} /></div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
              Previous Reassignments ({historyModal.entries.length}):
            </div>

            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historyModal.entries.map((h, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#38bdf8' }}>{h.ulpin}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{h.assigned_at?.split('T')[0]}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                    Notes: <span style={{ color: '#f8fafc' }}>{h.notes || 'Reassigned by surveyor'}</span>
                  </div>
                  {h.reassigned_by_name && (
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                      By: {h.reassigned_by_name} (#{h.reassigned_by})
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <GhostButton onClick={() => setHistoryModal(null)}>Close</GhostButton>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}