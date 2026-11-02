import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { expandEntries } from '@/core/entries/repeat';
import { mascotMood } from '@/core/game/mascot';
import { summarizeDay } from '@/core/game/review';
import { tickLine } from '@/core/game/voice';
import { addUnit, DAY, floorUnit, HOUR, MINUTE, type WeekStart } from '@/core/time/units';
import { getScale, SCALES, zoomAfterPinch, type ScaleId } from '@/core/timeline/scales';
import type { Direction } from '@/core/timeline/viewport';
import { saveEntry, setEntryDone, useCompletedIds, useEntries, useLayers } from '@/features/entries/data';
import { Tick } from '@/features/game/Tick';
import { TickBubble } from '@/features/game/TickBubble';
import { useProgress } from '@/features/game/useProgress';
import { useFocusedByEntry } from '@/features/focus/data';
import { useInbox } from '@/features/inbox/data';
import { useReviewedDays } from '@/features/review/data';
import { useSetting } from '@/features/settings/data';
import { useNow } from '@/hooks/useNow';
import { syncEntryNotifications } from '@/lib/notifications';
import { ProgressFill, useLoop } from '@/ui/motion';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { JumpSheet, type JumpMode } from './JumpSheet';
import { ViewSheet } from './ViewSheet';
import { TimelineView } from './TimelineView';
import { WeekStrip } from './WeekStrip';

