import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { expandEntries } from '@/core/entries/repeat';
import { mascotMood } from '@/core/game/mascot';
import { summarizeDay } from '@/core/game/review';
import { tickLine } from '@/core/game/voice';
import { DAY, floorUnit, MINUTE, type WeekStart } from '@/core/time/units';
import { getScale, zoomAfterPinch, type ScaleId } from '@/core/timeline/scales';
import type { Direction } from '@/core/timeline/viewport';
import { saveEntry, setEntryDone, useCompletedIds, useEntries, useLayers } from '@/features/entries/data';
import { TickBubble } from '@/features/game/TickBubble';
import { useProgress } from '@/features/game/useProgress';
import { useFocusedByEntry } from '@/features/focus/data';
import { useInbox } from '@/features/inbox/data';
import { useReviewedDays } from '@/features/review/data';
import { useClock24, useSetting } from '@/features/settings/data';
import { useNow } from '@/hooks/useNow';
import { syncEntryNotifications } from '@/lib/notifications';
import { Halftone } from '@/ui/Halftone';
import { useLoop } from '@/ui/motion';
import { usePalette, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';

import { JumpSheet, type JumpMode } from './JumpSheet';
import { ViewSheet } from './ViewSheet';
import { TimelineView } from './TimelineView';

const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function TimelineScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(10_000);
  const [scaleId, setScaleId] = useState<ScaleId>('hour');
  const direction = useSetting<Direction>('direction', 'down');
  const calm = useSetting<string>('calm', 'off');
  const narrow = useWindowDimensions().width < 520;
  const inboxCount = useInbox().length;
  const ws: WeekStart = useSetting<string>('weekStart', '1') === '0' ? 0 : 1;
  const h24 = useClock24();
  const allLayers = useLayers();
  const entries = useEntries();
  const completed = useCompletedIds();
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
  // The title shows the day under the pointer, wherever the timeline has been scrolled to.
  const [viewDay, setViewDay] = useState(today);
  const kicker = viewDay === today ? 'TODAY' : viewDay === floorUnit(today + 36 * 60 * MINUTE, 'day') ? 'TOMORROW' : viewDay === floorUnit(today - 12 * 60 * MINUTE, 'day') ? 'YESTERDAY' : new Date(viewDay).toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();

  // Tick's line: what the day needs next (core/game/voice.ts).
  const todays = expandEntries(entries, completed, today, today + DAY).filter((e) => e.start >= today && e.start < today + DAY);
  const doneToday = todays.filter((e) => e.done).length;
  const focused = useFocusedByEntry(now);
  const reviewed = useReviewedDays();
  const [hiddenLine, setHiddenLine] = useState<string | null>(null);
  const day = summarizeDay(todays, focused, today, today + DAY, now);
  const next = todays.filter((e) => e.kind === 'task' || e.kind === 'todo').find((e) => !e.done && (e.end ?? e.start) >= now);
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

  // The calendar (title) and the time wheels (the pointer's time) move the camera anywhere.
  const [jump, setJump] = useState<JumpMode | null>(null);
  const [jumpAt, setJumpAt] = useState(now);
  const [viewOpen, setViewOpen] = useState(false);
  const jumpToTime = (t: number) => {
    setJump(null);
    const live = Math.abs(t - Date.now()) < MINUTE;
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
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top + 10 }]}>
      {/* Clipped in its own layer: overflow in the screen itself lets the browser scroll it sideways when a control takes focus. */}
      <View style={styles.glowLayer}>
        <View style={[styles.blob, styles.blobTop, { backgroundColor: c.pop, boxShadow: `0 0 160px 90px ${c.pop}` }]} />
        <View style={[styles.blob, styles.blobBottom, { backgroundColor: c.gradient[1], boxShadow: `0 0 160px 90px ${c.gradient[1]}` }]} />
        <Halftone color={c.dots} />
      </View>

      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${longDay.format(viewDay)}. Pick a date`} onPress={() => setJump('date')} style={({ pressed }) => [styles.titleButton, pressed && styles.pressed]}>
          <Text style={[styles.kicker, { color: c.accentText }]}>{kicker}</Text>
          <View style={styles.dateRow}>
            <Text numberOfLines={1} style={[styles.date, narrow && styles.dateNarrow, { color: c.ink }]} accessibilityRole="header">
              {new Date(viewDay).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </Text>
            <Text style={[styles.year, { color: c.muted }]}>{new Date(viewDay).getFullYear()}</Text>
            <Ionicons name="chevron-down" size={15} color={c.muted} />
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push('/journey')}
            accessibilityRole="button"
            accessibilityLabel={`Level ${lv.level}, ${lv.into} of ${lv.need} XP, ${run.days}-day streak, ${run.freezes} freezes. Open your journey`}
            style={({ pressed }) => [styles.hud, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
          >
            <LevelRing c={c} level={lv.level} value={lv.into / lv.need} />
            <View style={styles.streakRow}>
              <Flame lit={run.days > 0} muted={c.muted} />
              <Text style={[styles.streak, { color: c.ink }]}>{run.days}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Inbox, ${inboxCount} parked`}
            onPress={() => router.push('/inbox')}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
          >
            <Ionicons name="file-tray-outline" size={19} color={c.ink} />
            {inboxCount > 0 && (
              <View style={[styles.badge, { backgroundColor: c.gold, boxShadow: c.raisedSm }]}>
                <Text style={[styles.badgeText, { color: c.edge }]}>{inboxCount > 9 ? '9+' : inboxCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {entries.length > 0 && calm !== 'on' && hiddenLine !== line.key && (
        <View style={styles.tickBar}>
          <TickBubble line={line} mood={mood} celebrate={progress.ready ? progress.xp : undefined} onAction={onTickAction} onDismiss={() => setHiddenLine(line.key)} />
        </View>
      )}

      <View style={styles.trayWrap}>
        {/* Remount per zoom and direction: the content fades in fresh; the camera lives here and survives. */}
        <TimelineView
          key={`${scaleId}-${direction}`}
          entries={entries}
          completed={completed}
          layers={layers}
          scale={scale}
          direction={direction}
          weekStart={ws}
          h24={h24}
          camera={{ anchorTime, following }}
          onAdd={openAdd}
          onOpen={(id) => router.push({ pathname: '/entry/[id]', params: { id } })}
          onToggleDone={(e) => setEntryDone(e, !e.done)}
          onMove={(e, start, end, layerId) => saveEntry(e.id, { ...e, start, end, layerId })}
          onZoom={(pinch) => setScaleId(zoomAfterPinch(scaleId, pinch))}
          onZoomTo={(to, at) => {
            following.set(false);
            anchorTime.set(at);
            setScaleId(to);
          }}
          onPointerDay={setViewDay}
          onOpenView={() => setViewOpen(true)}
          onPickTime={(at) => {
            setJumpAt(at);
            setJump('time');
          }}
          onLift={() => {
            if (Platform.OS !== 'web' && calm !== 'on') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
        />
        {entries.length === 0 && (
          // First run: a gentle nudge. box-none keeps the timeline under it scrollable.
          <View pointerEvents="box-none" style={styles.hintWrap}>
            <View style={[styles.hint, { backgroundColor: c.panel, boxShadow: c.raised }]}>
              <Text style={[styles.hintTitle, { color: c.ink }]}>Your day is a blank page</Text>
              <Text style={[styles.hintBody, { color: c.muted }]}>Scroll the line to a time and tap Add, or start right here.</Text>
              <Pressable accessibilityRole="button" onPress={planNext} style={({ pressed }) => [styles.hintButton, { boxShadow: c.raisedSm }, pressed && styles.pressed]}>
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hintFill}>
                  <Ionicons name="add" size={18} color={c.accentInk} />
                  <Text style={[styles.hintButtonText, { color: c.accentInk }]}>Plan my first task</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <ViewSheet open={viewOpen} layers={allLayers} direction={direction} scaleId={scaleId} h24={h24} onScale={setScaleId} onClose={() => setViewOpen(false)} />
      <JumpSheet mode={jump} day={jump === 'time' ? floorUnit(jumpAt, 'day') : viewDay} at={jumpAt} today={today} weekStart={ws} h24={h24} sound={calm !== 'on'} onJump={jumpToTime} onClose={() => setJump(null)} />
    </View>
  );
}

/** Level badge: the number inside a ring that fills with this level's XP. */
function LevelRing({ c, level, value }: { c: Palette; level: number; value: number }) {
  const r = 17;
  const length = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg width={42} height={42} viewBox="0 0 42 42">
        <Circle cx={21} cy={21} r={r} stroke={c.chip} strokeWidth={5} fill="none" />
        <Circle cx={21} cy={21} r={r} stroke={c.accentText} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${Math.max(0.01, Math.min(1, value)) * length} ${length}`} transform="rotate(-90 21 21)" />
      </Svg>
      <View style={styles.ringText}>
        <Text style={[styles.ringLv, { color: c.muted }]}>LV</Text>
        <Text style={[styles.ringLevel, { color: c.ink }]}>{level}</Text>
      </View>
    </View>
  );
}

/** The streak flame flickers while the streak is alive (DESIGN.md §2). */
function Flame({ lit, muted }: { lit: boolean; muted: string }) {
  const t = useLoop(1600, lit);
  const flicker = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.12 * t.get() }, { rotate: `${Math.sin(t.get() * Math.PI * 2) * 4}deg` }], opacity: 0.85 + 0.15 * t.get() }));
  return (
    <Animated.View style={flicker}>
      <Ionicons name="flame" size={18} color={lit ? '#FF9F43' : muted} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 10, overflow: 'hidden' },
  glowLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' },
  blob: { position: 'absolute', width: 160, height: 160, borderRadius: 80, opacity: 0.14 },
  blobTop: { top: -110, right: -60 },
  blobBottom: { bottom: -40, left: -90 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  titleButton: { flexShrink: 1 },
  kicker: { fontSize: 12, fontFamily: F.display, letterSpacing: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  date: { flexShrink: 1, fontSize: 36, lineHeight: 40, fontFamily: F.display },
  dateNarrow: { fontSize: 32, lineHeight: 36 },
  year: { fontSize: 17, fontFamily: F.display },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingLeft: 4, paddingRight: 12, borderRadius: 16 },
  ring: { width: 42, height: 42 },
  ringText: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringLv: { fontSize: 7.5, fontFamily: F.bold, lineHeight: 8 },
  ringLevel: { fontSize: 16, fontFamily: F.display, lineHeight: 18 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streak: { fontSize: 18, fontFamily: F.display, fontVariant: ['tabular-nums'] },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontFamily: F.display },
  tickBar: { paddingHorizontal: 16 },
  trayWrap: { flex: 1, paddingHorizontal: 4 },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center', paddingHorizontal: 24 },
  hint: { width: 320, maxWidth: '100%', borderRadius: 22, padding: 16, gap: 6, alignItems: 'center' },
  hintTitle: { fontSize: 19, fontFamily: F.display },
  hintBody: { fontSize: 13.5, fontFamily: F.text, textAlign: 'center' },
  hintButton: { alignSelf: 'stretch', height: 46, borderRadius: 15, overflow: 'hidden', marginTop: 6 },
  hintFill: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  hintButtonText: { fontSize: 16, fontFamily: F.display },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
});
