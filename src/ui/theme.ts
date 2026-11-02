import type Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useContext, type ComponentProps } from 'react';
import { useColorScheme } from 'react-native';

import type { EntryKind } from '@/core/entries/timing';

// Tokens from docs/DESIGN.md §1 (v2 "arcade"): night indigo with candy colours; light is warm cream.
// Everything raised gets a thick ink outline and a hard drop shadow, drawn by one boxShadow token
// (a spread ring for the outline, an offset copy for the shadow), so no component needs its own border.
const dark = {
  ground: '#121228',
  panel: '#1E1E3F',
  tray: '#17173A',
  ink: '#F4F1FF',
  muted: '#A39FCB',
  line: 'rgba(255,255,255,0.07)',
  lineStrong: 'rgba(255,255,255,0.2)',
  chip: '#2A2A52',
  /** Accent as a fill (buttons, selected chips); text on it uses `accentInk`. */
  accent: '#C8F25A',
  accentInk: '#11160A',
  /** Accent as text or a thin line on the ground or a panel. */
  accentText: '#C8F25A',
  /** Two stops for XP bars, the add button and glows. */
  gradient: ['#C8F25A', '#5EE6C8'] as readonly [string, string],
  danger: '#FF8A80',
  veil: 'rgba(18,18,40,0.6)',
  /** The comic outline around raised things, and the ink on gold and candy fills. */
  edge: '#07070F',
  /** Candy fills: gold for the pointer and rewards, pop (grape) for day markers. */
  gold: '#FFD15C',
  pop: '#8B5CF6',
  /** Halftone dots on the ground. */
  dots: 'rgba(255,255,255,0.06)',
  raised: '0 0 0 3px #07070F, 0 6px 0 3px #07070F',
  raisedSm: '0 0 0 2.5px #07070F, 0 4px 0 2.5px #07070F',
  pressedIn: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
  selected: '0 0 0 2.5px #07070F, 0 3px 0 2.5px #07070F',
  glow: '0 0 14px rgba(200,242,90,0.55)',
};

export type Palette = typeof dark;

const light: Palette = {
  ground: '#FFF3E3',
  panel: '#FFFFFF',
  tray: '#FFF8EE',
  ink: '#1A1A2E',
  muted: '#5F5A78',
  line: 'rgba(26,26,46,0.08)',
  lineStrong: 'rgba(26,26,46,0.25)',
  chip: '#F6EBDD',
  accent: '#C6EE3E',
  accentInk: '#141A05',
  // Lime is too light to read on paper, so lines and text use a deep lime (5:1 on white).
  accentText: '#4C7608',
  gradient: ['#B7E33A', '#3FBF9E'],
  danger: '#B42318',
  veil: 'rgba(255,248,238,0.6)',
  edge: '#1A1A2E',
  gold: '#FFD15C',
  pop: '#8B5CF6',
  dots: 'rgba(26,26,46,0.07)',
  raised: '0 0 0 2.5px #1A1A2E, 0 5px 0 2.5px #1A1A2E',
  raisedSm: '0 0 0 2px #1A1A2E, 0 3px 0 2px #1A1A2E',
  pressedIn: 'inset 0 0 0 2px rgba(26,26,46,0.08)',
  selected: '0 0 0 2px #1A1A2E, 0 3px 0 2px #1A1A2E',
  glow: '0 0 10px rgba(110,150,20,0.45)',
};

/** Both palettes, for previews in Settings. */
export const PALETTES = { light, dark };

export type ThemePreference = 'system' | 'light' | 'dark';

/** The appearance chosen in Settings; provided by the root layout. */
export const ThemePreferenceContext = createContext<ThemePreference>('system');

export function useScheme(): 'light' | 'dark' {
  const preference = useContext(ThemePreferenceContext);
  const system = useColorScheme();
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}

export function usePalette(): Palette {
  return useScheme() === 'light' ? light : dark;
}

/** Layer colors (fill / text / strong line), the same in both themes. Keys are stored in the database. */
export type LayerColor = { fill: string; ink: string; strong: string };

export const LAYER_COLORS = {
  yellow: { fill: '#F5C542', ink: '#2A1F00', strong: '#F5C542' },
  lilac: { fill: '#7C9CF5', ink: '#0B1633', strong: '#7C9CF5' },
  green: { fill: '#6CC070', ink: '#0D2610', strong: '#6CC070' },
  salmon: { fill: '#F28A8A', ink: '#3A0E0E', strong: '#F28A8A' },
  teal: { fill: '#4FD1C5', ink: '#062723', strong: '#4FD1C5' },
  orange: { fill: '#FF9F5A', ink: '#331500', strong: '#FF9F5A' },
} satisfies Record<string, LayerColor>;

export type LayerColorKey = keyof typeof LAYER_COLORS;

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Icons people can pick for a layer in Settings. */
export const LAYER_ICONS: IconName[] = ['briefcase', 'book', 'barbell', 'home', 'code-slash', 'game-controller', 'musical-notes', 'brush', 'heart', 'cash', 'people', 'airplane'];

export const KIND_ICONS: Record<EntryKind, IconName> = { task: 'time', todo: 'checkbox', note: 'document-text', reminder: 'notifications' };
