import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  FadeIn,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withSequence,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { expandEntries, parseRepeat, repeatLabel } from '@/core/entries/repeat';
import { reschedule } from '@/core/entries/timing';
import { entryXp } from '@/core/game/xp';
import { addUnit, APPROX_MS, floorUnit, HOUR, SECOND, type Interval, type WeekStart } from '@/core/time/units';
import { zoomAfterPinch, type Scale, type ScaleId } from '@/core/timeline/scales';
import { BUCKET_ZOOM, BUCKETS, bucketize, snapTo, spineSides, stackCards, type Side } from '@/core/timeline/spine';
import { clockTime, hasLabel, labelEvery, pointerLabel, rulerLabel, ticks } from '@/core/timeline/ticks';
import { isVertical, posToTime, timeToPos, visibleRange, type Direction, type Viewport } from '@/core/timeline/viewport';
import type { Entry, Layer } from '@/features/entries/data';
import { Tick } from '@/features/game/Tick';
import { useNow } from '@/hooks/useNow';
import { useLoop } from '@/ui/motion';
import { KIND_ICONS, usePalette, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';

type PanGesture = ReturnType<typeof usePanGesture>;

const ANCHOR = 0.42; // where the pointer sits along the axis, measured from the past end
const BUFFER = 1; // screens laid out beyond each edge
const FAR_PX = 20_000; // re-base positions before native (float32) transforms lose precision
const SPINE = 14; // the spine's thickness
const EDGE = 8; // gap between cards and the edge of the timeline
const NODE = 24; // the round check on a card
const GAP = 8; // between stacked cards on one side
const NEAR = 40; // px: "now" this close to the pointer rides on it
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** The camera outlives a zoom change (TimelineView remounts per zoom), so the screen owns it. */
export type Camera = { anchorTime: SharedValue<number>; following: SharedValue<boolean> };

type Props = {
  entries: readonly Entry[];
  /** Finished occurrences of repeating entries (expanded here, for whatever stretch of time is drawn). */
  completed: ReadonlySet<string>;
  /** Visible layers; new entries start in the first one. */
  layers: readonly Layer[];
  scale: Scale;
  direction: Direction;
  weekStart: WeekStart;
  /** 24-hour clock (Settings); false = 12-hour with AM/PM. */
  h24: boolean;
  camera: Camera;
  /** The pointer's Add: its exact (snapped) time and the layer a new entry starts in. */
  onAdd: (at: number, layerId: string) => void;
  onOpen: (entryId: string) => void;
  /** The round check on a card: complete or undo without opening it. */
  onToggleDone: (entry: Entry) => void;
  /** Long-press and drag a card along the spine: its new, snapped times. */
  onMove: (entry: Entry, start: number, end: number | null, layerId: string) => void;
  /** A card was picked up (for a haptic). */
  onLift: () => void;
  /** Pinch (or ctrl/⌘ + scroll on web) ended: the finger-distance ratio, > 1 = zoom in. */
  onZoom: (pinchScale: number) => void;
  /** A bubble (zoomed far out) was tapped: open this zoom at this time. */
  onZoomTo: (scale: ScaleId, at: number) => void;
  /** The local day under the pointer changed; the screen's title follows it. */
  onPointerDay: (day: number) => void;
  /** The zoom chip on the pointer: view options. */
  onOpenView: () => void;
  /** The pointer's time was tapped: dial it in exactly. */
  onPickTime: (at: number) => void;
};

const ZOOM_NAMES: Record<ScaleId, string> = { sec: 'Seconds', min: 'Minutes', hour: 'Hours', day: 'Days', week: 'Weeks', month: 'Months', year: 'Years' };
const ZOOM_SHORT: Record<ScaleId, string> = { sec: 'Sec', min: 'Min', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month', year: 'Year' };

/**
 * The v2 timeline (DESIGN.md §3.1): one spine through the middle with a "h | m" ruler, entries as cards
 * alternating on both sides, and a fixed pointer that reads the exact time under it. Endless both ways.
 */
export function TimelineView({ entries, completed, layers, scale, direction, weekStart, h24, camera, onAdd, onOpen, onToggleDone, onMove, onLift, onZoom, onZoomTo, onPointerDay, onOpenView, onPickTime }: Props) {
  const c = usePalette();
  const reduceMotion = useReducedMotion();
  const { anchorTime, following } = camera;
  const vertical = isVertical(direction);
  const sign = direction === 'up' || direction === 'left' ? -1 : 1;
  const span = scale.span;
  const buckets = BUCKETS[scale.id];
  const compact = scale.id === 'day';

  const [box, setBox] = useState({ w: 0, h: 0 });
  const L = Math.max(1, vertical ? box.h : box.w);
  const C = Math.max(1, vertical ? box.w : box.h);
  // Across the axis: spine in the middle, ruler labels beside it, cards beyond them.
  const MID = C / 2;
  const LABEL = vertical ? 40 : 24;
  const CARD = vertical ? (compact ? 30 : 64) : compact ? 112 : 150; // a card's length along the axis (room for a 2-line title)
  const room = Math.max(40, MID - SPINE / 2 - LABEL - EDGE);
  const CROSS = vertical ? Math.min(210, room) : Math.min(compact ? 34 : 60, room);
  const crossStart = (side: Side) => (side > 0 ? MID + SPINE / 2 + LABEL : MID - SPINE / 2 - LABEL - CROSS);
  const pointerPx = (sign > 0 ? ANCHOR : 1 - ANCHOR) * L;

  // React lays out a window around `center`; positions are measured from `origin`, so moving the
  // window never moves what is already on screen. The UI thread only translates the whole layer.
  const [origin, setOrigin] = useState(() => anchorTime.get());
  const [center, setCenter] = useState(origin);
  const [showNowButton, setShowNowButton] = useState(() => !following.get());
  const nowTime = useSharedValue(origin);
  const dragStart = useSharedValue(0);
  const relayoutPending = useSharedValue(false);

  const moveWindow = (t: number) => {
    setCenter(t);
    if ((Math.abs(t - origin) * L) / span > FAR_PX) setOrigin(t);
  };

  useFrameCallback(() => {
    let t = Date.now();
    if (reduceMotion) t -= t % 1000; // step once a second instead of flowing
    nowTime.set(t);
    if (following.get()) anchorTime.set(t);
    if (Math.abs(anchorTime.get() - center) <= span / 2) relayoutPending.set(false);
    else if (!relayoutPending.get()) {
      relayoutPending.set(true);
      scheduleOnRN(moveWindow, anchorTime.get());
    }
  });

  // Anything can stop following the clock (a drag, a jump), so the button watches `following` itself.
  useAnimatedReaction(
    () => following.get(),
    (now, before) => {
      if (now !== before) scheduleOnRN(setShowNowButton, !now);
    },
  );

  const pan = usePanGesture({
    onActivate: () => {
      cancelAnimation(anchorTime);
      following.set(false);
      dragStart.set(anchorTime.get());
      scheduleOnRN(setShowNowButton, true);
    },
    onUpdate: (e) => {
      anchorTime.set(dragStart.get() - (sign * (vertical ? e.translationY : e.translationX) * span) / L);
    },
    onDeactivate: (e) => {
      anchorTime.set(withDecay({ velocity: (-sign * (vertical ? e.velocityY : e.velocityX) * span) / L }));
    },
  });

  // Two fingers: pinch to change zoom rung. A chip shows where you'll land; it switches on release.
  const pinchScale = useSharedValue(1);
  const [preview, setPreview] = useState<ScaleId | null>(null);
  const pinch = usePinchGesture({
    onUpdate: (e) => {
      pinchScale.set(e.scale);
    },
    onDeactivate: (e) => {
      scheduleOnRN(onZoom, e.scale);
    },
    onFinalize: () => {
      pinchScale.set(1);
      scheduleOnRN(setPreview, null);
    },
  });
  useAnimatedReaction(
    () => zoomAfterPinch(scale.id, pinchScale.get()),
    (target, before) => {
      if (before !== null && target !== before) scheduleOnRN(setPreview, target);
    },
  );
  const gestures = useSimultaneousGestures(pan, pinch);

  // Web: trackpad pinch and ctrl/⌘ + mouse wheel arrive as wheel events with ctrlKey.
  const root = useRef<ComponentRef<typeof View>>(null);
  const zoomRef = useRef(onZoom);
  useEffect(() => {
    zoomRef.current = onZoom;
  });
  useEffect(() => {
    const el = root.current as unknown as HTMLElement | null;
    if (Platform.OS !== 'web' || !el) return;
    let factor = 1;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        // Plain wheel / two-finger trackpad scroll travels through time, without end (the window re-centres).
        e.preventDefault();
        const px = vertical ? e.deltaY : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        cancelAnimation(anchorTime);
        following.set(false);
        anchorTime.set(anchorTime.get() + (sign * px * span) / L);
        return;
      }
      e.preventDefault(); // or the browser zooms the whole page
      factor *= Math.exp(-e.deltaY / 120);
      setPreview(zoomAfterPinch(scale.id, factor));
      clearTimeout(timer);
      timer = setTimeout(() => {
        zoomRef.current(factor);
        factor = 1;
        setPreview(null);
      }, 200);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      clearTimeout(timer);
    };
  }, [scale.id, vertical, sign, span, L, anchorTime, following]);

  const backToNow = () => {
    setShowNowButton(false);
    anchorTime.set(
      withTiming(Date.now() + 350, { duration: 350 }, (finished) => {
        'worklet';
        if (finished) following.set(true);
      }),
    );
  };

  // A tap on empty space glides that moment under the pointer, ready for Add.
  const tapEmpty = (x: number, y: number) => {
    const t = posToTime((vertical ? y : x) / L, { anchorTime: anchorTime.get(), anchorFrac: ANCHOR, span, direction });
    cancelAnimation(anchorTime);
    following.set(false);
    anchorTime.set(withTiming(snapTo(t, scale.snap, 'round', weekStart), { duration: 320 }));
  };

  const along = (d: number) => {
    'worklet';
    return vertical ? [{ translateY: d }] : [{ translateX: d }];
  };
  const nowAt = () => {
    'worklet';
    const p = ANCHOR + (nowTime.get() - anchorTime.get()) / span;
    return (sign > 0 ? p : 1 - p) * L;
  };
  const contentStyle = useAnimatedStyle(() => ({ transform: along((-sign * (anchorTime.get() - origin) * L) / span) }));
  const nowStyle = useAnimatedStyle(() => {
    const at = nowAt();
    return { opacity: at < -40 || at > L + 40 ? 0 : 1, transform: along(at) };
  });
  // When "now" reaches the pointer (following the clock), Tick hops onto the pointer's time and the pill hides.
  const tickStyle = useAnimatedStyle(() => {
    const d = nowAt() - pointerPx;
    const near = Math.abs(d) < NEAR;
    return { transform: [{ translateX: near && !vertical ? -d : 0 }, { translateY: near ? (vertical ? -d - 40 : -36) : 0 }] };
  });
  const nowPillStyle = useAnimatedStyle(() => ({ opacity: Math.abs(nowAt() - pointerPx) < NEAR ? 0 : 1 }));
  // The lit spine behind "now": the trail you have walked.
  const trailStyle = useAnimatedStyle(() => {
    const at = nowAt();
    return { transform: along(sign > 0 ? Math.min(0, Math.max(-L, at - L)) : Math.min(L, Math.max(0, at))) };
  });

  const laid = useMemo(() => {
    const v: Viewport = { anchorTime: center, anchorFrac: ANCHOR, span, direction };
    const shift = (sign * (center - origin) * L) / span;
    const px = (t: number) => timeToPos(t, v) * L + shift;
    const { start, end } = visibleRange(v);
    const from = start - BUFFER * span;
    const to = end + BUFFER * span;
    const lo = shift - BUFFER * L;
    const hi = shift + (1 + BUFFER) * L;
    const every = labelEvery(scale.major, span, L, vertical ? 22 : 70);
    const fine = scale.id === 'sec' || scale.id === 'min' || scale.id === 'hour';
    const visible = new Set(layers.map((l) => l.id));
    const ruler = {
      majors: ticks(from, to, scale.major, weekStart).map((t) => ({ t, at: px(t), label: hasLabel(t, scale.major, every) ? rulerLabel(t, scale.id, h24) : null })),
      minors: ticks(from, to, scale.minor, weekStart).map((t) => ({ t, at: px(t) })),
      days: fine ? ticks(from, to, { unit: 'day', step: 1 }, weekStart).map((t) => ({ t, at: px(t) })) : [],
    };
    if (buckets) {
      const shown = expandEntries(entries, completed, from, to).filter((e) => visible.has(e.layerId));
      const bubbles = bucketize(shown, buckets, from, to, weekStart).map((b) => {
        const a = px(b.start);
        const z = px(b.end);
        // Same-side neighbours are two buckets apart, so a bubble may grow to almost that.
        return { ...b, at: (a + z) / 2, size: Math.max(16, Math.min(30, Math.abs(z - a) * 2 - 6)) };
      });
      return { ...ruler, bubbles, cards: [] };
    }
    // Sides and stacking use whole days, so cards don't shuffle as the window moves.
    const dayFrom = floorUnit(from, 'day');
    const dayTo = addUnit(floorUnit(to, 'day'), 'day', 1);
    const shown = expandEntries(entries, completed, dayFrom, dayTo).filter((e) => visible.has(e.layerId) && e.start < dayTo && (e.end ?? e.start) >= dayFrom);
    const sides = spineSides(shown);
    const anchors = shown.map((e) => ({ id: e.id, at: px(e.start), side: sides.get(e.id) ?? 1 }));
    const tops = stackCards(anchors, CARD, GAP);
    const cards = shown.flatMap((entry, i) => {
      const { at, side } = anchors[i];
      const top = tops.get(entry.id) ?? at - CARD / 2;
      const endAt = entry.end === null ? null : px(entry.end);
      const first = Math.min(top, at, endAt ?? at);
      const last = Math.max(top + CARD, at, endAt ?? at);
      return last < lo || first > hi ? [] : [{ entry, side, at, top, endAt }];
    });
    return { ...ruler, bubbles: [], cards };
  }, [entries, completed, layers, scale, direction, weekStart, h24, buckets, center, origin, span, L, sign, vertical, CARD]);

  const minuteNow = useNow(60_000);
  // The next thing to do pulses (DESIGN.md: "next up"); only timed entries still ahead.
  const nextId = useMemo(() => {
    let best: Entry | undefined;
    for (const e of expandEntries(entries, completed, minuteNow, minuteNow + 7 * 86_400_000))
      if (!e.done && e.kind !== 'note' && e.granularity === 'moment' && e.start >= minuteNow && (!best || e.start < best.start)) best = e;
    return best?.id;
  }, [entries, completed, minuteNow]);
  const layerById = useMemo(() => new Map(layers.map((l) => [l.id, l])), [layers]);
  const place = (at: number, len: number, cross: number, crossLen: number): ViewStyle =>
    vertical ? { top: at, height: len, left: cross, width: crossLen } : { left: at, width: len, top: cross, height: crossLen };
  // Cards fade out at both ends instead of being cut off.
  const fade = (end: 'start' | 'end'): ViewStyle =>
    vertical
      ? end === 'start' ? { left: 0, right: 0, top: 0, height: 22 } : { left: 0, right: 0, bottom: 0, height: 22 }
      : end === 'start' ? { top: 0, bottom: 0, left: 0, width: 22 } : { top: 0, bottom: 0, right: 0, width: 22 };

  return (
    <View ref={root} style={styles.tray} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 && (
        <GestureDetector gesture={gestures}>
          <View style={[styles.abs, styles.fill, styles.clip]} accessibilityLabel="Timeline. Drag to move through time; the pointer in the middle shows where Add puts a new entry.">
            <Pressable accessible={false} onPress={(e) => tapEmpty(e.nativeEvent.locationX, e.nativeEvent.locationY)} style={[styles.abs, styles.fill]} />

            {/* The spine: a dim track, lit behind "now". */}
            <View pointerEvents="none" style={[styles.abs, place(-10, L + 20, MID - SPINE / 2, SPINE), { backgroundColor: c.chip, borderRadius: SPINE / 2 }]} />
            <Animated.View pointerEvents="none" style={[styles.abs, styles.fill, trailStyle]}>
              <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }} style={[styles.abs, place(0, L, MID - SPINE / 2, SPINE), { borderRadius: SPINE / 2 }]} />
            </Animated.View>

            <Animated.View entering={FadeIn.duration(250)} pointerEvents="box-none" style={[styles.abs, styles.fill, contentStyle]}>
              {laid.minors.map((m) => (
                <View key={`m${m.t}`} style={[styles.abs, styles.noTouch, place(m.at - 1, 2, MID - 3, 6), { backgroundColor: c.lineStrong }]} />
              ))}
              {laid.majors.map((m) => (
                <View key={`l${m.t}`} style={[styles.abs, styles.noTouch, place(m.at - 1.5, 3, MID - SPINE / 2 - 5, SPINE + 10), { backgroundColor: c.muted, borderRadius: 2 }]} />
              ))}
              {laid.majors.map((m) =>
                m.label ? (
                  <View key={`t${m.t}`} pointerEvents="none" style={[styles.abs, styles.fill]}>
                    <Text numberOfLines={1} style={[styles.abs, styles.ruler, { color: c.ink }, vertical ? [place(m.at - 9, 18, MID - SPINE / 2 - LABEL, LABEL - 6), styles.right] : [place(m.at - 40, 80, MID - SPINE / 2 - LABEL, LABEL - 4), styles.middle]]}>
                      {m.label[0]}
                    </Text>
                    <Text numberOfLines={1} style={[styles.abs, styles.ruler, { color: c.muted }, vertical ? place(m.at - 9, 18, MID + SPINE / 2 + 6, LABEL - 6) : [place(m.at - 40, 80, MID + SPINE / 2 + 4, LABEL - 4), styles.middle]]}>
                      {m.label[1]}
                    </Text>
                  </View>
                ) : null,
              )}
              {laid.days.map((d) => (
                <View key={`d${d.t}`} pointerEvents="none" style={[styles.abs, styles.dayPill, vertical ? place(d.at - 13, 26, MID - 64, 128) : place(d.at - 64, 128, MID - 13, 26), { backgroundColor: c.pop, boxShadow: c.raisedSm }]}>
                  <Text numberOfLines={1} style={styles.dayText}>
                    {new Date(d.t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                  </Text>
                </View>
              ))}
              {laid.cards.map(({ entry, side, at, top, endAt }) => {
                const layer = layerById.get(entry.layerId);
                return layer ? (
                  <SpineCard
                    key={entry.id}
                    entry={entry}
                    layer={layer}
                    c={c}
                    vertical={vertical}
                    compact={compact}
                    place={place}
                    side={side}
                    at={at}
                    top={top}
                    endAt={endAt}
                    mid={MID}
                    cross={crossStart(side)}
                    crossLen={CROSS}
                    cardLen={CARD}
                    isNext={entry.id === nextId}
                    now={minuteNow}
                    h24={h24}
                    onOpen={onOpen}
                    onToggleDone={onToggleDone}
                    onMove={onMove}
                    onLift={onLift}
                    msPerPx={(sign * span) / L}
                    snap={scale.snap}
                    outerPan={pan}
                  />
                ) : null;
              })}
              {laid.bubbles.map((b) => {
                const layer = layerById.get(b.layerId);
                const cross = b.side > 0 ? MID + SPINE / 2 + LABEL : MID - SPINE / 2 - LABEL - b.size;
                const zoom = BUCKET_ZOOM[scale.id];
                return (
                  <Pressable
                    key={`b${b.start}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.count} ${b.count === 1 ? 'entry' : 'entries'} from ${dayFmt.format(b.start)}. Zoom in`}
                    onPress={() => zoom && onZoomTo(zoom, b.first)}
                    style={({ pressed }) => [
                      styles.abs,
                      styles.bubble,
                      place(b.at - b.size / 2, b.size, cross, b.size),
                      { borderRadius: b.size / 2, backgroundColor: layer?.color.fill ?? c.gold, boxShadow: c.raisedSm },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.bubbleText, { fontSize: Math.max(10, b.size * 0.5), color: layer?.color.ink ?? c.edge }]}>{b.count > 99 ? '99+' : b.count}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>

            {/* "Now": a thin line, Tick on the spine, and a live clock pill at the edge. */}
            <Animated.View pointerEvents="none" style={[styles.abs, vertical ? { top: 0, left: 0, right: 0, height: 0 } : { left: 0, top: 0, bottom: 0, width: 0 }, styles.visible, nowStyle]}>
              <View style={[styles.abs, vertical ? { top: -1, height: 2, left: 0, right: 0 } : { left: -1, width: 2, top: 0, bottom: 0 }, { backgroundColor: c.accentText, opacity: 0.45 }]} />
              <Animated.View style={[styles.abs, nowPillStyle, styles.nowPill, vertical ? { top: -12, left: EDGE } : { left: -40, top: EDGE }, { backgroundColor: c.accent, boxShadow: c.raisedSm }]}>
                <Text style={[styles.nowLabel, { color: c.accentInk }]}>NOW</Text>
                <ClockText color={c.accentInk} h24={h24} />
              </Animated.View>
              <Animated.View style={[styles.abs, vertical ? { top: -16, left: MID - 16 } : { left: -16, top: MID - 16 }, tickStyle]}>
                <Tick size={32} mood="happy" />
              </Animated.View>
            </Animated.View>

            <View pointerEvents="none" style={[styles.abs, fade('start')]}>
              <LinearGradient colors={[c.ground, `${c.ground}00`] as const} start={{ x: 0, y: 0 }} end={vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }} style={styles.fillAbs} />
            </View>
            <View pointerEvents="none" style={[styles.abs, fade('end')]}>
              <LinearGradient colors={[`${c.ground}00`, c.ground] as const} start={{ x: 0, y: 0 }} end={vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }} style={styles.fillAbs} />
            </View>

            <PointerHud
              c={c}
              vertical={vertical}
              at={pointerPx}
              mid={MID}
              anchorTime={anchorTime}
              live={!showNowButton}
              scale={scale}
              weekStart={weekStart}
              h24={h24}
              layerId={layers[0]?.id}
              onAdd={onAdd}
              onOpenView={onOpenView}
              onPickTime={onPickTime}
              onPointerDay={onPointerDay}
            />

            {preview && preview !== scale.id && (
              <Animated.View entering={FadeIn.duration(120)} pointerEvents="none" style={[styles.zoomChip, { backgroundColor: c.panel, boxShadow: c.raised }]}>
                <Text style={[styles.zoomChipText, { color: c.ink }]}>{ZOOM_NAMES[preview]}</Text>
              </Animated.View>
            )}

            {showNowButton && (
              <Pressable accessibilityRole="button" onPress={backToNow} style={({ pressed }) => [styles.nowButton, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}>
                <Ionicons name={sign > 0 ? (vertical ? 'arrow-up' : 'arrow-back') : vertical ? 'arrow-down' : 'arrow-forward'} size={15} color={c.accentText} />
                <Text style={[styles.nowButtonText, { color: c.ink }]}>Back to now</Text>
              </Pressable>
            )}
          </View>
        </GestureDetector>
      )}
    </View>
  );
}

type HudProps = {
  c: Palette;
  vertical: boolean;
  /** Where the pointer sits along the axis, px. */
  at: number;
  mid: number;
  anchorTime: SharedValue<number>;
  /** Following the clock: the pointer reads the next free slot from now. */
  live: boolean;
  scale: Scale;
  weekStart: WeekStart;
  h24: boolean;
  layerId: string | undefined;
  onAdd: Props['onAdd'];
  onOpenView: Props['onOpenView'];
  onPickTime: Props['onPickTime'];
  onPointerDay: Props['onPointerDay'];
};

/** The fixed pointer: a glowing line, the exact time under it, the zoom chip and Add. */
function PointerHud({ c, vertical, at, mid, anchorTime, live, scale, weekStart, h24, layerId, onAdd, onOpenView, onPickTime, onPointerDay }: HudProps) {
  // Re-render only when the time under the pointer can have changed by a fraction of a slot, not every frame.
  const res = Math.max(SECOND, Math.min(HOUR, (APPROX_MS[scale.snap.unit] * scale.snap.step) / 5));
  const [raw, setRaw] = useState(() => anchorTime.get());
  useAnimatedReaction(
    () => Math.floor(anchorTime.get() / res),
    (k, before) => {
      if (k !== before) scheduleOnRN(setRaw, k * res);
    },
    [res],
  );
  const time = snapTo(raw, scale.snap, live ? 'ceil' : 'round', weekStart);
  const day = floorUnit(time, 'day');
  useEffect(() => onPointerDay(day), [day, onPointerDay]);
  const glow = useLoop(2400);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * glow.get() }));
  const label = pointerLabel(time, scale.id, h24);
  const spoken = scale.snap.unit === 'day' || scale.snap.unit === 'month' ? dayFmt.format(time) : `${dayFmt.format(time)}, ${clockTime(time, h24)}`;

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.abs, vertical ? { top: at - 1.5, height: 3, left: 0, right: 0 } : { left: at - 1.5, width: 3, top: 0, bottom: 0 }, glowStyle]}>
        <LinearGradient colors={[`${c.gradient[1]}00`, c.gradient[1], c.gradient[0], `${c.gradient[0]}00`] as const} start={{ x: 0, y: 0 }} end={vertical ? { x: 1, y: 0 } : { x: 0, y: 1 }} style={[styles.fillAbs, { boxShadow: c.glow }]} />
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Zoom: ${ZOOM_NAMES[scale.id]}. View options`}
        onPress={onOpenView}
        style={({ pressed }) => [styles.abs, styles.zoomButton, vertical ? { top: at - 18, left: EDGE } : { left: at - 38, top: EDGE }, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
      >
        <Ionicons name="layers-outline" size={15} color={c.ink} />
        <Text style={[styles.zoomButtonText, { color: c.ink }]}>{ZOOM_SHORT[scale.id]}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pointer at ${spoken}. Set an exact time`}
        onPress={() => onPickTime(time)}
        style={({ pressed }) => [
          styles.abs,
          styles.capsule,
          vertical ? { top: at - 23, left: mid - 56, width: 112, height: 46 } : { left: at - 56, top: mid - 21, width: 112, height: 42 },
          { backgroundColor: live ? c.accent : c.gold, boxShadow: c.raised },
          pressed && styles.pressed,
        ]}
      >
        {live && <Text style={[styles.capsuleTag, { color: c.accentInk }]}>NOW</Text>}
        <Text numberOfLines={1} style={[styles.capsuleText, label.length > 8 ? styles.capsuleTiny : label.length > 6 && styles.capsuleLong, { color: live ? c.accentInk : c.edge }]}>
          {label}
        </Text>
      </Pressable>
      {layerId && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add an entry at ${spoken}`}
          onPress={() => onAdd(time, layerId)}
          style={({ pressed }) => [styles.abs, styles.add, vertical ? { top: at - 23, right: EDGE } : { left: at - 40, bottom: EDGE }, { boxShadow: c.raised }, pressed && styles.pressed]}
        >
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addFill}>
            <Ionicons name="add" size={20} color={c.accentInk} />
            <Text style={[styles.addText, { color: c.accentInk }]}>Add</Text>
          </LinearGradient>
        </Pressable>
      )}
    </>
  );
}

type CardProps = {
  entry: Entry;
  layer: Layer;
  c: Palette;
  vertical: boolean;
  /** Day zoom: one line, no subtitle. */
  compact: boolean;
  place: (at: number, len: number, cross: number, crossLen: number) => ViewStyle;
  side: Side;
  /** Along the axis, px: the entry's start (where its wire meets the spine), the card's leading edge, the entry's end. */
  at: number;
  top: number;
  endAt: number | null;
  /** Across the axis, px: the spine's centre and the card's own start and size. */
  mid: number;
  cross: number;
  crossLen: number;
  cardLen: number;
  isNext: boolean;
  now: number;
  h24: boolean;
  onOpen: (entryId: string) => void;
  onToggleDone: (entry: Entry) => void;
  onMove: (entry: Entry, start: number, end: number | null, layerId: string) => void;
  onLift: () => void;
  /** Time per pixel along the axis, signed by direction. */
  msPerPx: number;
  snap: Interval;
  /** The timeline's own pan: it waits while a card decides whether it is being moved. */
  outerPan: PanGesture;
};

function SpineCard({ entry, layer, c, vertical, compact, place, side, at, top, endAt, mid, cross, crossLen, cardLen, isNext, now, h24, onOpen, onToggleDone, onMove, onLift, msPerPx, snap, outerPan }: CardProps) {
  // Completing a card pops it (1 → 1.08 → 0.97 → 1); an active task's ring breathes (DESIGN.md §2).
  const pop = useSharedValue(1);
  const wasDone = useRef(entry.done);
  useEffect(() => {
    if (entry.done && !wasDone.current) pop.set(withSequence(withTiming(1.08, { duration: 120 }), withTiming(0.97, { duration: 120 }), withTiming(1, { duration: 210 })));
    wasDone.current = entry.done;
  }, [entry.done, pop]);
  const active = entry.kind === 'task' && !entry.done && entry.end !== null && entry.start <= now && now < entry.end;
  const breath = useLoop(2000, active);
  // Long-press, then drag along the spine to reschedule (snaps to the zoom's slot).
  const shift = useSharedValue(0);
  const lifted = useSharedValue(false);
  const dragged = useSharedValue(false); // the release after a drag must not open the card
  useLayoutEffect(() => {
    shift.set(0);
  }, [entry.start, shift]);
  const drop = (alongPx: number) => {
    const next = reschedule(entry.start, entry.end, alongPx * msPerPx, snap);
    if (next.start !== entry.start) return onMove(entry, next.start, next.end, entry.layerId);
    shift.set(withTiming(0, { duration: 180 }));
  };
  const move = usePanGesture({
    // One occurrence of a repeat can't be moved alone yet; edit the series in its sheet.
    enabled: entry.granularity === 'moment' && !entry.seriesId,
    activateAfterLongPress: 350,
    // Moving before the hold ends fails this gesture, so a quick drag on a card still scrolls the timeline.
    failOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    block: outerPan,
    onBegin: () => {
      dragged.set(false);
    },
    onActivate: () => {
      dragged.set(true);
      lifted.set(true);
      scheduleOnRN(onLift);
    },
    onUpdate: (e) => {
      shift.set(vertical ? e.translationY : e.translationX);
    },
    onDeactivate: (e) => {
      lifted.set(false);
      scheduleOnRN(drop, vertical ? e.translationY : e.translationX);
    },
  });
  const cardStyle = useAnimatedStyle(() => ({
    zIndex: lifted.get() ? 20 : 0,
    opacity: lifted.get() ? 0.92 : 1,
    transform: [{ translateX: vertical ? 0 : shift.get() }, { translateY: vertical ? shift.get() : 0 }, { scale: pop.get() * (lifted.get() ? 1.05 : 1) }, { rotate: lifted.get() ? `${side * 2}deg` : '0deg' }],
  }));
  const breathStyle = useAnimatedStyle(() => ({ opacity: 0.2 + 0.6 * breath.get() }));
  const nextPulse = useLoop(1600, isNext);
  const nextStyle = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - nextPulse.get()), transform: [{ scale: 1 + 0.6 * nextPulse.get() }] }));
  const wireStyle = useAnimatedStyle(() => ({ opacity: lifted.get() ? 0 : 1 }));

  // A missed task stays a neutral grey card, never a red failure (RESEARCH.md #10).
  const skipped = entry.kind === 'task' && !entry.done && entry.end !== null && entry.end <= now;
  const tone = skipped ? c.lineStrong : layer.color.fill;
  const checkable = entry.kind !== 'note';
  const icon = entry.kind === 'task' ? layer.icon : KIND_ICONS[entry.kind];
  const rule = parseRepeat(entry.repeat);
  const xp = entryXp({ ...entry, done: true });
  const when = clockTime(entry.start, h24);
  const subtitle = entry.done ? `Done · +${xp} XP` : skipped ? 'Missed, no penalty' : isNext ? `Next · ${when}` : rule ? `${when} · ${repeatLabel(rule)}` : `${when} · +${xp} XP`;
  const label = `${entry.kind}, ${entry.title}, ${entry.end ? `${clockTime(entry.start, h24)} to ${clockTime(entry.end, h24)}` : clockTime(entry.start, h24)}${entry.done ? ', done' : skipped ? ', missed' : isNext ? ', next up' : ''}`;

  // The wire: from the spine at the entry's time, across the ruler, then along to the card if it was pushed.
  const spineEdge = mid + (side * SPINE) / 2;
  const inner = side > 0 ? cross : cross + crossLen;
  const elbow = inner - side * 6;
  const hit = Math.min(top + cardLen - 10, Math.max(top + 10, at));
  const node = compact ? 18 : NODE;
  const pad = compact ? 5 : 8;

  return (
    <>
      {endAt !== null && Math.abs(endAt - at) > 2 && (
        <View pointerEvents="none" style={[styles.abs, place(Math.min(at, endAt), Math.abs(endAt - at), side > 0 ? mid + SPINE / 2 + 3 : mid - SPINE / 2 - 7, 4), { backgroundColor: tone, opacity: 0.6, borderRadius: 2 }]} />
      )}
      <Animated.View pointerEvents="none" style={[styles.abs, styles.fill, wireStyle]}>
        <View style={[styles.abs, place(at - 1.5, 3, Math.min(spineEdge, elbow), Math.abs(elbow - spineEdge)), { backgroundColor: tone }]} />
        {hit !== at && <View style={[styles.abs, place(Math.min(at, hit) - 1.5, Math.abs(hit - at) + 3, elbow - 1.5, 3), { backgroundColor: tone }]} />}
        <View style={[styles.abs, place(hit - 1.5, 3, Math.min(elbow, inner), Math.abs(inner - elbow)), { backgroundColor: tone }]} />
      </Animated.View>
      <GestureDetector gesture={move}>
        <View style={[styles.abs, place(top, cardLen, cross, crossLen)]}>
          <Animated.View
            style={[
              styles.abs,
              styles.fill,
              styles.card,
              { padding: pad, gap: pad },
              entry.done
                ? { backgroundColor: layer.color.fill, borderColor: c.edge, boxShadow: `0 4px 0 ${c.edge}` }
                : skipped
                  ? { backgroundColor: c.tray, borderColor: c.lineStrong, borderStyle: 'dashed' }
                  : { backgroundColor: c.panel, borderColor: layer.color.fill, boxShadow: `0 4px 0 ${c.edge}` },
              cardStyle,
            ]}
          >
            <View style={{ width: node, height: node }}>
              {isNext && <Animated.View pointerEvents="none" style={[styles.abs, styles.fill, styles.ring, { borderRadius: node / 2, borderColor: layer.color.fill }, nextStyle]} />}
              {active && <Animated.View pointerEvents="none" style={[styles.abs, styles.fill, styles.ring, { borderRadius: node / 2, borderColor: layer.color.fill }, breathStyle]} />}
              <Pressable
                accessibilityRole={checkable ? 'checkbox' : 'button'}
                aria-checked={checkable ? entry.done : undefined}
                accessibilityLabel={checkable ? `Mark ${entry.title} ${entry.done ? 'not done' : 'done'}` : label}
                hitSlop={8}
                onPress={() => !dragged.get() && (checkable ? onToggleDone(entry) : onOpen(entry.seriesId ?? entry.id))}
                style={({ pressed }) => [
                  styles.abs,
                  styles.fill,
                  styles.center,
                  { borderRadius: node / 2 },
                  entry.done ? { backgroundColor: c.panel } : { borderWidth: 2.5, borderColor: skipped ? c.lineStrong : layer.color.fill },
                  pressed && styles.pressed,
                ]}
              >
                {entry.done ? (
                  <Animated.View entering={ZoomIn.springify()}>
                    <Ionicons name="checkmark" size={compact ? 12 : 15} color={c.ink} />
                  </Animated.View>
                ) : (
                  <Ionicons name={icon} size={compact ? 9 : 11} color={skipped ? c.muted : layer.color.fill} />
                )}
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={entry.granularity === 'moment' ? 'Long-press and drag to move it' : undefined}
              onPress={() => !dragged.get() && onOpen(entry.seriesId ?? entry.id)}
              style={styles.cardText}
            >
              <Text numberOfLines={compact ? 1 : 2} style={[compact ? styles.titleCompact : styles.title, { color: entry.done ? layer.color.ink : skipped ? c.muted : c.ink }]}>
                {entry.title}
              </Text>
              {!compact && (
                <Text numberOfLines={1} style={[styles.sub, { color: entry.done ? layer.color.ink : isNext ? c.accentText : c.muted }]}>
                  {subtitle}
                </Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </GestureDetector>
    </>
  );
}

function ClockText({ color, h24 }: { color: string; h24: boolean }) {
  const now = useNow(1000);
  return <Text numberOfLines={1} style={[styles.clock, { color }]}>{clockTime(now, h24, true)}</Text>;
}

const styles = StyleSheet.create({
  tray: { flex: 1 },
  abs: { position: 'absolute' },
  fill: { top: 0, left: 0, right: 0, bottom: 0 },
  fillAbs: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  clip: { overflow: 'hidden' },
  visible: { overflow: 'visible' },
  noTouch: { pointerEvents: 'none' }, // as a style it's dropped on Animated views on web, so those use the prop
  center: { alignItems: 'center', justifyContent: 'center' },
  ruler: { fontSize: 13, fontFamily: F.display, lineHeight: 18 },
  right: { textAlign: 'right' },
  middle: { textAlign: 'center', lineHeight: 22 },
  dayPill: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 12, fontFamily: F.display, letterSpacing: 1, color: '#FFFFFF' },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 3 },
  ring: { borderWidth: 2 },
  cardText: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontSize: 12.5, lineHeight: 15, fontFamily: F.bold },
  titleCompact: { fontSize: 11.5, fontFamily: F.bold },
  sub: { fontSize: 10.5, fontFamily: F.bold, opacity: 0.85 },
  bubble: { alignItems: 'center', justifyContent: 'center' },
  bubbleText: { fontFamily: F.display },
  nowPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 7, borderRadius: 10 },
  nowLabel: { fontSize: 9.5, fontFamily: F.display, letterSpacing: 0.8 },
  clock: { fontSize: 11, fontFamily: F.bold, fontVariant: ['tabular-nums'] },
  zoomButton: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 10, borderRadius: 12 },
  zoomButtonText: { fontSize: 12.5, fontFamily: F.bold },
  capsule: { borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  capsuleTag: { fontSize: 9, fontFamily: F.display, letterSpacing: 1.2, marginBottom: -3 },
  capsuleText: { fontSize: 24, fontFamily: F.display, letterSpacing: 0.5 },
  capsuleLong: { fontSize: 19, letterSpacing: 0 },
  capsuleTiny: { fontSize: 15, letterSpacing: 0 },
  add: { height: 46, borderRadius: 16, overflow: 'hidden' },
  addFill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 10, paddingRight: 14 },
  addText: { fontSize: 16, fontFamily: F.display },
  pressed: { transform: [{ scale: 0.95 }] },
  nowButton: { position: 'absolute', right: EDGE, bottom: EDGE + 4, flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999 },
  nowButtonText: { fontSize: 13, fontFamily: F.bold },
  zoomChip: { position: 'absolute', alignSelf: 'center', top: '20%', paddingHorizontal: 18, height: 44, borderRadius: 999, justifyContent: 'center' },
  zoomChipText: { fontSize: 16, fontFamily: F.display },
});
