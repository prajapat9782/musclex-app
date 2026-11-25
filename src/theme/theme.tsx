import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export type Mode = 'dark' | 'light' | 'system';
export type Units = 'metric' | 'imperial';

export const ACCENTS = [
  { hex: '#C6F432', name: 'Volt lime' },
  { hex: '#FF8A4C', name: 'Ember orange' },
  { hex: '#7CC8FF', name: 'Sky blue' },
  { hex: '#E9B8FF', name: 'Lilac' },
  { hex: '#5EEAD4', name: 'Mint' },
  { hex: '#FFD43B', name: 'Gold' },
] as const;

export const DEFAULT_ACCENT = ACCENTS[0].hex;

const DARK = {
  bg: '#0E0F0C', surface: '#1A1C17', surface2: '#24271F', line: '#2A2D25',
  text: '#F2F2EE', muted: '#A3A69C', nav: '#121310', strong: '#F2F2EE', onStrong: '#0E0F0C',
  flame: '#FF8A4C', flameSoft: '#2A1A10', sky: '#7CC8FF',
};
const LIGHT: typeof DARK = {
  bg: '#F5F5F0', surface: '#FFFFFF', surface2: '#ECEDE6', line: '#DEDFD6',
  text: '#141512', muted: '#5E6158', nav: '#FFFFFF', strong: '#141512', onStrong: '#FFFFFF',
  flame: '#C2410C', flameSoft: '#FDE7DA', sky: '#1D5FA3',
};

export type Colors = typeof DARK & {
  accent: string;
  /** Accent colour safe to use as text/lines on the background (darker in light mode). */
  accentInk: string;
  accentSoft: string;
  onAccent: string;
  isLight: boolean;
};

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function buildColors(isLight: boolean, accent: string): Colors {
  const base = isLight ? LIGHT : DARK;
  const { r, g, b } = hexToRgb(accent);
  const dk = (v: number) => Math.round(v * 0.48).toString(16).padStart(2, '0');
  return {
    ...base,
    accent,
    accentInk: isLight ? `#${dk(r)}${dk(g)}${dk(b)}` : accent,
    accentSoft: `rgba(${r},${g},${b},${isLight ? 0.18 : 0.14})`,
    onAccent: '#0E0F0C',
    isLight,
  };
}

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

type Prefs = { mode: Mode; accent: string; units: Units };
type ThemeCtx = Prefs & {
  c: Colors;
  ready: boolean;
  setMode: (m: Mode) => void;
  setAccent: (hex: string) => void;
  setUnits: (u: Units) => void;
};

const KEY = 'mx.prefs';
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [prefs, setPrefs] = useState<Prefs>({ mode: 'dark', accent: DEFAULT_ACCENT, units: 'metric' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) })); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeCtx>(() => {
    const isLight = prefs.mode === 'system' ? scheme === 'light' : prefs.mode === 'light';
    return {
      ...prefs,
      c: buildColors(isLight, prefs.accent),
      ready,
      setMode: (mode) => update({ mode }),
      setAccent: (accent) => update({ accent }),
      setUnits: (units) => update({ units }),
    };
  }, [prefs, scheme, ready, update]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
