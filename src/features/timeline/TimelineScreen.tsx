import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { periodProgress, type Period } from '@/core/time/periods';
import { addUnit, floorUnit, HOUR } from '@/core/time/units';
import { getScale, SCALES, type ScaleId } from '@/core/timeline/scales';
import type { Direction } from '@/core/timeline/viewport';
import { setDone, setLayerVisible, useEntries, useLayers } from '@/features/entries/data';
import { useProgress } from '@/features/game/useProgress';
import { useNow } from '@/hooks/useNow';
import { syncEntryNotifications } from '@/lib/notifications';
import { usePalette, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';

import { TimelineView } from './TimelineView';

const ZOOM_LABELS: Record<ScaleId, string> = { sec: 'Sec', min: 'Min', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month', year: 'Year' };
const PERIODS: [string, Period][] = [['DAY', 'day'], ['WEEK', 'week'], ['MONTH', 'month'], ['YEAR', 'year']];
const NEXT_DIRECTION: Record<Direction, Direction> = { down: 'up', up: 'right', right: 'left', left: 'down' };
const ARROW: Record<Direction, string> = { down: '↓', up: '↑', right: '→', left: '←' };

export function TimelineScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(10_000);
  const [scaleId, setScaleId] = useState<ScaleId>('hour');
  const [direction, setDirection] = useState<Direction>('down');
  const allLayers = useLayers();
  const entries = useEntries();
  const anchorTime = useSharedValue(now);
  const following = useSharedValue(true);
  const layers = allLayers.filter((l) => l.visible);
  const scale = getScale(scaleId);
  const progress = useProgress();
  const lv = progress.level;
  const run = progress.streak;
  useEffect(() => {
    syncEntryNotifications(entries, Date.now());
  }, [entries]);

  const today = floorUnit(now, 'day');
  const week = Array.from({ length: 7 }, (_, i) => addUnit(floorUnit(now, 'week'), 'day', i));
  const colorById = new Map(allLayers.map((l) => [l.id, l.color.fill]));
  const dotsFor = (day: number) => {
    const next = addUnit(day, 'day', 1);
    return [...new Set(entries.filter((e) => e.start >= day && e.start < next).map((e) => colorById.get(e.layerId) ?? c.muted))].slice(0, 4);
  };

  const toggleLayer = (id: string, visible: boolean) => {
    if (!visible || layers.length > 1) setLayerVisible(id, !visible); // never hide the last visible layer
  };
  // Today goes back to the live clock; other days open at 9 AM.
  const jumpTo = (day: number) => {
    following.set(false);
    const toToday = day === today;
    anchorTime.set(
      withTiming(toToday ? now : day + 9 * HOUR, { duration: 450 }, (finished) => {
        'worklet';
        if (finished && toToday) following.set(true);
      }),
    );
  };
  const openAdd = (at: number, layerId: string) =>
    router.push({ pathname: '/entry/[id]', params: { id: 'new', at: String(at), layer: layerId, scale: scaleId } });

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top + 8 }]}>
      {/* Clipped in its own layer: overflow in the screen itself lets the browser scroll it sideways when a control takes focus. */}
      <View style={styles.glowLayer}>
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.blob, { boxShadow: `0 0 140px 80px ${c.gradient[1]}` }]} />
      </View>

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.month, { color: c.ink }]} accessibilityRole="header">
            {new Date(now).toLocaleDateString(undefined, { month: 'long' })} <Text style={{ color: c.accentText }}>{new Date(now).getFullYear()}</Text>
          </Text>
          <Pressable
            onPress={() => router.push('/journey')}
            accessibilityRole="button"
            accessibilityLabel={`Level ${lv.level}, ${lv.into} of ${lv.need} XP, ${run.days}-day streak, ${run.freezes} freezes. Open your journey`}
            style={[styles.hud, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}
          >
            <Text style={[styles.lv, { color: c.accentText }]}>LV {lv.level}</Text>
            <View style={styles.xpCol}>
              <View style={[styles.xpTrack, { backgroundColor: c.chip }]}>
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.xpFill, { width: `${(lv.into / lv.need) * 100}%`, boxShadow: c.glow }]} />
              </View>
              <Text style={[styles.micro, { color: c.muted }]}>{lv.into}/{lv.need} XP</Text>
            </View>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={16} color={run.days ? '#FF9F43' : c.muted} />
              <Text style={[styles.streak, { color: c.ink }]}>{run.days}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.week}>
          {week.map((day) => {
            const isToday = day === today;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`Go to ${new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                onPress={() => jumpTo(day)}
                style={({ pressed }) => [styles.day, pressed && styles.pressed]}
              >
                <Text style={[styles.weekday, { color: c.muted }]}>{new Date(day).toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                <View style={[styles.dayNum, isToday && { backgroundColor: c.accent, boxShadow: c.glow }]}>
                  <Text style={[styles.dayText, { color: isToday ? c.accentInk : c.ink }]}>{new Date(day).getDate()}</Text>
                </View>
                <View style={styles.dots}>
                  {dotsFor(day).map((color) => (
                    <View key={color} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Open today's review" onPress={() => router.push('/review')} style={[styles.complications, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
          {PERIODS.map(([label, period]) => {
            const f = periodProgress(now, period);
            return (
              <View key={period} style={styles.complication}>
                <View style={styles.compText}>
                  <Text style={[styles.micro, { color: c.muted }]}>{label}</Text>
                  <Text style={[styles.micro, { color: c.ink }]}>{Math.floor(f * 100)}%</Text>
                </View>
                <Segments value={f} c={c} />
              </View>
            );
          })}
        </Pressable>

        <View style={[styles.segmented, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
          {SCALES.map((s) => {
            const on = s.id === scaleId;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Zoom to ${ZOOM_LABELS[s.id]}`}
                onPress={() => setScaleId(s.id)}
                style={({ pressed }) => [styles.zoomChip, on && { backgroundColor: c.accent, boxShadow: c.selected }, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, { color: on ? c.accentInk : c.muted }]}>{ZOOM_LABELS[s.id]}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.layerRow}>
          {allLayers.map((l) => {
            const on = l.visible;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${on ? 'Hide' : 'Show'} ${l.name} layer`}
                onPress={() => toggleLayer(l.id, on)}
                style={({ pressed }) => [styles.layerChip, { backgroundColor: on ? c.panel : 'transparent', boxShadow: on ? c.raisedSm : c.pressedIn }, pressed && styles.pressed]}
              >
                <View style={[styles.layerDot, { backgroundColor: on ? l.color.fill : 'transparent', borderColor: l.color.fill }]} />
                <Text style={[styles.chipText, { color: on ? c.ink : c.muted }]}>{l.name}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Timeline runs ${direction}. Change direction`}
            onPress={() => setDirection(NEXT_DIRECTION[direction])}
            style={[styles.dirButton, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}
          >
            <Text style={[styles.dirText, { color: c.ink }]}>{ARROW[direction]}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.trayWrap}>
        {/* Remount per zoom and direction: the content fades in fresh; the camera lives here and survives. */}
        <TimelineView
          key={`${scaleId}-${direction}`}
          entries={entries}
          layers={layers}
          scale={scale}
          direction={direction}
          camera={{ anchorTime, following }}
          onAdd={openAdd}
          onOpen={(id) => router.push({ pathname: '/entry/[id]', params: { id } })}
          onToggleDone={(e) => setDone(e.id, !e.done)}
        />
      </View>

    </View>
  );
}

/** Watch-complication style progress: 10 segments, the partly filled one dimmed. */
function Segments({ value, c }: { value: number; c: Palette }) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: 10 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, value * 10 - i));
        return <View key={i} style={[styles.segment, { backgroundColor: fill > 0 ? c.ink : c.chip, opacity: fill > 0 ? 0.35 + 0.65 * fill : 1 }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 10, overflow: 'hidden' },
  glowLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' },
  blob: { position: 'absolute', top: -110, right: -70, width: 170, height: 170, borderRadius: 85, opacity: 0.16 },
  header: { paddingHorizontal: 16, gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  month: { flexShrink: 1, fontSize: 26, fontFamily: F.display, letterSpacing: -0.6 },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 14 },
  lv: { fontSize: 14, fontFamily: F.display, letterSpacing: 0.5 },
  xpCol: { width: 62, gap: 3 },
  xpTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streak: { fontSize: 16, fontFamily: F.display, fontVariant: ['tabular-nums'] },
  micro: { fontSize: 10, fontFamily: F.semi, letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
  week: { flexDirection: 'row' },
  day: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  weekday: { fontSize: 11, fontFamily: F.semi },
  dayNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 16, fontFamily: F.displaySemi, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  complications: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  complication: { flex: 1, gap: 4 },
  compText: { flexDirection: 'row', justifyContent: 'space-between' },
  segments: { flexDirection: 'row', gap: 2 },
  segment: { flex: 1, height: 8, borderRadius: 2 },
  segmented: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 14 },
  zoomChip: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontFamily: F.semi },
  layerRow: { flexDirection: 'row', gap: 6 },
  layerChip: { flex: 1, height: 38, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  layerDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  dirButton: { width: 44, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dirText: { fontSize: 18, fontFamily: F.bold },
  trayWrap: { flex: 1, paddingHorizontal: 12 },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
});
