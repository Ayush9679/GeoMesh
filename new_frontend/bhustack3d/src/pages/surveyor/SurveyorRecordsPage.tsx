import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, AdminParcel, BackendFeature, BackendFloor, BulkAssignResponse } from '../../services/adminService';
import { request } from '../../services/api';

export const SurveyorRecordsPage: React.FC = () => {
  const [parcels, setParcels] = useState<AdminParcel[]>([]);
  const [parcelId, setParcelId] = useState<number | null>(null);
  const [features, setFeatures] = useState<BackendFeature[]>([]);
  const [featureId, setFeatureId] = useState<number | null>(null);
  const [floors, setFloors] = useState<BackendFloor[]>([]);
  const [bulk, setBulk] = useState<BulkAssignResponse | null>(null);
  const [manualUlpin, setManualUlpin] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [kp2Result, setKp2Result] = useState('');
  const selected = features.find((f) => f.id === featureId) || null;

  const loadFeatures = async (id: number) => {
    const data = await adminService.getParcelFeatures(id);
    setFeatures(data); setFeatureId(data[0]?.id ?? null);
  };
  const loadFloors = async (pId: number, fId: number) => setFloors(await adminService.getFloors(pId, fId));

  useEffect(() => {
    adminService.listParcels().then(async (data) => {
      setParcels(data); const first = data[0];
      if (first) { setParcelId(first.id); await loadFeatures(first.id); }
    }).catch((e) => setError(e.message || 'Could not load surveyor records.'));
  }, []);
  useEffect(() => {
    if (parcelId && featureId) loadFloors(parcelId, featureId).catch((e) => setError(e.message || 'Could not load floors.'));
  }, [parcelId, featureId]);

  const assignAll = async (force: boolean) => {
    if (!parcelId || !featureId) return;
    if (force && !window.confirm('Reassign every floor with an existing ULPIN? Previous values will be recorded in the audit history.')) return;
    setBusy(true); setError('');
    try {
      setBulk(await adminService.bulkAssignFloorUlpins(parcelId, featureId, force));
      await loadFloors(parcelId, featureId);
    } catch (e: any) { setError(e.message || 'Bulk assignment failed.'); }
    finally { setBusy(false); }
  };

  const updateUlpin = async (action: 'generate' | 'manual') => {
    if (!selected || !parcelId) return;
    setBusy(true); setError('');
    try {
      await adminService.updateBuildingUlpin(parcelId, selected.id, {
        action: action === 'generate' ? 'generate' : undefined,
        ulpin: action === 'manual' ? manualUlpin.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      await loadFeatures(parcelId);
    } catch (e: any) { setError(e.message || 'Building ULPIN update failed.'); }
    finally { setBusy(false); }
  };

  const generateKp2Floors = async () => {
    if (!window.confirm('Generate missing 3 m floor records and assign ULPINs for the 575 seeded Knowledge Park 2 footprints?')) return;
    setBusy(true); setError(''); setKp2Result('');
    try {
      const result = await request<{ feature_count: number; floors_created: number; ulpins_assigned: number }>(
        '/admin/kp2/generate-floors-and-assign', { method: 'POST' },
      );
      setKp2Result(`Processed ${result.feature_count} footprints · created ${result.floors_created} floors · assigned ${result.ulpins_assigned} floor ULPINs.`);
      if (parcelId) await loadFeatures(parcelId);
    } catch (e: any) { setError(e.message || 'KP2 floor generation failed.'); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#071426] px-4 py-8 text-[#F8FAFC] sm:px-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="font-mono text-xs text-[#38BDF8]">SURVEYOR RECORD MANAGEMENT</div><h1 className="mt-1 text-2xl font-bold">Buildings, floors & ULPINs</h1></div>
        <Link className="rounded-lg border border-[#243B53] px-3 py-2 text-sm text-[#38BDF8]" to="/flags">Open flag review queue</Link>
      </header>
      {error && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <section className="rounded-xl border border-[#243B53] bg-[#0B1F33] p-4">
        <h2 className="font-semibold">Knowledge Park 2 footprint inventory</h2>
        <p className="mt-1 text-xs text-[#94A3B8]">Create missing 3 m floor strata from the existing 575 real footprint records, then assign their floor ULPINs.</p>
        <button disabled={busy} onClick={() => void generateKp2Floors()} className="mt-3 rounded-lg border border-[#38BDF8] px-4 py-2 text-sm text-[#38BDF8] disabled:opacity-50">Generate KP2 floors and assign ULPINs</button>
        {kp2Result && <p role="status" className="mt-2 text-sm text-emerald-300">{kp2Result}</p>}
      </section>
      <section className="grid gap-4 rounded-xl border border-[#243B53] bg-[#0B1F33] p-4 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-[#94A3B8]">Parcel<select className="rounded bg-[#071426] p-2 text-sm text-white" value={parcelId ?? ''} onChange={(e) => { const n = Number(e.target.value); setParcelId(n); void loadFeatures(n).catch((x) => setError(x.message)); }}>
          {parcels.map((p) => <option value={p.id} key={p.id}>{p.name || p.ulpin_3d}</option>)}</select></label>
        <label className="grid gap-1 text-xs text-[#94A3B8]">Building<select className="rounded bg-[#071426] p-2 text-sm text-white" value={featureId ?? ''} onChange={(e) => setFeatureId(Number(e.target.value))}>
          {features.map((f) => <option value={f.id} key={f.id}>{f.feature_name || `Building #${f.id}`}</option>)}</select></label>
      </section>
      {selected && <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-[#243B53] bg-[#0B1F33] p-4">
          <h2 className="font-semibold">Floor ULPIN assignment</h2>
          <p className="text-xs text-[#94A3B8]">Assigns only unassigned floors by default. Existing ULPINs are skipped and every generated code is validated and checked for collisions.</p>
          <button disabled={busy || floors.length === 0} onClick={() => void assignAll(false)} className="rounded-lg bg-[#38BDF8] px-4 py-2 text-sm font-bold text-[#071426] disabled:opacity-50">{busy ? 'Working…' : 'Auto-assign all floor ULPINs'}</button>
          {bulk && <div className="rounded border border-[#243B53] p-3 text-sm">Assigned {bulk.assigned_count} · skipped {bulk.skipped_count} · failed {bulk.failed_count}
            {bulk.skipped_count > 0 && <button onClick={() => void assignAll(true)} className="ml-3 rounded bg-amber-500 px-3 py-1 text-xs font-bold text-black">Reassign all anyway</button>}
          </div>}
          <div className="max-h-80 space-y-2 overflow-auto">{floors.map((f) => <div key={f.id} className="rounded border border-[#243B53] p-2 text-xs"><div className="flex justify-between"><span>{f.floor_label}</span><span className={f.flag_status === 'flagged' ? 'text-amber-300' : 'text-emerald-300'}>{f.flag_status}</span></div><div className="mt-1 break-all font-mono text-[#94A3B8]">{f.floor_ulpin || 'Unassigned'}</div></div>)}</div>
        </div>
        <div className="space-y-3 rounded-xl border border-[#243B53] bg-[#0B1F33] p-4">
          <h2 className="font-semibold">Building ULPIN</h2>
          {selected.flag_status === 'flagged' && <div className="rounded bg-amber-500/10 p-2 text-xs text-amber-200">Flagged: {selected.flag_reason || 'Under surveyor review'}. A successful reassignment resolves this flag.</div>}
          <div className="break-all rounded bg-[#071426] p-2 font-mono text-xs">Current: {selected.building_ulpin || selected.ulpin_3d}</div>
          <input value={manualUlpin} onChange={(e) => setManualUlpin(e.target.value)} className="w-full rounded bg-[#071426] p-2 font-mono text-xs" placeholder="Enter a validated ULPIN" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded bg-[#071426] p-2 text-xs" placeholder="Audit note (optional)" />
          <div className="flex gap-2"><button disabled={busy} onClick={() => void updateUlpin('generate')} className="rounded bg-[#38BDF8] px-3 py-2 text-xs font-bold text-[#071426] disabled:opacity-50">Generate / reassign</button><button disabled={busy || !manualUlpin.trim()} onClick={() => void updateUlpin('manual')} className="rounded border border-[#38BDF8] px-3 py-2 text-xs text-[#38BDF8] disabled:opacity-50">Save entered ULPIN</button></div>
          <details><summary className="cursor-pointer text-xs text-[#38BDF8]">Assignment history</summary><pre className="mt-2 whitespace-pre-wrap text-xs text-[#94A3B8]">{selected.building_ulpin_history || 'No earlier assignments.'}</pre></details>
        </div>
      </section>}
    </div>
  </main>;
};
