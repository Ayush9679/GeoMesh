import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cadastral3DViewer } from '../components/cadastral-3d/Cadastral3DViewer';
import { PropertyInfoPanel } from '../components/ui/PropertyInfoPanel';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { CadastralModal } from '../components/ui/CadastralModal';
import { useCadastral } from '../context/CadastralContext';
import { parcelService } from '../services/parcelService';
import { SearchResult } from '../types';
import {
  Search,
  MapPin,
  Layers,
  X,
  Building2,
  Box,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  FileCheck2,
  Landmark,
  ArrowRight,
  Info,
} from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    parcels,
    selectedParcel,
    selectedBuilding,
    selectedFloor,
    selectedFlat,
    selectParcel,
    selectBuilding,
    selectFloor,
    selectFlat,
    setExplosionFactor,
  } = useCadastral();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [showInspectorPanel, setShowInspectorPanel] = useState(true);
  const [quickDeedModalOpen, setQuickDeedModalOpen] = useState(false);
  const [quickKycModalOpen, setQuickKycModalOpen] = useState(false);

  // Handle URL query on load
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      executeSearch(q);
    }
  }, [searchParams]);

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await parcelService.searchLocations(searchTerm);
      setSearchResults(results);
      setShowResultsDropdown(true);

      if (results.length > 0 && !selectedParcel) {
        selectParcel(results[0].parcelId);
      }
    } catch (err) {
      console.warn('Search execution error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
    executeSearch(query);
  };

  const handleSelectResult = (res: SearchResult) => {
    selectParcel(res.parcelId);
    setShowResultsDropdown(false);
    setQuery(res.location);
  };

  const handleQuickDrill = (level: 'parcel' | 'building' | 'floor' | 'flat') => {
    if (level === 'parcel') {
      selectBuilding(null);
      selectFloor(null);
      selectFlat(null);
      setExplosionFactor(0);
    } else if (level === 'building') {
      selectBuilding('bldg-01');
      selectFloor(null);
      selectFlat(null);
    } else if (level === 'floor') {
      selectBuilding('bldg-01');
      selectFloor('flr-07');
      selectFlat(null);
      setExplosionFactor(0.8);
    } else if (level === 'flat') {
      selectBuilding('bldg-01');
      selectFloor('flr-07');
      selectFlat('flat-0704');
      setExplosionFactor(0.8);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#071426] p-3 sm:p-5 flex flex-col gap-3">
      {/* Top Interactive Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <Breadcrumbs />

        <div className="flex items-center gap-2">
          {/* Quick Search Field */}
          <div className="relative w-full md:w-80">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  executeSearch(e.target.value);
                }}
                placeholder="Search location, ULPIN..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-mono bg-[#0B1F33] border border-[#243B53] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSearchResults([]);
                    setShowResultsDropdown(false);
                  }}
                  className="absolute right-2 top-2 text-[#64748B] hover:text-[#F8FAFC]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Search Dropdown */}
            {showResultsDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0B1F33] border border-[#243B53] rounded-lg shadow-2xl max-h-64 overflow-y-auto p-1 font-mono text-xs">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => handleSelectResult(res)}
                    className="w-full text-left p-2 rounded hover:bg-[#10253D] hover:text-[#38BDF8] transition-colors flex items-center justify-between gap-2 border-b border-[#243B53]/40 last:border-none"
                  >
                    <div>
                      <div className="font-semibold text-[#F8FAFC] truncate">{res.location}</div>
                      <div className="text-[10px] text-[#94A3B8]">{res.ulpin}</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#38BDF8]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Inspector Panel Button */}
          <button
            onClick={() => setShowInspectorPanel((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all ${
              showInspectorPanel
                ? 'bg-[#10253D] text-[#38BDF8] border-[#38BDF8]/50'
                : 'bg-[#0B1F33] text-[#94A3B8] border-[#243B53] hover:text-[#F8FAFC]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {showInspectorPanel ? 'Hide Inspector' : 'Inspect Records'}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Quick Level Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-[#0B1F33] p-1.5 rounded-xl border border-[#243B53]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[#64748B] text-[11px] px-1 shrink-0">Parcel:</span>
          {parcels.map((p) => (
            <button
              key={p.id}
              onClick={() => selectParcel(p.id)}
              className={`px-2.5 py-1 rounded-md border whitespace-nowrap text-[11px] transition-all ${
                selectedParcel?.id === p.id
                  ? 'bg-[#10253D] text-[#38BDF8] border-[#38BDF8] font-bold'
                  : 'bg-[#071426] text-[#94A3B8] border-[#243B53] hover:text-[#F8FAFC]'
              }`}
            >
              {p.name.split('—')[0].trim()}
            </button>
          ))}
        </div>

        {/* Quick Vertical Drilldown Pills */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleQuickDrill('parcel')}
            className={`px-2 py-0.5 rounded text-[11px] border ${
              !selectedBuilding
                ? 'bg-[#38BDF8] text-[#071426] font-bold border-[#38BDF8]'
                : 'bg-[#071426] text-[#94A3B8] border-[#243B53] hover:text-[#38BDF8]'
            }`}
          >
            Parcel
          </button>
          <button
            onClick={() => handleQuickDrill('building')}
            className={`px-2 py-0.5 rounded text-[11px] border ${
              selectedBuilding && !selectedFloor
                ? 'bg-[#38BDF8] text-[#071426] font-bold border-[#38BDF8]'
                : 'bg-[#071426] text-[#94A3B8] border-[#243B53] hover:text-[#38BDF8]'
            }`}
          >
            Tower
          </button>
          <button
            onClick={() => handleQuickDrill('floor')}
            className={`px-2 py-0.5 rounded text-[11px] border ${
              selectedFloor && !selectedFlat
                ? 'bg-[#38BDF8] text-[#071426] font-bold border-[#38BDF8]'
                : 'bg-[#071426] text-[#94A3B8] border-[#243B53] hover:text-[#38BDF8]'
            }`}
          >
            Floor 07
          </button>
          <button
            onClick={() => handleQuickDrill('flat')}
            className={`px-2 py-0.5 rounded text-[11px] border ${
              selectedFlat
                ? 'bg-[#22C55E] text-[#071426] font-bold border-[#22C55E]'
                : 'bg-[#071426] text-[#94A3B8] border-[#243B53] hover:text-[#22C55E]'
            }`}
          >
            Flat 0704
          </button>

          {/* Quick Popup Buttons */}
          <div className="h-4 w-[1px] bg-[#243B53] mx-1" />
          <button
            onClick={() => setQuickDeedModalOpen(true)}
            className="p-1 rounded bg-[#071426] border border-[#243B53] text-[#38BDF8] hover:bg-[#10253D]"
            title="Open Deed Popup"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setQuickKycModalOpen(true)}
            className="p-1 rounded bg-[#071426] border border-[#243B53] text-[#60A5FA] hover:bg-[#10253D]"
            title="Open KYC Popup"
          >
            <Landmark className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Responsive Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[580px]">
        {/* 3D Scene Viewport (Expands to 12 cols when inspector closed) */}
        <div
          className={`flex flex-col transition-all duration-300 ${
            showInspectorPanel ? 'lg:col-span-8' : 'lg:col-span-12'
          }`}
        >
          <Cadastral3DViewer defaultShape="wide" heightClass="h-[520px] lg:h-full min-h-[540px]" />
        </div>

        {/* Collapsible Cadastral Property Inspector */}
        {showInspectorPanel && (
          <div className="lg:col-span-4 h-[600px] lg:h-full transition-all duration-300 animate-in fade-in">
            <PropertyInfoPanel />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* QUICK ON-DEMAND SPECIMEN POPUPS */}
      {/* ========================================================================= */}

      {/* Quick Deed Record Popup */}
      <CadastralModal
        isOpen={quickDeedModalOpen}
        onClose={() => setQuickDeedModalOpen(false)}
        title="Cadastral Deed Record"
        subtitle="DigiLocker Certified Land Registration"
        badge="LEGAL TITLE"
        badgeColor="text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10"
      >
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#071426] border border-[#243B53] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Document Ref:</span>
              <span className="text-[#38BDF8]">DGL-UP-2024-88190</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Title Status:</span>
              <span className="text-[#22C55E]">Clear Title / Registered</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Registrar Office:</span>
              <span className="text-[#F8FAFC]">Sub-Registrar Sadar, GB Nagar</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Stamp Duty:</span>
              <span className="text-[#F8FAFC]">Paid in Full (₹ 6,42,000)</span>
            </div>
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            This specimen is authenticated via 3D cadastral bounding volumes conforming to Survey of India geospatial datum.
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setQuickDeedModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-[#38BDF8] text-[#071426] font-bold"
            >
              Done
            </button>
          </div>
        </div>
      </CadastralModal>

      {/* Quick KYC / Encumbrance Popup */}
      <CadastralModal
        isOpen={quickKycModalOpen}
        onClose={() => setQuickKycModalOpen(false)}
        title="Bank KYC & Mortgage Certificate"
        subtitle="State Bank of India Cadastral API"
        badge="ENCUMBRANCE"
        badgeColor="text-[#60A5FA] border-[#60A5FA]/40 bg-[#60A5FA]/10"
      >
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#071426] border border-[#243B53] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Lending Partner:</span>
              <span className="text-[#F8FAFC]">State Bank of India (Retail Assets)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Lien / Encumbrance:</span>
              <span className="text-[#22C55E]">Zero Encumbrance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Inspection Date:</span>
              <span className="text-[#38BDF8]">September 2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Property Valuation:</span>
              <span className="text-[#F8FAFC]">₹ 1,84,00,000 Verified</span>
            </div>
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            Automated mortgage audit checks verify no secondary pledging across state credit registries.
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setQuickKycModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-[#38BDF8] text-[#071426] font-bold"
            >
              Done
            </button>
          </div>
        </div>
      </CadastralModal>
    </div>
  );
};
