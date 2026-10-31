import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { mascotMood } from '@/core/game/mascot';
import type { Direction } from '@/core/timeline/viewport';
import { Tick } from '@/features/game/Tick';
import { useProgress } from '@/features/game/useProgress';
import { useNow } from '@/hooks/useNow';
import { ProgressFill } from '@/ui/motion';
import { Reveal, ScrollScreen } from '@/ui/ScrollScreen';
import { PALETTES, usePalette, type IconName, type Palette, type ThemePreference } from '@/ui/theme';
import { F } from '@/ui/type';

import { setSetting, useSetting } from './data';
import { LayersSection } from './LayersSection';

const APPEARANCES: [ThemePreference, string][] = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];
const DIRECTIONS: [Direction, string][] = [['down', '↓'], ['up', '↑'], ['right', '→'], ['left', '←']];
const WEEK_STARTS: [string, string][] = [['1', 'Mon'], ['0', 'Sun']];
const CALM: [string, string][] = [['off', 'Off'], ['on', 'On']];

export function SettingsScreen() {
  const c = usePalette();
  const p = useProgress();
  const now = useNow(60_000);
  const theme = useSetting<ThemePreference>('theme', 'system');
  const direction = useSetting<Direction>('direction', 'down');
  const weekStart = useSetting<string>('weekStart', '1');
  const calm = useSetting<string>('calm', 'off');
  const earned = p.badges.filter((b) => b.earned).length;

  const choose = (t: ThemePreference) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    setSetting('theme', t);
  };

  return (
    <ScrollScreen title="Settings">
      <Reveal index={0}>
        <View style={[styles.profile, { backgroundColor: c.panel, boxShadow: c.raised }]}>
          <View style={styles.profileTop}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ring, { boxShadow: c.glow }]}>
              <View style={[styles.avatar, { backgroundColor: c.panel }]}>
                <Tick size={52} mood={mascotMood({ hour: new Date(now).getHours(), doneToday: 0 })} celebrate={p.ready ? p.xp : undefined} />
              </View>
            </LinearGradient>
            <View style={styles.grow}>
              <Text style={[styles.overline, { color: c.muted }]}>YOUR PROFILE</Text>
              <Text style={[styles.level, { color: c.ink }]}>Level {p.level.level}</Text>
              <Text style={[styles.small, { color: c.muted }]}>{p.level.need - p.level.into} XP to level {p.level.level + 1}</Text>
            </View>
          </View>
          <View style={[styles.track, { backgroundColor: c.chip }]}>
            <ProgressFill value={p.level.into / p.level.need} colors={c.gradient} />
          </View>
          <View style={styles.stats}>
            <Stat c={c} icon="flame" value={String(p.streak.days)} label="Day streak" />
            <Stat c={c} icon="ribbon" value={`${earned}/${p.badges.length}`} label="Badges" />
            <Stat c={c} icon="timer" value={p.focusedHours < 10 ? p.focusedHours.toFixed(1) : String(Math.round(p.focusedHours))} label="Hours focused" />
          </View>
        </View>
      </Reveal>

      <Reveal index={1}>
        <Text style={[styles.section, { color: c.muted }]}>APPEARANCE</Text>
        <View style={styles.tiles}>
          {APPEARANCES.map(([t, label]) => {
            const on = theme === t;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${label} appearance`}
                onPress={() => choose(t)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: c.panel, boxShadow: on ? c.selected : c.raisedSm },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.preview}>
                  {t === 'system' ? (
                    <View style={styles.split}>
                      <Preview p={PALETTES.light} />
                      <Preview p={PALETTES.dark} />
                    </View>
                  ) : (
                    <Preview p={PALETTES[t]} />
                  )}
                </View>
                <View style={styles.tileFoot}>
                  <Text style={[styles.tileLabel, { color: c.ink }]}>{label}</Text>
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={on ? c.accentText : c.muted} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: c.muted }]}>System follows your phone&apos;s light or dark setting.</Text>
      </Reveal>

      <Reveal index={2}>
        <Text style={[styles.section, { color: c.muted }]}>LAYERS</Text>
        <LayersSection />
        <Text style={[styles.hint, { color: c.muted }]}>Tap a layer&apos;s badge for its color and icon.</Text>
      </Reveal>

      <Reveal index={3}>
        <Text style={[styles.section, { color: c.muted }]}>TIMELINE</Text>
        <View style={[styles.options, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
          <Option c={c} label="Direction" value={direction} choices={DIRECTIONS} onPick={(v) => setSetting('direction', v)} />
          <Option c={c} label="Week starts" value={weekStart} choices={WEEK_STARTS} onPick={(v) => setSetting('weekStart', v)} />
          <Option c={c} label="Calm mode" value={calm} choices={CALM} onPick={(v) => setSetting('calm', v)} />
        </View>
        <Text style={[styles.hint, { color: c.muted }]}>Calm mode keeps XP and levels but drops confetti and vibration.</Text>
      </Reveal>

      <Reveal index={4}>
        <Text style={[styles.section, { color: c.muted }]}>ABOUT</Text>
        <View style={[styles.about, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
          <Ionicons name="lock-closed" size={16} color={c.muted} />
          <Text style={[styles.small, styles.grow, { color: c.ink }]}>Your data stays on this device.</Text>
        </View>
        <Text style={[styles.hint, styles.center, { color: c.muted }]}>TIMELINER · made by Tried Indie</Text>
      </Reveal>
    </ScrollScreen>
  );
}

function Stat({ c, icon, value, label }: { c: Palette; icon: IconName; value: string; label: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.tray, boxShadow: c.pressedIn }]} accessible accessibilityLabel={`${value} ${label}`}>
      <Ionicons name={icon} size={16} color={c.accentText} />
      <Text style={[styles.statValue, { color: c.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

function Option<T extends string>({ c, label, value, choices, onPick }: { c: Palette; label: string; value: T; choices: [T, string][]; onPick: (v: T) => void }) {
  return (
    <View style={styles.option}>
      <Text style={[styles.optionLabel, { color: c.ink }]}>{label}</Text>
      <View style={[styles.segment, { backgroundColor: c.chip }]}>
        {choices.map(([v, text]) => {
          const on = v === value;
          return (
            <Pressable
              key={v}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={`${label}: ${v}`}
              onPress={() => onPick(v)}
              style={[styles.segmentItem, on && { backgroundColor: c.accent, boxShadow: c.selected }]}
            >
              <Text style={[styles.segmentText, { color: on ? c.accentInk : c.ink }]}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A tiny mock of the app in one theme: a title bar, two cards and the accent. */
function Preview({ p }: { p: Palette }) {
  return (
    <View style={[styles.mock, { backgroundColor: p.ground }]}>
      <View style={[styles.mockBar, { backgroundColor: p.ink, opacity: 0.85 }]} />
      <View style={[styles.mockCard, { backgroundColor: p.panel }]}>
        <View style={[styles.mockDot, { backgroundColor: p.accent }]} />
      </View>
      <View style={[styles.mockCard, { backgroundColor: p.panel, width: '70%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  center: { textAlign: 'center' },
  profile: { borderRadius: 24, padding: 16, gap: 14 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ring: { width: 68, height: 68, borderRadius: 34, padding: 3 },
  avatar: { flex: 1, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  overline: { fontSize: 10.5, fontFamily: F.bold, letterSpacing: 1.2 },
  level: { fontSize: 26, fontFamily: F.display, letterSpacing: -0.5 },
  small: { fontSize: 13, fontFamily: F.text },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 16, padding: 10, gap: 2 },
  statValue: { fontSize: 20, fontFamily: F.display, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, fontFamily: F.semi },
  section: { fontSize: 11, fontFamily: F.bold, letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 18, padding: 8, gap: 8 },
  preview: { height: 84, borderRadius: 12, overflow: 'hidden' },
  split: { flex: 1, flexDirection: 'row' },
  mock: { flex: 1, padding: 8, gap: 6 },
  mockBar: { height: 6, width: '55%', borderRadius: 3 },
  mockCard: { height: 18, borderRadius: 6, justifyContent: 'center', paddingHorizontal: 6 },
  mockDot: { width: 8, height: 8, borderRadius: 4 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  tileLabel: { fontSize: 13, fontFamily: F.semi },
  hint: { fontSize: 12, fontFamily: F.text, marginTop: 8, marginLeft: 4 },
  about: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 14 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  options: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, gap: 12 },
  optionLabel: { fontSize: 14, fontFamily: F.semi },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  segmentItem: { minWidth: 44, height: 36, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, fontFamily: F.bold },
});
