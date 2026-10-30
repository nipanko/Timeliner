import { useColorScheme } from 'react-native';

// Tokens from docs/DESIGN.md §1 (v0.3 "pro"): dark near-black with hairline edges and a coral accent
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
  accent: '#FF7A6B',
  accentInk: '#1A0D0B',
  danger: '#FF8A80',
  veil: 'rgba(13,14,18,0.55)',
  laneAlt: 'rgba(255,255,255,0.02)',
  raised: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.35)',
  raisedSm: 'inset 0 0 0 1px rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.3)',
  pressedIn: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
  selected: '0 0 0 1px rgba(255,122,107,0.55), 0 6px 18px rgba(255,122,107,0.35)',
  glow: '0 0 12px rgba(255,122,107,0.65)',
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
  accent: '#C93C31',
  accentInk: '#FFFFFF',
  danger: '#B42318',
  veil: 'rgba(247,245,241,0.6)',
  laneAlt: 'rgba(0,0,0,0.02)',
  raised: 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 8px 24px rgba(40,30,20,0.08)',
  raisedSm: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 2px 6px rgba(40,30,20,0.06)',
  pressedIn: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
  selected: '0 4px 12px rgba(201,60,49,0.3)',
  glow: '0 0 10px rgba(201,60,49,0.45)',
};

export function usePalette(): Palette {
  return useColorScheme() === 'light' ? light : dark;
}

/** Layer colors (fill / text / strong line), the same in both themes. Keys are stored in the database. */
export type LayerColor = { fill: string; ink: string; strong: string };

export const LAYER_COLORS = {
  yellow: { fill: '#F5C542', ink: '#2A1F00', strong: '#F5C542' },
  lilac: { fill: '#7C9CF5', ink: '#0B1633', strong: '#7C9CF5' },
  green: { fill: '#6CC070', ink: '#0D2610', strong: '#6CC070' },
  salmon: { fill: '#F28A8A', ink: '#3A0E0E', strong: '#F28A8A' },
} satisfies Record<string, LayerColor>;
