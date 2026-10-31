import type Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useContext, type ComponentProps } from 'react';
import { useColorScheme } from 'react-native';

import type { EntryKind } from '@/core/entries/timing';

// Tokens from docs/DESIGN.md §1 (v0.3 "pro"): dark near-black with hairline edges and a lime accent
// that glows; light is warm paper with white cards. Edges are drawn as inset 1px shadows, so one
// boxShadow token gives both the border and the elevation.
const dark = {
  ground: '#0D0E12',
  panel: '#17181E',
  tray: '#111217',
  ink: '#F2F3F5',
  muted: '#9A9CA6',
  line: 'rgba(255,255,255,0.06)',
  lineStrong: 'rgba(255,255,255,0.18)',
  chip: '#22242B',
  /** Accent as a fill (buttons, selected chips); text on it uses `accentInk`. */
  accent: '#C8F25A',
  accentInk: '#11160A',
  /** Accent as text or a thin line on the ground or a panel. */
  accentText: '#C8F25A',
  /** Two stops for XP bars, the add button and glows. */
  gradient: ['#C8F25A', '#5EE6C8'] as readonly [string, string],
  danger: '#FF8A80',
  veil: 'rgba(13,14,18,0.55)',
  laneAlt: 'rgba(255,255,255,0.02)',
  raised: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.35)',
  raisedSm: 'inset 0 0 0 1px rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.3)',
  pressedIn: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
  selected: '0 0 0 1px rgba(200,242,90,0.55), 0 6px 18px rgba(200,242,90,0.28)',
  glow: '0 0 14px rgba(200,242,90,0.55)',
};

export type Palette = typeof dark;

const light: Palette = {
  ground: '#ECE9E3',
  panel: '#FFFFFF',
  tray: '#F7F5F1',
  ink: '#15161A',
  muted: '#62656F',
  line: 'rgba(0,0,0,0.06)',
  lineStrong: 'rgba(0,0,0,0.2)',
  chip: '#F0EEEA',
  accent: '#C6EE3E',
  accentInk: '#141A05',
  // Lime is too light to read on paper, so lines and text use a deep lime (5:1 on white).
  accentText: '#4C7608',
  gradient: ['#B7E33A', '#3FBF9E'],
  danger: '#B42318',
  veil: 'rgba(247,245,241,0.6)',
  laneAlt: 'rgba(0,0,0,0.02)',
  raised: 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 8px 24px rgba(40,30,20,0.08)',
  raisedSm: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 2px 6px rgba(40,30,20,0.06)',
  pressedIn: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
  selected: '0 0 0 1px rgba(76,118,8,0.35), 0 4px 12px rgba(110,150,20,0.28)',
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
