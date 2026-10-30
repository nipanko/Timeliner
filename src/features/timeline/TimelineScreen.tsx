import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { streak } from '@/core/game/streaks';
import { levelFor, MILESTONE_XP, REVIEW_XP, totalXp } from '@/core/game/xp';
import { periodProgress, type Period } from '@/core/time/periods';
import { addUnit, floorUnit } from '@/core/time/units';
import { getScale, SCALES, type ScaleId } from '@/core/timeline/scales';
import type { Direction } from '@/core/timeline/viewport';
import { setLayerVisible, useEntries, useLayers } from '@/features/entries/data';
import { useFocusedByEntry } from '@/features/focus/data';
import { useMilestones } from '@/features/journey/data';
import { useReviewedDays } from '@/features/review/data';
import { syncEntryNotifications } from '@/lib/notifications';
import { useNow } from '@/hooks/useNow';
import { usePalette } from '@/ui/theme';

import { TimelineView } from './TimelineView';

const ZOOM_LABELS: Record<ScaleId, string> = { sec: 'Sec', min: 'Min', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month', year: 'Year' };
const PERIODS: [string, Period][] = [['Day', 'day'], ['Week', 'week'], ['Month', 'month'], ['Year', 'year']];
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
  const hour = new Date(now).getHours();
  const focused = useFocusedByEntry(now);
  const reviewed = useReviewedDays();
  const reachedMilestones = useMilestones().filter((m) => m.doneAt !== null).length;
  const lv = levelFor(totalXp(entries.map((e) => ({ ...e, focusedMs: focused.get(e.id) }))) + REVIEW_XP * reviewed.length + MILESTONE_XP * reachedMilestones);
  useEffect(() => {
    syncEntryNotifications(entries, Date.now());
  }, [entries]);
  const run = streak(entries.filter((e) => e.done && (e.kind === 'task' || e.kind === 'todo')).map((e) => e.start), now);

  const toggleLayer = (id: string, visible: boolean) => {
    if (!visible || layers.length > 1) setLayerVisible(id, !visible); // never hide the last visible layer
  };
  const openAdd = (at: number, layerId: string) =>
    router.push({ pathname: '/entry/[id]', params: { id: 'new', at: String(at), layer: layerId, scale: scaleId } });
  // The + button adds at the next free slot after now.
  const addNow = () => openAdd(addUnit(floorUnit(Date.now(), scale.snap.unit, scale.snap.step), scale.snap.unit, scale.snap.step), layers[0]?.id ?? '');

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: c.ink }]}>{hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}</Text>
          <Text style={[styles.date, { color: c.ink }]}>{new Date(now).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
        </View>

        <Pressable onPress={() => router.push('/journey')} accessibilityRole="button" style={[styles.panel, styles.hud, { backgroundColor: c.panel, boxShadow: c.raised }]} accessibilityLabel={`Level ${lv.level}, ${lv.into} of ${lv.need} XP, ${run.days}-day streak, ${run.freezes} freezes. Open your journey`}>
          <View style={[styles.levelBadge, { backgroundColor: c.accent }]}>
            <Text style={[styles.levelText, { color: c.accentInk }]}>{lv.level}</Text>
          </View>
          <View style={styles.xpCol}>
            <View style={styles.periodText}>
              <Text style={[styles.small, { color: c.ink }]}>Level {lv.level}</Text>
              <Text style={[styles.small, { color: c.muted }]}>{lv.into} / {lv.need} XP</Text>
            </View>
            <View style={[styles.track, { backgroundColor: c.chip, boxShadow: c.pressedIn }]}>
              <View style={[styles.trackFill, { width: `${(lv.into / lv.need) * 100}%`, backgroundColor: c.accent }]} />
            </View>
          </View>
          <Text style={[styles.streak, { color: c.ink }]}>{run.days}d streak{run.freezes ? ` · ${run.freezes} freeze${run.freezes > 1 ? 's' : ''}` : ''}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Open today's review" onPress={() => router.push('/review')} style={[styles.panel, styles.periods, { backgroundColor: c.panel, boxShadow: c.raised }]}>
          {PERIODS.map(([label, period]) => {
            const f = periodProgress(now, period);
            return (
              <View key={period} style={styles.period} accessible accessibilityLabel={`${label} ${Math.floor(f * 100)} percent done`}>
                <View style={styles.periodText}>
                  <Text style={[styles.small, { color: c.muted }]}>{label}</Text>
                  <Text style={[styles.small, { color: c.muted }]}>{Math.floor(f * 100)}%</Text>
                </View>
                <View style={[styles.track, { backgroundColor: c.chip, boxShadow: c.pressedIn }]}>
                  <View style={[styles.trackFill, { width: `${f * 100}%`, backgroundColor: c.ink }]} />
                </View>
              </View>
            );
          })}
        </Pressable>

        <View style={[styles.panel, styles.zoomBar, { backgroundColor: c.panel, boxShadow: c.raised }]}>
          {SCALES.map((s) => {
            const on = s.id === scaleId;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Zoom to ${ZOOM_LABELS[s.id]}`}
                onPress={() => setScaleId(s.id)}
                style={[styles.zoomChip, on && { backgroundColor: c.accent, boxShadow: c.selected }]}
              >
                <Text style={[styles.chipText, { color: on ? c.accentInk : c.ink }]}>{ZOOM_LABELS[s.id]}</Text>
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
                style={[styles.layerChip, on ? { backgroundColor: l.color.fill, boxShadow: c.raisedSm } : { borderWidth: 2, borderStyle: 'dashed', borderColor: c.lineStrong }]}
              >
                <Text style={[styles.chipText, { color: on ? l.color.ink : c.ink }]}>{l.name}</Text>
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
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Add an entry" onPress={addNow} style={[styles.fab, { boxShadow: c.raised }]}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 10 },
  header: { paddingHorizontal: 14, gap: 10 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  greeting: { fontSize: 22, fontWeight: '800' },
  date: { fontSize: 13, fontWeight: '800' },
  panel: { borderRadius: 18 },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
  levelBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  levelText: { fontSize: 17, fontWeight: '900' },
  xpCol: { flex: 1, gap: 4 },
  streak: { fontSize: 12, fontWeight: '900' },
  periods: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
  period: { flex: 1, gap: 4 },
  periodText: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 10.5, fontWeight: '900', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 4, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 4 },
  zoomBar: { flexDirection: 'row', gap: 3, padding: 4 },
  zoomChip: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '900' },
  layerRow: { flexDirection: 'row', gap: 6 },
  layerChip: { flex: 1, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dirButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dirText: { fontSize: 20, fontWeight: '900' },
  trayWrap: { flex: 1, paddingHorizontal: 10 },
  fab: { position: 'absolute', right: 22, bottom: 64, width: 60, height: 60, borderRadius: 20, backgroundColor: '#F07A2E', alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', lineHeight: 36 },
});
