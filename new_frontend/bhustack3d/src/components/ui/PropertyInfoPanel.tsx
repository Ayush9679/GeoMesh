import React, { useEffect, useState } from 'react';
import { useCadastral } from '../../context/CadastralContext';
import { UlpinBadge } from './UlpinBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import { integrationService } from '../../services/integrationService';
import { DigiLockerIntegration, BankKycIntegration } from '../../types';
import {
  Building2,
  Layers,
  Box,
  MapPin,
  Calendar,
  ShieldCheck,
  FileCheck2,
  Landmark,
  ExternalLink,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PropertyInfoPanel: React.FC = () => {
  const {
    selectedParcel,
    selectedBuilding,
    selectedFloor,
    selectedFlat,
    buildings,
    floors,
    flats,
    selectBuilding,
    selectFloor,
    selectFlat,
  } = useCadastral();

  const navigate = useNavigate();
  const [digilocker, setDigilocker] = useState<DigiLockerIntegration | null>(null);
  const [bankKyc, setBankKyc] = useState<BankKycIntegration | null>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  // Active ULPIN depends on lowest selected entity
  const activeUlpin = selectedFlat
    ? selectedFlat.ulpin
    : selectedFloor
    ? selectedFloor.ulpin
    : selectedBuilding
    ? selectedBuilding.ulpin
    : selectedParcel?.ulpin;

  useEffect(() => {
    async function loadIntegrations() {
      if (!activeUlpin) return;
      setLoadingIntegrations(true);
      try {
        const [dl, bk] = await Promise.all([
          integrationService.getDigiLockerStatus(activeUlpin),
          integrationService.getBankKycStatus(activeUlpin),
        ]);
        setDigilocker(dl);
        setBankKyc(bk);
      } catch (err) {
        console.warn('Integration fetch error:', err);
      } finally {
        setLoadingIntegrations(false);
      }
    }
    loadIntegrations();
  }, [activeUlpin]);

  if (!selectedParcel) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0B1F33] border border-[#243B53] rounded-xl text-center text-[#94A3B8]">
        <div>
          <MapPin className="w-10 h-10 text-[#38BDF8] mx-auto mb-3 opacity-60" />
          <p className="font-mono text-sm">Select a parcel in the 3D scene to inspect cadastral records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Entity Title Card */}
      <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#38BDF8] bg-[#10253D] px-2.5 py-0.5 rounded border border-[#38BDF8]/30">
            {selectedFlat
              ? 'FLAT / PROPERTY SUB-UNIT'
              : selectedFloor
              ? 'BUILDING FLOOR LEVEL'
              : selectedBuilding
              ? 'SUPERSTRUCTURE DIGITAL TWIN'
              : 'PRIMARY CADASTRAL PARCEL'}
          </span>
          <span className="text-[11px] font-mono text-[#22C55E] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            {selectedParcel.status}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">
            {selectedFlat
              ? selectedFlat.flatNumber
              : selectedFloor
              ? `Floor ${selectedFloor.floorLabel} Plate`
              : selectedBuilding
              ? selectedBuilding.name
              : selectedParcel.name}
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {selectedFlat
              ? `${selectedFlat.type} • ${selectedBuilding?.code} • Floor ${selectedFloor?.floorLabel}`
              : selectedBuilding
              ? `${selectedBuilding.buildingType} • ${selectedParcel.district}`
              : `${selectedParcel.zone}, ${selectedParcel.state}`}
          </p>
        </div>

        {activeUlpin && (
          <div className="pt-1">
            <div className="text-[11px] font-mono text-[#64748B] mb-1">Assigned 3D ULPIN</div>
            <UlpinBadge ulpin={activeUlpin} size="md" />
          </div>
        )}
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-lg bg-[#0B1F33] border border-[#243B53]">
          <div className="text-[10px] font-mono text-[#64748B] uppercase">Registered Area</div>
          <div className="text-lg font-bold font-mono text-[#F8FAFC] mt-0.5">
            {selectedFlat
              ? `${selectedFlat.area} m²`
              : selectedFloor
              ? `${selectedFloor.area} m²`
              : selectedBuilding
              ? `${selectedBuilding.area.toLocaleString()} m²`
              : `${selectedParcel.area.toLocaleString()} m²`}
          </div>
          <div className="text-[10px] text-[#94A3B8]">
            {selectedFlat
              ? `≈ ${(selectedFlat.area * 10.7639).toFixed(0)} sq.ft`
              : `≈ ${(selectedParcel.area * 0.000247105).toFixed(2)} acres`}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#0B1F33] border border-[#243B53]">
          <div className="text-[10px] font-mono text-[#64748B] uppercase">
            {selectedFlat ? 'Title Deed Status' : selectedBuilding ? 'Building Height' : 'Buildings on Parcel'}
          </div>
          <div className="text-lg font-bold font-mono text-[#38BDF8] mt-0.5 truncate">
            {selectedFlat
              ? selectedFlat.ownerStatus.split('#')[0]
              : selectedBuilding
              ? `${selectedBuilding.height} meters`
              : `${selectedParcel.buildingCount} Structures`}
          </div>
          <div className="text-[10px] text-[#94A3B8] truncate">
            {selectedFlat
              ? selectedFlat.status
              : selectedBuilding
              ? `${selectedBuilding.floorsCount} Vertical Floors`
              : 'Survey of India Verified'}
          </div>
        </div>
      </div>

      {/* Confidence & Accuracy Breakdown */}
      <ConfidenceMeter
        confidence={selectedParcel.confidence}
        layers={selectedParcel.verificationLayers}
      />

      {/* Vertical Property Hierarchy Drill-Down Selector */}
      <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold text-[#F8FAFC]">3D Vertical Hierarchy</span>
          <span className="text-[#38BDF8]">Interactive Inspector</span>
        </div>

        {/* Buildings in Parcel */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[#60A5FA]" />
            <span>Buildings ({buildings.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {buildings.map((bldg) => (
              <button
                key={bldg.id}
                onClick={() => selectBuilding(bldg.id)}
                className={`px-2 py-1.5 text-xs font-mono rounded border text-center transition-all ${
                  selectedBuilding?.id === bldg.id
                    ? 'bg-[#38BDF8] text-[#071426] font-bold border-white'
                    : 'bg-[#10253D] text-[#94A3B8] border-[#243B53] hover:border-[#38BDF8] hover:text-[#F8FAFC]'
                }`}
              >
                {bldg.code}
              </button>
            ))}
          </div>
        </div>

        {/* Floors in Selected Building */}
        {selectedBuilding && (
          <div className="space-y-1.5 pt-2 border-t border-[#243B53]">
            <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#38BDF8]" />
              <span>Floors in {selectedBuilding.code}</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {floors.map((flr) => (
                <button
                  key={flr.id}
                  onClick={() => selectFloor(flr.id)}
                  className={`px-2 py-1 text-xs font-mono rounded border transition-all ${
                    selectedFloor?.id === flr.id
                      ? 'bg-[#38BDF8] text-[#071426] font-bold border-white'
                      : 'bg-[#10253D] text-[#94A3B8] border-[#243B53] hover:border-[#38BDF8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {flr.floorLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Flats on Selected Floor */}
        {selectedFloor && flats.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-[#243B53]">
            <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
              <Box className="w-3 h-3 text-[#22C55E]" />
              <span>Units on Floor {selectedFloor.floorLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {flats.map((flat) => (
                <button
                  key={flat.id}
                  onClick={() => selectFlat(flat.id)}
                  className={`p-1.5 text-left text-xs font-mono rounded border transition-all ${
                    selectedFlat?.id === flat.id
                      ? 'bg-[#22C55E]/20 text-[#22C55E] font-bold border-[#22C55E]'
                      : 'bg-[#10253D] text-[#94A3B8] border-[#243B53] hover:border-[#22C55E] hover:text-[#F8FAFC]'
                  }`}
                >
                  <div className="font-semibold">{flat.flatNumber}</div>
                  <div className="text-[10px] text-[#64748B] truncate">{flat.area} m² • {flat.type}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mock Government Integrations (Strict Section 26 Compliance) */}
      <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-[#F8FAFC] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
            National Ecosystem Gateways
          </span>
          {/* Explicitly labeled DEMO INTEGRATION per Section 26 */}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
            DEMO INTEGRATION
          </span>
        </div>

        {/* DigiLocker Section */}
        <div className="p-2.5 rounded-lg bg-[#10253D] border border-[#243B53] space-y-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#38BDF8]">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span className="font-semibold">DigiLocker Property Vault</span>
            </div>
            <span className="text-[10px] text-[#22C55E] font-bold">MOCK DATA</span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            {digilocker?.deedType || 'Cadastral Spatial Title Record'}
          </p>
          <p className="text-[10px] font-mono text-[#64748B] truncate">
            DOC: {digilocker?.documentId}
          </p>
        </div>

        {/* Bank KYC / Encumbrance Section */}
        <div className="p-2.5 rounded-lg bg-[#10253D] border border-[#243B53] space-y-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#60A5FA]">
              <Landmark className="w-3.5 h-3.5" />
              <span className="font-semibold">Bank KYC & Encumbrance</span>
            </div>
            <span className="text-[10px] text-[#22C55E] font-bold">MOCK DATA</span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            {bankKyc?.mortgageStatus || 'Zero Encumbrance / Title Clear'}
          </p>
          <p className="text-[10px] font-mono text-[#64748B] truncate">
            {bankKyc?.lendingInstitution}
          </p>
        </div>

        <div className="text-[10px] text-[#64748B] italic">
          Note: Government & banking API integrations shown above are simulated prototype connections.
        </div>
      </div>
    </div>
  );
};
