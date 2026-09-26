import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useCadastral } from '../../context/CadastralContext';
import { THEME_LIST } from '../../services/themeService';
import { ThemeId } from '../../types';

interface ThemeSwitcherProps {
  compact?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  compact = false,
  align = 'right',
  className = '',
}) => {
  const { themeId, currentTheme, setTheme } = useCadastral();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left font-mono ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        title="Switch Visual Color Theme"
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 text-xs ${
          isOpen
            ? 'bg-[#10253D] text-[#38BDF8] border-[#38BDF8]/60 shadow-lg shadow-[#38BDF8]/10'
            : 'bg-[#0B1F33] text-[#94A3B8] border-[#243B53] hover:text-[#F8FAFC] hover:border-[#38BDF8]/40 hover:bg-[#10253D]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <Palette className="w-3.5 h-3.5 text-[#38BDF8]" />
          {/* Active Theme Dot */}
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#071426]"
            style={{ backgroundColor: currentTheme.colors.accentPrimary }}
          />
        </div>

        {!compact && (
          <>
            <span className="hidden sm:inline text-xs font-semibold text-[#F8FAFC]">
              {currentTheme.name}
            </span>
            <span
              className="w-2 h-2 rounded-full hidden sm:inline-block shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: currentTheme.colors.accentPrimary }}
            />
          </>
        )}
      </button>

      {/* Theme Dropdown Palette Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-64 rounded-xl bg-[#071426]/98 border border-[#243B53] shadow-2xl backdrop-blur-xl z-50 p-2 space-y-1`}
          style={{
            boxShadow: `0 10px 30px -5px rgba(0,0,0,0.7), 0 0 20px -5px ${currentTheme.colors.accentGlow}`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#243B53] mb-1">
            <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <Palette className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="font-bold tracking-wider uppercase text-[11px]">Color Themes</span>
            </div>
            <span className="text-[10px] text-[#38BDF8] px-1.5 py-0.5 rounded bg-[#10253D] border border-[#38BDF8]/30">
              5 PRESETS
            </span>
          </div>

          {/* Theme Options */}
          {THEME_LIST.map((theme) => {
            const isSelected = theme.id === themeId;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-[#10253D] border border-[#38BDF8]/40 shadow-sm'
                    : 'hover:bg-[#0B1F33] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Visual Swatch Pill */}
                  <div className="flex items-center -space-x-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#071426] shadow-sm"
                      style={{ backgroundColor: theme.colors.accentPrimary }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#071426] shadow-sm"
                      style={{ backgroundColor: theme.colors.accentSecondary }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#071426] shadow-sm"
                      style={{ backgroundColor: theme.colors.bgSurface }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#38BDF8]' : 'text-[#F8FAFC]'
                        }`}
                      >
                        {theme.name}
                      </span>
                      {theme.badge && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#0B1F33] text-[#94A3B8] border border-[#243B53]">
                          {theme.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B] leading-tight">
                      {theme.tagline}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-[#38BDF8] shrink-0" />
                )}
              </button>
            );
          })}

          {/* Footer note */}
          <div className="px-2 pt-1 border-t border-[#243B53]/60 text-[10px] text-[#64748B] text-center">
            Instantly recalibrates 3D Globe, Horizon & UI
          </div>
        </div>
      )}
    </div>
  );
};
