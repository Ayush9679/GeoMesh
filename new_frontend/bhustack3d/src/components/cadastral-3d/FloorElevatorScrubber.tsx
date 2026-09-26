import React, { useState } from 'react';
import { useCadastral } from '../../context/CadastralContext';
import { Layers, ChevronRight, ChevronLeft, Check } from 'lucide-react';

export const FloorElevatorScrubber: React.FC = () => {
  const {
    floors,
    selectedFloor,
    selectFloor,
    selectedBuilding,
  } = useCadastral();
  const [collapsed, setCollapsed] = useState(false);

  if (!selectedBuilding || floors.length === 0) {
    return null;
  }

  // Reverse so top floor is at the top of the scrubber
  const sortedFloors = [...floors].reverse();

  return (
    <div
      className={`absolute right-4 top-16 z-20 transition-all duration-300 ${
        collapsed ? 'translate-x-full' : 'translate-x-0'
      }`}
    >
      <div className="relative flex items-center">
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -left-7 top-4 p-1.5 rounded-l-lg bg-[#071426]/95 border border-r-0 border-[#243B53] text-[#38BDF8] hover:text-[#F8FAFC] backdrop-blur-md shadow-lg"
          title={collapsed ? 'Show Floor Scrubber' : 'Hide Floor Scrubber'}
        >
          {collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Scrubber Container */}
        <div className="w-28 sm:w-32 max-h-[380px] bg-[#071426]/95 border border-[#243B53] rounded-xl shadow-2xl backdrop-blur-md p-2 flex flex-col gap-1.5 font-mono select-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#243B53] px-1">
            <span className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#38BDF8]" />
              ELEVATOR
            </span>
            <span className="text-[9px] text-[#38BDF8] font-semibold">
              {floors.length} LVLS
            </span>
          </div>

          {/* Floor Level Buttons Stack */}
          <div className="overflow-y-auto space-y-1 pr-0.5 custom-scrollbar max-h-[300px]">
            {sortedFloors.map((flr) => {
              const isActive = selectedFloor?.id === flr.id;
              const isBasement = flr.floorNumber < 0;

              return (
                <button
                  key={flr.id}
                  onClick={() => selectFloor(flr.id)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-all ${
                    isActive
                      ? 'bg-[#38BDF8] text-[#071426] font-bold shadow-md shadow-[#38BDF8]/20 scale-[1.02]'
                      : isBasement
                      ? 'bg-[#0B1F33] text-[#94A3B8] hover:bg-[#10253D] hover:text-[#38BDF8] border border-[#243B53]/40'
                      : 'bg-[#0B1F33]/80 text-[#CBD5E1] hover:bg-[#10253D] hover:text-[#38BDF8]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">
                      {isBasement ? flr.floorLabel : `L${flr.floorLabel}`}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] ${
                      isActive ? 'text-[#071426]/80' : 'text-[#64748B]'
                    }`}
                  >
                    {flr.flatsCount}u
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom All Levels Reset */}
          {selectedFloor && (
            <button
              onClick={() => selectFloor(null)}
              className="w-full text-center py-1 text-[10px] text-[#38BDF8] hover:underline pt-1 border-t border-[#243B53]"
            >
              Show All Floors
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
