import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mascotMood } from '@/core/game/mascot';
import { periodProgress, type Period } from '@/core/time/periods';
import { addUnit, DAY, floorUnit, HOUR, MINUTE, type WeekStart } from '@/core/time/units';
import { getScale, SCALES, zoomAfterPinch, type ScaleId } from '@/core/timeline/scales';
import type { Direction } from '@/core/timeline/viewport';
import { saveEntry, setDone, setLayerVisible, useEntries, useLayers } from '@/features/entries/data';
import { Tick } from '@/features/game/Tick';
import { useProgress } from '@/features/game/useProgress';
import { useInbox } from '@/features/inbox/data';
import { setSetting, useSetting } from '@/features/settings/data';
import { useNow } from '@/hooks/useNow';
import { syncEntryNotifications } from '@/lib/notifications';
import { ProgressFill, useLoop } from '@/ui/motion';
import { usePalette, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';

import { JumpSheet, type JumpMode } from './JumpSheet';
import { TimelineView } from './TimelineView';
import { WeekStrip } from './WeekStrip';

const ZOOM_LABELS: Record<ScaleId, string> = { sec: 'Sec', min: 'Min', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month', year: 'Year' };
const PERIODS: [string, Period][] = [['DAY', 'day'], ['WEEK', 'week'], ['MONTH', 'month'], ['YEAR', 'year']];
const NEXT_DIRECTION: Record<Direction, Direction> = { down: 'up', up: 'right', right: 'left', left: 'down' };
const ARROW: Record<Direction, string> = { down: '↓', up: '↑', right: '→', left: '←' };

export function TimelineScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(10_000);
  const [scaleId, setScaleId] = useState<ScaleId>('hour');
  const direction = useSetting<Direction>('direction', 'down');
  const calm = useSetting<string>('calm', 'off');
  const inboxCount = useInbox().length;
  const ws: WeekStart = useSetting<string>('weekStart', '1') === '0' ? 0 : 1;
  const [weekShift, setWeekShift] = useState(0);
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
  const weekStart = addUnit(floorUnit(now, 'week', 1, ws), 'week', weekShift);
  // The title follows the week in the strip (its Thursday decides the month).
  const shown = weekShift ? addUnit(weekStart, 'day', 3) : now;
  const doneToday = entries.filter((e) => e.done && e.start >= today && e.start < today + DAY).length;
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
  // Calendar / clock buttons: jump the camera to any moment and bring the week strip along.
  const [jump, setJump] = useState<JumpMode | null>(null);
  const [jumpDay, setJumpDay] = useState(today);
  const openJump = (mode: JumpMode) => {
    setJumpDay(floorUnit(anchorTime.get(), 'day'));
    setJump(mode);
  };
  const jumpToTime = (t: number) => {
    setJump(null);
    const live = Math.abs(t - Date.now()) < MINUTE;
    setWeekShift(Math.round((floorUnit(t, 'week', 1, ws) - floorUnit(now, 'week', 1, ws)) / (7 * DAY)));
    following.set(false);
    anchorTime.set(
      withTiming(live ? Date.now() : t, { duration: 450 }, (finished) => {
        'worklet';
        if (finished && live) following.set(true);
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
            {new Date(shown).toLocaleDateString(undefined, { month: 'long' })} <Text style={{ color: c.accentText }}>{new Date(shown).getFullYear()}</Text>
          </Text>
          <View style={styles.jumpButtons}>
            <Pressable accessibilityRole="button" accessibilityLabel="Pick a date" onPress={() => openJump('date')} style={({ pressed }) => [styles.jumpButton, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}>
              <Ionicons name="calendar-outline" size={17} color={c.ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Pick a time" onPress={() => openJump('time')} style={({ pressed }) => [styles.jumpButton, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}>
              <Ionicons name="time-outline" size={17} color={c.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Inbox, ${inboxCount} parked`}
              onPress={() => router.push('/inbox')}
              style={({ pressed }) => [styles.jumpButton, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
            >
              <Ionicons name="file-tray-outline" size={17} color={c.ink} />
              {inboxCount > 0 && (
                <View style={[styles.badge, { backgroundColor: c.accent, boxShadow: c.glow }]}>
                  <Text style={[styles.badgeText, { color: c.accentInk }]}>{inboxCount > 9 ? '9+' : inboxCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
          {weekShift !== 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to this week"
              onPress={() => {
                setWeekShift(0);
                jumpTo(today);
              }}
              style={({ pressed }) => [styles.todayPill, { backgroundColor: c.chip, boxShadow: c.raisedSm }, pressed && styles.pressed]}
            >
              <Text style={[styles.todayText, { color: c.ink }]}>Today</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/journey')}
            accessibilityRole="button"
            accessibilityLabel={`Level ${lv.level}, ${lv.into} of ${lv.need} XP, ${run.days}-day streak, ${run.freezes} freezes. Open your journey`}
            style={[styles.hud, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}
          >
            <Tick size={34} mood={mascotMood({ hour: new Date(now).getHours(), doneToday })} celebrate={progress.ready ? progress.xp : undefined} />
            <Text style={[styles.lv, { color: c.accentText }]}>LV {lv.level}</Text>
            <View style={styles.xpCol}>
              <View style={[styles.xpTrack, { backgroundColor: c.chip }]}>
                <ProgressFill value={lv.into / lv.need} colors={c.gradient} />
              </View>
              <Text style={[styles.micro, { color: c.muted }]}>{lv.into}/{lv.need} XP</Text>
            </View>
            <View style={styles.streakRow}>
              <Flame lit={run.days > 0} muted={c.muted} />
              <Text style={[styles.streak, { color: c.ink }]}>{run.days}</Text>
            </View>
          </Pressable>
        </View>

        <WeekStrip weekStart={weekStart} today={today} onShift={(n) => setWeekShift((w) => w + n)} onPick={jumpTo} dotsFor={dotsFor} />

        <Pressable accessibilityRole="button" accessibilityLabel="Open today's review" onPress={() => router.push('/review')} style={[styles.complications, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
          {PERIODS.map(([label, period]) => {
            const f = periodProgress(now, period, ws);
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
            onPress={() => setSetting('direction', NEXT_DIRECTION[direction])}
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
          onMove={(e, start, end, layerId) => saveEntry(e.id, { ...e, start, end, layerId })}
          onZoom={(pinch) => setScaleId(zoomAfterPinch(scaleId, pinch))}
          onLift={() => {
            if (Platform.OS !== 'web' && calm !== 'on') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
        />
      </View>

      <JumpSheet mode={jump} day={jumpDay} today={today} weekStart={ws} sound={calm !== 'on'} onJump={jumpToTime} onClose={() => setJump(null)} />
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

/** The streak flame flickers while the streak is alive (DESIGN.md §2). */
function Flame({ lit, muted }: { lit: boolean; muted: string }) {
  const t = useLoop(1600, lit);
  const flicker = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.12 * t.get() }, { rotate: `${Math.sin(t.get() * Math.PI * 2) * 4}deg` }], opacity: 0.85 + 0.15 * t.get() }));
  return (
    <Animated.View style={flicker}>
      <Ionicons name="flame" size={16} color={lit ? '#FF9F43' : muted} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 10, overflow: 'hidden' },
  glowLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' },
  blob: { position: 'absolute', top: -110, right: -70, width: 170, height: 170, borderRadius: 85, opacity: 0.16 },
  header: { paddingHorizontal: 16, gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  month: { flexShrink: 1, fontSize: 26, fontFamily: F.display, letterSpacing: -0.6 },
  jumpButtons: { flexDirection: 'row', gap: 6 },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10.5, fontFamily: F.bold },
  jumpButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  todayPill: { height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  todayText: { fontSize: 12.5, fontFamily: F.bold },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 14 },
  lv: { fontSize: 14, fontFamily: F.display, letterSpacing: 0.5 },
  xpCol: { width: 62, gap: 3 },
  xpTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streak: { fontSize: 16, fontFamily: F.display, fontVariant: ['tabular-nums'] },
  micro: { fontSize: 10, fontFamily: F.semi, letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
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
