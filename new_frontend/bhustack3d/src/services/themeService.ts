import { ThemeConfig, ThemeId } from '../types';

export const THEMES: Record<ThemeId, ThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Cyber Emerald',
    tagline: 'Satellite Matrix GIS',
    badge: 'RECOMMENDED',
    dotColor: '#10B981',
    colors: {
      bgPrimary: '#050914',
      bgSecondary: '#0A1324',
      bgSurface: '#101E36',
      bgElevated: '#162847',
      borderColor: '#1E3557',
      accentPrimary: '#10B981',
      accentSecondary: '#06B6D4',
      accentGlow: 'rgba(16, 185, 129, 0.35)',
      textPrimary: '#F0FDF4',
      textMuted: '#94A3B8',
      skyColor: '#030712',
      fogColor: '#060C1A',
      globeOcean: '#051021',
      globeGraticule: '#10B981',
      globeContinent: '#34D399',
      globeAtmosphere: '#06B6D4',
      satelliteColor: '#6EE7B7',
    },
  },
  amber: {
    id: 'amber',
    name: 'Solar Gold',
    tagline: 'Luxury Cartography & Blueprints',
    badge: 'LUXURY',
    dotColor: '#F59E0B',
    colors: {
      bgPrimary: '#0A0908',
      bgSecondary: '#14120F',
      bgSurface: '#1E1B15',
      bgElevated: '#28241D',
      borderColor: '#383126',
      accentPrimary: '#F59E0B',
      accentSecondary: '#FB923C',
      accentGlow: 'rgba(245, 158, 11, 0.35)',
      textPrimary: '#FFFDF7',
      textMuted: '#A8A29E',
      skyColor: '#0C0A08',
      fogColor: '#171410',
      globeOcean: '#0E0C09',
      globeGraticule: '#F59E0B',
      globeContinent: '#FBBF24',
      globeAtmosphere: '#F59E0B',
      satelliteColor: '#FDE68A',
    },
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula Indigo',
    tagline: 'Deep Space Ultraviolet',
    badge: 'CYBERPUNK',
    dotColor: '#818CF8',
    colors: {
      bgPrimary: '#070612',
      bgSecondary: '#0F0C24',
      bgSurface: '#171438',
      bgElevated: '#221D4F',
      borderColor: '#2F2968',
      accentPrimary: '#818CF8',
      accentSecondary: '#C084FC',
      accentGlow: 'rgba(129, 140, 248, 0.35)',
      textPrimary: '#FAF5FF',
      textMuted: '#94A3B8',
      skyColor: '#080718',
      fogColor: '#110E28',
      globeOcean: '#0A0821',
      globeGraticule: '#818CF8',
      globeContinent: '#C084FC',
      globeAtmosphere: '#A855F7',
      satelliteColor: '#E0E7FF',
    },
  },
  cyan: {
    id: 'cyan',
    name: 'Oceanic Cyber',
    tagline: 'High-Contrast Marine HUD',
    badge: 'TACTICAL',
    dotColor: '#38BDF8',
    colors: {
      bgPrimary: '#030914',
      bgSecondary: '#07152B',
      bgSurface: '#0D2242',
      bgElevated: '#13305A',
      borderColor: '#1D4478',
      accentPrimary: '#38BDF8',
      accentSecondary: '#60A5FA',
      accentGlow: 'rgba(56, 189, 248, 0.35)',
      textPrimary: '#F8FAFC',
      textMuted: '#94A3B8',
      skyColor: '#040D1B',
      fogColor: '#07152B',
      globeOcean: '#051428',
      globeGraticule: '#38BDF8',
      globeContinent: '#60A5FA',
      globeAtmosphere: '#38BDF8',
      satelliteColor: '#BAE6FD',
    },
  },
  daylight: {
    id: 'daylight',
    name: 'Daylight Horizon',
    tagline: 'High-Precision Drafting Paper',
    badge: 'LIGHT MODE',
    dotColor: '#0284C7',
    colors: {
      bgPrimary: '#F8FAFC',
      bgSecondary: '#FFFFFF',
      bgSurface: '#F1F5F9',
      bgElevated: '#E2E8F0',
      borderColor: '#CBD5E1',
      accentPrimary: '#0284C7',
      accentSecondary: '#059669',
      accentGlow: 'rgba(2, 132, 199, 0.25)',
      textPrimary: '#0F172A',
      textMuted: '#475569',
      skyColor: '#E0F2FE',
      fogColor: '#F0F9FF',
      globeOcean: '#1E3A8A',
      globeGraticule: '#0284C7',
      globeContinent: '#10B981',
      globeAtmosphere: '#38BDF8',
      satelliteColor: '#0284C7',
    },
  },
};

export const THEME_LIST: ThemeConfig[] = Object.values(THEMES);

export const DEFAULT_THEME_ID: ThemeId = 'emerald';

export function applyThemeToDocument(themeId: ThemeId): ThemeConfig {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
  const root = document.documentElement;

  root.setAttribute('data-theme', theme.id);

  // Set CSS Variables
  root.style.setProperty('--bg-primary', theme.colors.bgPrimary);
  root.style.setProperty('--bg-secondary', theme.colors.bgSecondary);
  root.style.setProperty('--bg-surface', theme.colors.bgSurface);
  root.style.setProperty('--bg-elevated', theme.colors.bgElevated);
  root.style.setProperty('--border-color', theme.colors.borderColor);
  root.style.setProperty('--accent-primary', theme.colors.accentPrimary);
  root.style.setProperty('--accent-secondary', theme.colors.accentSecondary);
  root.style.setProperty('--accent-glow', theme.colors.accentGlow);
  root.style.setProperty('--text-primary', theme.colors.textPrimary);
  root.style.setProperty('--text-muted', theme.colors.textMuted);

  // Set body background & text
  document.body.style.backgroundColor = theme.colors.bgPrimary;
  document.body.style.color = theme.colors.textPrimary;

  try {
    localStorage.setItem('GEOMESH_theme', theme.id);
  } catch (e) {
    // ignore
  }

  return theme;
}

export function getSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem('GEOMESH_theme') as ThemeId;
    if (saved && THEMES[saved]) {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_THEME_ID;
}