const ZOOM_LABELS: Record<ScaleId, string> = { sec: 'Sec', min: 'Min', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month', year: 'Year' };

export function TimelineScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(10_000);
  const [scaleId, setScaleId] = useState<ScaleId>('hour');
  const direction = useSetting<Direction>('direction', 'down');
  const calm = useSetting<string>('calm', 'off');
  const narrow = useWindowDimensions().width < 520; // phones: short month so the title, buttons and level chip fit
  const inboxCount = useInbox().length;
  const ws: WeekStart = useSetting<string>('weekStart', '1') === '0' ? 0 : 1;
  const [weekShift, setWeekShift] = useState(0);
  const allLayers = useLayers();
  const entries = useEntries();
  const completed = useCompletedIds();
  // Repeating entries become dated occurrences for any stretch of time (core/entries/repeat.ts).
  const around = (from: number, to: number) => expandEntries(entries, completed, from, to);
  const anchorTime = useSharedValue(now);
  const following = useSharedValue(true);
  const layers = allLayers.filter((l) => l.visible);
  const scale = getScale(scaleId);
  const progress = useProgress();
  const lv = progress.level;
  const run = progress.streak;
  useEffect(() => {
    const now = Date.now();
    syncEntryNotifications(expandEntries(entries, completed, now, now + 2 * DAY), now); // reminders cover the next 48 h
  }, [entries, completed]);

  const today = floorUnit(now, 'day');
  const weekStart = addUnit(floorUnit(now, 'week', 1, ws), 'week', weekShift);
  // The title follows the week in the strip (its Thursday decides the month).
  const shown = weekShift ? addUnit(weekStart, 'day', 3) : now;
  const todays = around(today, today + DAY).filter((e) => e.start >= today);
  const doneToday = todays.filter((e) => e.done).length;
  // Tick's line: what the day needs next (core/game/voice.ts).
  const focused = useFocusedByEntry(now);
  const reviewed = useReviewedDays();
  const [hiddenLine, setHiddenLine] = useState<string | null>(null);
  const day = summarizeDay(todays, focused, today, today + DAY, now);
  const work = todays.filter((e) => e.kind === 'task' || e.kind === 'todo');
  const next = work.find((e) => !e.done && (e.end ?? e.start) >= now);
  const mood = mascotMood({ hour: new Date(now).getHours(), doneToday });
  const line = tickLine({
    hour: new Date(now).getHours(),
    planned: day.total,
    doneToday: day.done,
    next: next?.title,
    best: todays.find((e) => e.id === day.bestId)?.title,
    dayClosed: reviewed.includes(today),
    streakDays: run.days,
    hadStreak: run.best > 0,
  });
  const colorById = new Map(allLayers.map((l) => [l.id, l.color.fill]));
  const dotsFor = (day: number) => {
    const next = addUnit(day, 'day', 1);
    return [...new Set(around(day, next).filter((e) => e.start >= day && e.start < next).map((e) => colorById.get(e.layerId) ?? c.muted))].slice(0, 4);
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
  const [viewOpen, setViewOpen] = useState(false);
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
  const planNext = () => openAdd(Math.ceil(Date.now() / (15 * MINUTE)) * 15 * MINUTE, layers[0]?.id ?? '');
  const onTickAction = () => {
    if (line.action === 'plan') planNext();
    else if (line.action === 'review') router.push('/review');
    else if (line.action === 'focus' && next) router.push({ pathname: '/focus/[id]', params: { id: next.seriesId ?? next.id } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top + 8 }]}>
      {/* Clipped in its own layer: overflow in the screen itself lets the browser scroll it sideways when a control takes focus. */}
      <View style={styles.glowLayer}>
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.blob, { boxShadow: `0 0 140px 80px ${c.gradient[1]}` }]} />
      </View>

      <View style={styles.header}>
        <View style={styles.titleRow}>
          {/* The title is the date picker (time is one tap further, inside it). */}
          <Pressable accessibilityRole="button" accessibilityLabel="Pick a date or time" onPress={() => openJump('date')} style={({ pressed }) => [styles.titleButton, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={[styles.month, narrow && styles.monthNarrow, { color: c.ink }]} accessibilityRole="header">
              {new Date(shown).toLocaleDateString(undefined, { month: narrow ? 'short' : 'long' })} <Text style={{ color: c.accentText }}>{new Date(shown).getFullYear()}</Text>
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.muted} />
          </Pressable>
          <View style={styles.jumpButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Inbox, ${inboxCount} parked`}
              onPress={() => router.push('/inbox')}
              style={({ pressed }) => [styles.jumpButton, narrow && styles.jumpButtonNarrow, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
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
            {/* On phones Tick lives on the timeline's trunk; the chip needs the room. */}
            {!narrow && <Tick size={34} mood={mood} celebrate={progress.ready ? progress.xp : undefined} />}
            <Text style={[styles.lv, { color: c.accentText }]}>LV {lv.level}</Text>
            <View style={[styles.xpCol, narrow && styles.xpColNarrow]}>
              <View style={[styles.xpTrack, { backgroundColor: c.chip }]}>
                <ProgressFill value={lv.into / lv.need} colors={c.gradient} />
              </View>
              <Text numberOfLines={1} style={[styles.micro, { color: c.muted }]}>{lv.into}/{lv.need}{narrow ? '' : ' XP'}</Text>
            </View>
            <View style={styles.streakRow}>
              <Flame lit={run.days > 0} muted={c.muted} />
              <Text style={[styles.streak, { color: c.ink }]}>{run.days}</Text>
            </View>
          </Pressable>
        </View>

        <WeekStrip weekStart={weekStart} today={today} onShift={(n) => setWeekShift((w) => w + n)} onPick={jumpTo} dotsFor={dotsFor} />

        <View style={styles.controls}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View: ${layers.length} of ${allLayers.length} layers shown, time runs ${direction}`}
            onPress={() => setViewOpen(true)}
            style={({ pressed }) => [styles.viewButton, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
          >
            <Ionicons name="layers-outline" size={18} color={c.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.trayWrap}>
        {/* Remount per zoom and direction: the content fades in fresh; the camera lives here and survives. */}
        <TimelineView
          key={`${scaleId}-${direction}`}
          entries={entries}
          completed={completed}
          layers={layers}
          scale={scale}
          direction={direction}
          camera={{ anchorTime, following }}
          onAdd={openAdd}
          onOpen={(id) => router.push({ pathname: '/entry/[id]', params: { id } })}
          onToggleDone={(e) => setEntryDone(e, !e.done)}
          onMove={(e, start, end, layerId) => saveEntry(e.id, { ...e, start, end, layerId })}
          onZoom={(pinch) => setScaleId(zoomAfterPinch(scaleId, pinch))}
          onLift={() => {
            if (Platform.OS !== 'web' && calm !== 'on') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
        />
        {entries.length === 0 && (
          // First run: a gentle nudge. box-none keeps the timeline under it scrollable.
          <View pointerEvents="box-none" style={styles.hintWrap}>
            <View style={[styles.hint, { backgroundColor: c.panel, boxShadow: c.raised }]}>
              <Text style={[styles.hintTitle, { color: c.ink }]}>Your day is a blank page</Text>
              <Text style={[styles.hintBody, { color: c.muted }]}>Tap the timeline anywhere, or start here.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={planNext}
                style={({ pressed }) => [styles.hintButton, { boxShadow: c.glow }, pressed && styles.pressed]}
              >
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hintFill}>
                  <Ionicons name="add" size={18} color={c.accentInk} />
                  <Text style={[styles.hintButtonText, { color: c.accentInk }]}>Plan my first task</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
        {entries.length > 0 && calm !== 'on' && hiddenLine !== line.key && (
          <View pointerEvents="box-none" style={styles.hintWrap}>
            <TickBubble line={line} mood={mood} onAction={onTickAction} onDismiss={() => setHiddenLine(line.key)} />
          </View>
        )}
      </View>

      <ViewSheet open={viewOpen} layers={allLayers} direction={direction} onClose={() => setViewOpen(false)} />
      <JumpSheet mode={jump} day={jumpDay} today={today} weekStart={ws} sound={calm !== 'on'} onJump={jumpToTime} onMode={setJump} onClose={() => setJump(null)} />
    </View>
  );
}

/** Watch-complication style progress: 10 segments, the partly filled one dimmed. */
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
  monthNarrow: { fontSize: 20, letterSpacing: -0.4 },
  jumpButtons: { flexDirection: 'row', gap: 6 },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10.5, fontFamily: F.bold },
  jumpButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  jumpButtonNarrow: { width: 32, height: 32, borderRadius: 11 },
  todayPill: { height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  todayText: { fontSize: 12.5, fontFamily: F.bold },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 14 },
  lv: { fontSize: 14, fontFamily: F.display, letterSpacing: 0.5 },
  xpColNarrow: { width: 46 },
  xpCol: { width: 62, gap: 3 },
  xpTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streak: { fontSize: 16, fontFamily: F.display, fontVariant: ['tabular-nums'] },
  micro: { fontSize: 10, fontFamily: F.semi, letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
  segmented: { flex: 1, flexDirection: 'row', gap: 2, padding: 3, borderRadius: 14 },
  zoomChip: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', gap: 8 },
  viewButton: { width: 44, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleButton: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontSize: 12, fontFamily: F.semi },
  trayWrap: { flex: 1, paddingHorizontal: 12 },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center', paddingHorizontal: 24 },
  hint: { width: 320, maxWidth: '100%', borderRadius: 22, padding: 16, gap: 6, alignItems: 'center' },
  hintTitle: { fontSize: 17, fontFamily: F.display },
  hintBody: { fontSize: 13.5, fontFamily: F.text, textAlign: 'center' },
  hintButton: { alignSelf: 'stretch', height: 46, borderRadius: 15, overflow: 'hidden', marginTop: 6 },
  hintFill: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  hintButtonText: { fontSize: 15, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
});
