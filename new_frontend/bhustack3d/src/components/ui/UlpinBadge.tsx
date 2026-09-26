import React, { useState } from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UlpinBadgeProps {
  ulpin: string;
  size?: 'sm' | 'md' | 'lg';
  showValidateLink?: boolean;
}

export const UlpinBadge: React.FC<UlpinBadgeProps> = ({
  ulpin,
  size = 'md',
  showValidateLink = true,
}) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ulpin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidate = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/validate?ulpin=${encodeURIComponent(ulpin)}`);
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base sm:text-lg px-3.5 py-1.5 tracking-wider',
  };

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <div
        className={`inline-flex items-center gap-2 font-mono font-bold bg-[#10253D] text-[#38BDF8] border border-[#38BDF8]/40 rounded-lg shadow-sm ${sizeClasses[size]}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
        <span className="select-all">{ulpin}</span>
        <button
          onClick={handleCopy}
          title="Copy ULPIN"
          className="p-1 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3 text-[#94A3B8]" />}
        </button>
      </div>

      {showValidateLink && (
        <button
          onClick={handleValidate}
          className="text-xs font-mono text-[#94A3B8] hover:text-[#38BDF8] underline underline-offset-2 transition-colors"
        >
          Validate Identity
        </button>
      )}
    </div>
  );
};
