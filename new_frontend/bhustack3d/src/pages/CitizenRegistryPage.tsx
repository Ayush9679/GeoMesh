import React, { useEffect, useState } from 'react';
import { AlertTriangle, Search, ShieldCheck } from 'lucide-react';
import { Cadastral3DViewer } from '../components/cadastral-3d/Cadastral3DViewer';
import { useCadastral } from '../context/CadastralContext';
import { request } from '../services/api';

interface SearchRow {
  id: string; name: string; state: string; lat: number; lon: number;
  ulpin_3d: string; classification: string; area: string; is_mine: boolean;
  parcel_ulpin?: string;
}

export const CitizenRegistryPage: React.FC = () => {
  const { loadCitizenParcel, selectedBuilding, floors, selectedFloor, selectFloor, resetSelection } = useCadastral();
  const [query, setQuery] = useState('Knowledge Park 2');
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async (term = query) => {
    if (!term.trim()) return;
    setBusy(true); setError('');
    try { setRows(await request<SearchRow[]>(`/citizen/search?q=${encodeURIComponent(term.trim())}`)); }
    catch (e: any) { setRows([]); setError(e.message || 'Registry search failed.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { void search('Knowledge Park 2'); }, []);

  const open = async (row: SearchRow) => {
    setBusy(true); setError('');
    try { await loadCitizenParcel(row); }
    catch (e: any) { setError(e.message || 'Could not load this parcel.'); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#071426] px-4 py-8 text-[#F8FAFC] sm:px-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <div className="flex items-center gap-2 text-sm font-mono text-[#38BDF8]"><ShieldCheck size={16}/> CITIZEN REGISTRY · READ ONLY</div>
        <h1 className="mt-2 text-2xl font-bold">Search parcels and inspect building floors</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">Ownership names for other residents are withheld. Flagged records remain visible with their review status.</p>
      </header>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <input aria-label="Search area or ULPIN" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#243B53] bg-[#0B1F33] px-4 py-3" placeholder="Area, parcel name, or ULPIN" />
        <button className="flex items-center gap-2 rounded-lg bg-[#38BDF8] px-4 font-bold text-[#071426]" disabled={busy}><Search size={16}/>{busy ? 'Loading…' : 'Search'}</button>
      </form>
      {error && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {!selectedBuilding && <section className="grid gap-3 md:grid-cols-2">{rows.map((row) => <button key={row.id} onClick={() => void open(row)} className="rounded-xl border border-[#243B53] bg-[#0B1F33] p-4 text-left hover:border-[#38BDF8]">
        <div className="font-semibold">{row.name}</div><div className="mt-1 text-xs text-[#94A3B8]">{row.state} · {row.classification}</div>
        <div className="mt-3 font-mono text-xs text-[#38BDF8]">{row.ulpin_3d}</div>{row.is_mine && <span className="mt-2 inline-block text-xs text-emerald-300">Linked to your account</span>}
      </button>)}</section>}
      {rows.length === 0 && !busy && !error && <p className="text-sm text-[#94A3B8]">No matching cadastral locations.</p>}
      {selectedBuilding && <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div><Cadastral3DViewer heightClass="h-[520px]" showHud /></div>
        <aside className="space-y-3 rounded-xl border border-[#243B53] bg-[#0B1F33] p-4">
          <h2 className="font-semibold">{selectedBuilding.name}</h2><p className="break-all font-mono text-xs text-[#38BDF8]">Building ULPIN: {selectedBuilding.ulpin}</p>
          {floors.length === 0 && <p className="text-sm text-[#94A3B8]">No floor records are registered for this building.</p>}
          {floors.map((floor) => <button key={floor.id} onClick={() => void selectFloor(floor.id)} className={`w-full rounded-lg border p-3 text-left ${selectedFloor?.id === floor.id ? 'border-[#38BDF8] bg-[#10253D]' : 'border-[#243B53]'}`}>
            <div className="flex items-center justify-between gap-2"><span>{floor.floorLabel}</span>{['flagged','under_review'].includes(floor.flagStatus || '') && <span className="flex items-center gap-1 text-xs text-amber-300"><AlertTriangle size={13}/> Under review</span>}</div>
            <div className="mt-1 break-all font-mono text-[11px] text-[#94A3B8]">{floor.ulpin || 'ULPIN not assigned'}</div>
            <div className="mt-1 text-[11px] text-[#64748B]">{floor.heightOffset.toFixed(1)}m–{(floor.heightTop || 0).toFixed(1)}m</div>
          </button>)}
          <button onClick={() => { resetSelection(); void search(); }} className="text-xs text-[#38BDF8]">Back to search</button>
        </aside>
      </section>}
    </div>
  </main>;
};
