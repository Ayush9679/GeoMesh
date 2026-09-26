import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface CadastralModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}

export const CadastralModal: React.FC<CadastralModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  badgeColor = 'text-[#38BDF8] border-[#38BDF8]/40 bg-[#10253D]',
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#040D1A]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-2xl shadow-[#38BDF8]/10 overflow-hidden z-10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#243B53] flex items-center justify-between bg-[#071426]/90">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {badge && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${badgeColor}`}
                >
                  {badge}
                </span>
              )}
              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="text-xs font-mono text-[#94A3B8]">{subtitle}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#10253D] border border-transparent hover:border-[#243B53] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-mono text-[#CBD5E1]">
          {children}
        </div>
      </div>
    </div>
  );
};
