import React from 'react';
import { VerificationLayers } from '../../types';
import { Satellite, Plane, Radio, FileText, CheckCircle2 } from 'lucide-react';

interface ConfidenceMeterProps {
  confidence: number;
  layers: VerificationLayers;
  compact?: boolean;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  confidence,
  layers,
  compact = false,
}) => {
  const getConfidenceLevel = (val: number) => {
    if (val >= 90) return { label: 'HIGH CONFIDENCE', color: 'text-[#22C55E]', border: 'border-[#22C55E]/40', bg: 'bg-[#22C55E]/10' };
    if (val >= 75) return { label: 'MODERATE CONFIDENCE', color: 'text-[#F59E0B]', border: 'border-[#F59E0B]/40', bg: 'bg-[#F59E0B]/10' };
    return { label: 'SURVEY RECONCILIATION NEEDED', color: 'text-[#EF4444]', border: 'border-[#EF4444]/40', bg: 'bg-[#EF4444]/10' };
  };

  const status = getConfidenceLevel(confidence);

  const layerItems = [
    { name: 'Satellite Imagery (LISS-IV / Cartosat)', score: layers.satellite, icon: Satellite },
    { name: 'Drone Photogrammetry (SVAMITVA Standard)', score: layers.drone, icon: Plane },
    { name: 'Terrestrial LiDAR 3D Point Cloud', score: layers.lidar, icon: Radio },
    { name: 'Authority Sanction Plan Matching', score: layers.sanctionPlan, icon: FileText },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0B1F33] border border-[#243B53]">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono text-[#64748B]">Confidence</span>
          <span className={`text-lg font-bold font-mono ${status.color}`}>{confidence}%</span>
        </div>
        <div className="h-6 w-[1px] bg-[#243B53]" />
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${status.bg} ${status.border} ${status.color}`}>
          {status.label}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[#0B1F33] border border-[#243B53] space-y-4">
      {/* Header Metric */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
            Cadastral Accuracy Verification
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold font-mono text-[#F8FAFC]">
              {confidence}%
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${status.bg} ${status.border} ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
        <CheckCircle2 className={`w-8 h-8 ${status.color}`} />
      </div>

      {/* Verification Layers */}
      <div className="space-y-2.5 pt-1">
        <div className="text-xs font-mono text-[#64748B] uppercase">Multi-Sensor Validation Layers</div>
        {layerItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <Icon className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{item.name}</span>
                </div>
                <span className="font-semibold text-[#F8FAFC]">{item.score}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#10253D] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#38BDF8] to-[#22C55E] rounded-full transition-all duration-500"
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
