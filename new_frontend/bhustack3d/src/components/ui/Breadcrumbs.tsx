import React from 'react';
import { ChevronRight, Home, Building2, Layers, Box } from 'lucide-react';
import { useCadastral } from '../../context/CadastralContext';

export const Breadcrumbs: React.FC = () => {
  const {
    selectedParcel,
    selectedBuilding,
    selectedFloor,
    selectedFlat,
    selectBuilding,
    selectFloor,
    selectFlat,
    resetSelection,
  } = useCadastral();

  return (
    <nav aria-label="Cadastral Hierarchy Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs font-mono py-2 px-3 bg-[#0B1F33]/80 border border-[#243B53] rounded-lg text-[#94A3B8]">
      <button
        onClick={resetSelection}
        className="flex items-center gap-1 hover:text-[#38BDF8] transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-[#38BDF8]" />
        <span>Parcels</span>
      </button>

      {selectedParcel && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
          <button
            onClick={() => {
              selectBuilding(null);
            }}
            className={`truncate max-w-[180px] hover:text-[#38BDF8] transition-colors ${
              !selectedBuilding ? 'text-[#38BDF8] font-semibold' : ''
            }`}
          >
            {selectedParcel.name.split('—')[0].trim()}
          </button>
        </>
      )}

      {selectedBuilding && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
          <button
            onClick={() => {
              selectFloor(null);
            }}
            className={`flex items-center gap-1 hover:text-[#38BDF8] transition-colors ${
              !selectedFloor ? 'text-[#38BDF8] font-semibold' : ''
            }`}
          >
            <Building2 className="w-3 h-3 text-[#60A5FA]" />
            <span>{selectedBuilding.code}</span>
          </button>
        </>
      )}

      {selectedFloor && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
          <button
            onClick={() => {
              selectFlat(null);
            }}
            className={`flex items-center gap-1 hover:text-[#38BDF8] transition-colors ${
              !selectedFlat ? 'text-[#38BDF8] font-semibold' : ''
            }`}
          >
            <Layers className="w-3 h-3 text-[#38BDF8]" />
            <span>Floor {selectedFloor.floorLabel}</span>
          </button>
        </>
      )}

      {selectedFlat && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="flex items-center gap-1 text-[#22C55E] font-semibold">
            <Box className="w-3 h-3" />
            <span>{selectedFlat.flatNumber}</span>
          </span>
        </>
      )}
    </nav>
  );
};
