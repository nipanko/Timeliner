import { useColorScheme } from 'react-native';

// Tokens from docs/DESIGN.md §1 ("clay").
const light = {
  ground: '#E9DCC9',
  panel: '#F7F0E5',
  tray: '#FCF8F2',
  ink: '#3B2F28',
  muted: '#73635A',
  line: '#EADFCF',
  lineStrong: '#CDBBA5',
  chip: '#EFE5D6',
  accent: '#6A55D8',
  accentInk: '#FFFFFF',
  veil: 'rgba(252,248,242,0.6)',
  laneAlt: 'rgba(59,47,40,0.03)',
  raised: '0 8px 18px rgba(110,80,50,0.18), inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -3px 0 rgba(110,80,50,0.10)',
  raisedSm: '0 3px 8px rgba(110,80,50,0.15), inset 0 1.5px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(110,80,50,0.10)',
  pressedIn: 'inset 0 3px 10px rgba(110,80,50,0.14)',
  selected: '0 4px 10px rgba(80,50,180,0.3), inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -3px 0 rgba(0,0,0,0.18)',
};

export type Palette = typeof light;

const dark: Palette = {
  ground: '#211B36',
  panel: '#2E2650',
  tray: '#362D5C',
  ink: '#F5F0FF',
  muted: '#C3B8E6',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.26)',
  chip: '#3E3468',
  accent: '#B7A6FF',
  accentInk: '#211B36',
  veil: 'rgba(54,45,92,0.55)',
  laneAlt: 'rgba(255,255,255,0.03)',
  raised: '0 8px 18px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.08), inset 0 -3px 0 rgba(0,0,0,0.25)',
  raisedSm: '0 3px 8px rgba(0,0,0,0.3), inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15)',
  pressedIn: 'inset 0 3px 10px rgba(0,0,0,0.35)',
  selected: '0 4px 10px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -3px 0 rgba(0,0,0,0.18)',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Layer colors (fill / text / strong line), the same in both themes. */
export type LayerColor = { fill: string; ink: string; strong: string };

export const LAYER_COLORS = {
  yellow: { fill: '#F8DE84', ink: '#4A3A00', strong: '#D9A520' },
  lilac: { fill: '#CDBDF4', ink: '#2F2160', strong: '#8C73E0' },
  green: { fill: '#B9D79C', ink: '#24410E', strong: '#6E9E45' },
  salmon: { fill: '#F5AE97', ink: '#5A1D0E', strong: '#E0735C' },
} satisfies Record<string, LayerColor>;
