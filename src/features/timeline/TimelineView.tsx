import Ionicons from '@expo/vector-icons/Ionicons';
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

import { reschedule } from '@/core/entries/timing';
import { floorUnit, type Interval } from '@/core/time/units';
import { laneAfterDrag, layoutTimeline, type PlacedItem } from '@/core/timeline/layout';
import { zoomAfterPinch, type Scale, type ScaleId } from '@/core/timeline/scales';
import { hasLabel, labelEvery, tickLabel, ticks } from '@/core/timeline/ticks';
import { isVertical, posToTime, timeToPos, visibleRange, type Direction, type Viewport } from '@/core/timeline/viewport';
import type { Entry, Layer } from '@/features/entries/data';
import { useNow } from '@/hooks/useNow';
import { useLoop } from '@/ui/motion';
import { Tick } from '@/features/game/Tick';
import { KIND_ICONS, usePalette, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';


type PanGesture = ReturnType<typeof usePanGesture>;

const NODE = 26; // branch node size
const ANCHOR = 0.3; // where "now" sits along the axis, measured from the past end
const BUFFER = 1; // screens laid out beyond each edge
const FAR_PX = 20_000; // re-base positions before native (float32) transforms lose precision
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const clockFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** The camera outlives a zoom change (TimelineView remounts per zoom), so the screen owns it. */
export type Camera = { anchorTime: SharedValue<number>; following: SharedValue<boolean> };

type Props = {
  entries: readonly Entry[];
  layers: readonly Layer[];
  scale: Scale;
  direction: Direction;
  camera: Camera;
  /** Tap on empty space: a time (snapped to the zoom) and the lane's layer. */
  onAdd: (at: number, layerId: string) => void;
  onOpen: (entryId: string) => void;
  /** The round check on a card: complete or undo without opening it. */
  onToggleDone: (entry: Entry) => void;
  /** Long-press and drag a card: its new, snapped times and the layer (lane) it was dropped in. */
  onMove: (entry: Entry, start: number, end: number | null, layerId: string) => void;
  /** A card was picked up (for a haptic). */
  onLift: () => void;
  /** Pinch (or ctrl/⌘ + scroll on web) ended: the finger-distance ratio, > 1 = zoom in. */
  onZoom: (pinchScale: number) => void;
};

const ZOOM_NAMES: Record<ScaleId, string> = { sec: 'Seconds', min: 'Minutes', hour: 'Hours', day: 'Days', week: 'Weeks', month: 'Months', year: 'Years' };

export function TimelineView({ entries, layers, scale, direction, camera, onAdd, onOpen, onToggleDone, onMove, onLift, onZoom }: Props) {
  const c = usePalette();
  const reduceMotion = useReducedMotion();
  const { anchorTime, following } = camera;
  const vertical = isVertical(direction);
  const sign = direction === 'up' || direction === 'left' ? -1 : 1;
  const HDR = vertical ? 46 : 96; // lane headers along the main-axis start
  const GUT = vertical ? 76 : 28; // time labels along the cross-axis start ("4:16:10 PM" must fit)
  const span = scale.span;

  const [box, setBox] = useState({ w: 0, h: 0 });
  const L = Math.max(1, (vertical ? box.h : box.w) - HDR);
  const C = Math.max(1, (vertical ? box.w : box.h) - GUT);
  // The trunk (time itself) runs beside the time labels; each layer is a lane of branches after it.
  const TRUNK = GUT + 14;
  const LANES = GUT + 30;
  const laneW = Math.max(1, C - (LANES - GUT)) / Math.max(1, layers.length);
  const laneIds = useMemo(() => layers.map((l) => l.id), [layers]);

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

  // Anything can stop following the clock (a drag, a tap on a day), so the button watches `following` itself.
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

  const tapEmpty = (x: number, y: number) => {
    const at = posToTime((vertical ? y : x) / L, { anchorTime: anchorTime.get(), anchorFrac: ANCHOR, span, direction });
    const lane = layers[Math.min(layers.length - 1, Math.max(0, Math.floor(((vertical ? x : y) - LANES) / laneW)))];
    if (lane) onAdd(floorUnit(at, scale.snap.unit, scale.snap.step), lane.id);
  };

  const along = (d: number) => {
    'worklet';
    return vertical ? [{ translateY: d }] : [{ translateX: d }];
  };
  const contentStyle = useAnimatedStyle(() => ({ transform: along((-sign * (anchorTime.get() - origin) * L) / span) }));
  // The clock pill pulses gently (DESIGN.md §2); off with reduce motion.
  const pulse = useLoop(1800);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * pulse.get() }] }));
  const nowStyle = useAnimatedStyle(() => {
    const p = ANCHOR + (nowTime.get() - anchorTime.get()) / span;
    return { opacity: p < -0.02 || p > 1.02 ? 0 : 1, transform: along((sign > 0 ? p : 1 - p) * L) };
  });
  const veilStyle = useAnimatedStyle(() => {
    const p = ANCHOR + (nowTime.get() - anchorTime.get()) / span;
    const at = (sign > 0 ? p : 1 - p) * L;
    return { transform: along(sign > 0 ? Math.min(0, Math.max(-L, at - L)) : Math.min(L, Math.max(0, at))) };
  });

  const laid = useMemo(() => {
    const v: Viewport = { anchorTime: center, anchorFrac: ANCHOR, span, direction };
    const shift = (sign * (center - origin) * L) / span;
    const px = (pos: number) => pos * L + shift;
    const { start, end } = visibleRange(v);
    const from = start - BUFFER * span;
    const to = end + BUFFER * span;
    const byId = new Map(entries.map((e) => [e.id, e]));
    const every = labelEvery(scale.major, span, L, vertical ? 20 : 90);
    return {
      majors: ticks(from, to, scale.major).map((t) => ({ t, at: px(timeToPos(t, v)), label: hasLabel(t, scale.major, every) ? tickLabel(t, scale) : '' })),
      minors: ticks(from, to, scale.minor).map((t) => ({ t, at: px(timeToPos(t, v)) })),
      items: layoutTimeline(entries, layers.map((l) => l.id), v, L, { buffer: BUFFER, pillPx: vertical ? 30 : 128 }).map((it) => ({
        ...it,
        at: px(it.pos),
        len: it.size * L,
        entry: byId.get(it.id)!,
      })),
    };
  }, [entries, layers, scale, direction, center, origin, span, L, sign, vertical]);

  const minuteNow = useNow(60_000);
  const today = floorUnit(minuteNow, 'day');
  // The next thing to do pulses (DESIGN.md: "next up"); only timed entries still ahead.
  const nextId = useMemo(() => {
    let best: Entry | undefined;
    for (const e of entries) if (!e.done && e.kind !== 'note' && e.granularity === 'moment' && e.start >= minuteNow && (!best || e.start < best.start)) best = e;
    return best?.id;
  }, [entries, minuteNow]);
  const place = (at: number, len: number, cross: number, crossLen: number): ViewStyle =>
    vertical ? { top: at, height: len, left: cross, width: crossLen } : { left: at, width: len, top: cross, height: crossLen };
  const body: ViewStyle = vertical ? { top: HDR, left: 0, right: 0, bottom: 0 } : { left: HDR, top: 0, bottom: 0, right: 0 };
  const zeroAlong: ViewStyle = vertical ? { top: 0, left: 0, right: 0, height: 0 } : { left: 0, top: 0, bottom: 0, width: 0 };

  return (
    <View
      ref={root}
      style={[styles.tray, { backgroundColor: c.tray, boxShadow: c.pressedIn }]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {box.w > 0 && (
        <>
          {layers.map((layer, i) => (
            <View
              key={layer.id}
              style={[
                styles.abs,
                vertical ? { top: HDR, bottom: 0, left: LANES + i * laneW, width: laneW } : { left: HDR, right: 0, top: LANES + i * laneW, height: laneW },
                { backgroundColor: i % 2 ? c.laneAlt : 'transparent' },
              ]}
            />
          ))}

          <GestureDetector gesture={gestures}>
            <View style={[styles.abs, body, styles.clip]} accessibilityLabel="Timeline. Drag to move through time.">
              <Pressable accessible={false} onPress={(e) => tapEmpty(e.nativeEvent.locationX, e.nativeEvent.locationY)} style={[styles.abs, styles.fill]} />
              <Animated.View entering={FadeIn.duration(250)} pointerEvents="box-none" style={[styles.abs, styles.fill, contentStyle]}>
                {laid.majors.map((m) => (
                  <View key={`l${m.t}`} style={[styles.abs, styles.noTouch, place(m.at, 1, GUT, C), { backgroundColor: c.line }]} />
                ))}
                {laid.minors.map((m) => (
                  <View key={`m${m.t}`} style={[styles.abs, styles.noTouch, vertical ? place(m.at, 1, GUT - 7, 7) : place(m.at, 1, GUT - 6, 6), { backgroundColor: c.lineStrong }]} />
                ))}
                {laid.items.map((it) => (
                  <Item key={it.id} it={it} layer={layers[it.lane]} c={c} vertical={vertical} place={place} laneStart={LANES + it.lane * laneW} laneW={laneW} trunk={TRUNK} isNext={it.id === nextId} onOpen={onOpen} onToggleDone={onToggleDone} onMove={onMove} onLift={onLift} laneIds={laneIds} msPerPx={(sign * span) / L} snap={scale.snap} outerPan={pan} now={minuteNow} />
                ))}
                {laid.majors.filter((m) => m.label).map((m) => (
                  <Text
                    key={`t${m.t}`}
                    numberOfLines={1}
                    style={[styles.abs, styles.noTouch, styles.tick, { color: c.muted }, vertical ? [place(m.at - 8, 16, 0, GUT - 8), styles.tickV] : [place(m.at - 48, 96, 0, GUT), styles.tickH, { lineHeight: GUT }]]}
                  >
                    {m.label}
                  </Text>
                ))}
              </Animated.View>

              <Animated.View pointerEvents="none" style={[styles.abs, styles.fill, { backgroundColor: c.veil }, veilStyle]} />

              {/* The trunk: dim ahead, lit behind you (the trail you have walked). */}
              <View pointerEvents="none" style={[styles.abs, vertical ? { top: 0, bottom: 0, left: TRUNK - 1.5, width: 3 } : { left: 0, right: 0, top: TRUNK - 1.5, height: 3 }, { backgroundColor: c.lineStrong, borderRadius: 2 }]} />
              <Animated.View pointerEvents="none" style={[styles.abs, styles.fill, veilStyle]}>
                <View style={[styles.abs, vertical ? { top: 0, bottom: 0, left: TRUNK - 2, width: 4 } : { left: 0, right: 0, top: TRUNK - 2, height: 4 }, { backgroundColor: c.accentText, boxShadow: c.glow, borderRadius: 2 }]} />
              </Animated.View>

              <Animated.View pointerEvents="none" style={[styles.abs, zeroAlong, styles.visible, nowStyle]}>
                <View style={[styles.abs, vertical ? { top: -1, height: 2, left: GUT - 4, right: 0 } : { left: -1, width: 2, top: GUT - 4, bottom: 0 }, { backgroundColor: c.accentText, opacity: 0.55 }]} />
                <View style={[styles.abs, vertical ? { top: -17, left: TRUNK - 16 } : { left: -16, top: TRUNK - 17 }]}>
                  <Tick size={32} mood="happy" />
                </View>
                <Animated.View style={[styles.abs, styles.pill, vertical ? { top: -11, height: 22, left: 2, width: GUT - 4 } : { left: -48, width: 96, top: 2, height: GUT - 4 }, { backgroundColor: c.accentText, boxShadow: c.glow }, pulseStyle]}>
                  <ClockText color={c.ground} />
                </Animated.View>
              </Animated.View>
            </View>
          </GestureDetector>

          <View style={[styles.abs, vertical ? { top: 0, left: 0, right: 0, height: HDR } : { left: 0, top: 0, bottom: 0, width: HDR }, { backgroundColor: c.tray }]} />
          {layers.map((layer, i) => {
            const count = entries.filter((e) => e.layerId === layer.id && (e.kind === 'task' || e.kind === 'todo') && e.start >= today && e.start < today + 86_400_000).length;
            return (
              <View
                key={layer.id}
                style={[styles.abs, styles.laneHead, place(5, HDR - 10, LANES + i * laneW + 3, laneW - 6), { backgroundColor: c.panel, boxShadow: c.raisedSm }]}
              >
                <View style={[styles.laneDot, { backgroundColor: layer.color.fill, boxShadow: `0 0 8px ${layer.color.fill}` }]} />
                <View style={styles.laneText}>
                  <Text numberOfLines={1} style={[styles.laneName, { color: c.ink }]}>{layer.name}</Text>
                  <Text numberOfLines={1} style={[styles.laneSub, { color: c.muted }]}>{count} today</Text>
                </View>
              </View>
            );
          })}

          {preview && preview !== scale.id && (
            <Animated.View entering={FadeIn.duration(120)} pointerEvents="none" style={[styles.zoomChip, { backgroundColor: c.panel, boxShadow: c.raised }]}>
              <Text style={[styles.zoomChipText, { color: c.ink }]}>{ZOOM_NAMES[preview]}</Text>
            </Animated.View>
          )}

          {showNowButton && (
            <Pressable accessibilityRole="button" onPress={backToNow} style={[styles.nowButton, { backgroundColor: c.accent, boxShadow: c.selected }]}>
              <Text style={[styles.nowButtonText, { color: c.accentInk }]}>Back to now</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

type ItemProps = {
  it: PlacedItem & { at: number; len: number; entry: Entry };
  layer: Layer;
  c: Palette;
  vertical: boolean;
  place: (at: number, len: number, cross: number, crossLen: number) => ViewStyle;
  laneStart: number;
  laneW: number;
  onOpen: (entryId: string) => void;
  onToggleDone: (entry: Entry) => void;
  onMove: (entry: Entry, start: number, end: number | null, layerId: string) => void;
  onLift: () => void;
  /** Lane order (visible layers), for dropping a card into another lane. */
  laneIds: readonly string[];
  /** Time per pixel along the axis, signed by direction. */
  msPerPx: number;
  snap: Interval;
  /** The timeline's own pan: it waits while a card decides whether it is being moved. */
  outerPan: PanGesture;
  /** Cross-axis position of the trunk, where the branch starts. */
  trunk: number;
  isNext: boolean;
  now: number;
};

function Item({ it, layer, c, vertical, place, laneStart, laneW, onOpen, onToggleDone, onMove, onLift, laneIds, msPerPx, snap, outerPan, trunk, isNext, now }: ItemProps) {
  const { entry, shape } = it;
  // Completing a card pops it (1 → 1.08 → 0.97 → 1); an active task's ring breathes (DESIGN.md §2).
  const pop = useSharedValue(1);
  const wasDone = useRef(entry.done);
  useEffect(() => {
    if (entry.done && !wasDone.current) pop.set(withSequence(withTiming(1.08, { duration: 120 }), withTiming(0.97, { duration: 120 }), withTiming(1, { duration: 210 })));
    wasDone.current = entry.done;
  }, [entry.done, pop]);
  const active = entry.kind === 'task' && !entry.done && entry.end !== null && entry.start <= now && now < entry.end;
  const breath = useLoop(2000, active);
  // Long-press, then drag: along the time axis reschedules (snaps to the zoom's slot), sideways changes lane (layer).
  const shift = useSharedValue(0);
  const cross = useSharedValue(0);
  const lifted = useSharedValue(false);
  const dragged = useSharedValue(false); // the release after a drag must not open the card
  useLayoutEffect(() => {
    shift.set(0);
    cross.set(0);
  }, [entry.start, entry.layerId, shift, cross]);
  const drop = (alongPx: number, crossPx: number) => {
    const next = reschedule(entry.start, entry.end, alongPx * msPerPx, snap);
    const layerId = laneIds[laneAfterDrag(it.lane, crossPx, laneW, laneIds.length)] ?? entry.layerId;
    if (next.start !== entry.start || layerId !== entry.layerId) return onMove(entry, next.start, next.end, layerId);
    shift.set(withTiming(0, { duration: 180 }));
    cross.set(withTiming(0, { duration: 180 }));
  };
  const move = usePanGesture({
    enabled: entry.granularity === 'moment',
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
      cross.set(vertical ? e.translationX : e.translationY);
    },
    onDeactivate: (e) => {
      lifted.set(false);
      scheduleOnRN(drop, vertical ? e.translationY : e.translationX, vertical ? e.translationX : e.translationY);
    },
  });
  const popStyle = useAnimatedStyle(() => ({
    zIndex: lifted.get() ? 20 : 0,
    opacity: lifted.get() ? 0.92 : 1,
    transform: [
      { translateX: vertical ? cross.get() : shift.get() },
      { translateY: vertical ? shift.get() : cross.get() },
      { scale: pop.get() * (lifted.get() ? 1.05 : 1) },
    ],
  }));
  const breathStyle = useAnimatedStyle(() => ({ opacity: 0.2 + 0.6 * breath.get() }));
  const nextPulse = useLoop(1600, isNext);
  const nextStyle = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - nextPulse.get()), transform: [{ scale: 1 + 0.5 * nextPulse.get() }] }));
  const branchStyle = useAnimatedStyle(() => ({ opacity: lifted.get() ? 0 : 1 }));
  const sub = laneW / it.columns;
  const start = laneStart + it.column * sub;
  if (shape === 'band') {
    // Month / year goals: a long bar in their lane and a flag where they begin on the trunk.
    return (
      <>
        <View style={[styles.abs, styles.noTouch, place(it.at, it.len, laneStart + 1, 4), { backgroundColor: layer.color.strong, opacity: 0.45, borderRadius: 2 }]} />
        <View style={[styles.abs, styles.noTouch, place(it.at - 8, 16, trunk - 8, 16), styles.center]}>
          <Ionicons name="flag" size={13} color={layer.color.fill} />
        </View>
      </>
    );
  }
  // A missed task stays as a neutral gap, never a red failure (RESEARCH.md #10).
  const skipped = entry.kind === 'task' && !entry.done && entry.end !== null && entry.end <= now;
  const label = `${entry.kind}, ${entry.title}, ${entry.end ? `${timeFmt.format(entry.start)} to ${timeFmt.format(entry.end)}` : timeFmt.format(entry.start)}${entry.done ? ', done' : skipped ? ', missed' : isNext ? ', next up' : ''}`;
  const tone = skipped ? c.lineStrong : layer.color.fill;

  if (shape === 'dot') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onOpen(entry.id)}
        style={[styles.abs, place(it.at, Math.max(it.len, 8), start + 4, 8), { backgroundColor: tone, opacity: entry.done ? 0.5 : 1, borderRadius: 4 }]}
      />
    );
  }

  // A branch: connector from the trunk, a node you tap to complete, the title beside it,
  // and a thin bar along the time axis for how long it lasts.
  const frame = place(it.at, Math.max(it.len, NODE), start + 2, sub - 4);
  const checkable = entry.kind !== 'note';
  const icon = entry.kind === 'task' ? layer.icon : KIND_ICONS[entry.kind];
  const subtitle = entry.done ? 'Done' : skipped ? 'Missed, no penalty' : isNext ? 'Next up' : entry.end !== null && entry.granularity === 'moment' ? `${timeFmt.format(entry.start)}–${timeFmt.format(entry.end)}` : timeFmt.format(entry.start);
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.abs,
          vertical ? { top: it.at + NODE / 2 - 1, height: 2, left: trunk, width: start + 2 + NODE / 2 - trunk } : { left: it.at + NODE / 2 - 1, width: 2, top: trunk, height: start + 2 + NODE / 2 - trunk },
          { backgroundColor: tone, opacity: skipped ? 1 : 0.7 },
          branchStyle,
        ]}
      />
      <GestureDetector gesture={move}>
        <View style={[styles.abs, frame]}>
          <Animated.View style={[styles.abs, styles.fill, popStyle]}>
            {it.len > NODE && (
              <View
                pointerEvents="none"
                style={[styles.abs, vertical ? { top: NODE / 2, bottom: 0, left: NODE / 2 - 2, width: 4 } : { left: NODE / 2, right: 0, top: NODE / 2 - 2, height: 4 }, { backgroundColor: tone, opacity: 0.3, borderRadius: 2 }]}
              />
            )}
            {isNext && <Animated.View pointerEvents="none" style={[styles.abs, styles.node, { borderColor: layer.color.fill, borderWidth: 2 }, nextStyle]} />}
            {active && <Animated.View pointerEvents="none" style={[styles.abs, styles.node, styles.breath, { borderColor: layer.color.fill }, breathStyle]} />}
            <Pressable
              accessibilityRole={checkable ? 'checkbox' : 'button'}
              aria-checked={checkable ? entry.done : undefined}
              accessibilityLabel={checkable ? `Mark ${entry.title} ${entry.done ? 'not done' : 'done'}` : label}
              hitSlop={8}
              onPress={() => !dragged.get() && (checkable ? onToggleDone(entry) : onOpen(entry.id))}
              style={({ pressed }) => [
                styles.abs,
                styles.node,
                entry.done
                  ? { backgroundColor: layer.color.fill, boxShadow: `0 0 10px ${layer.color.fill}` }
                  : skipped
                    ? { backgroundColor: c.tray, borderWidth: 2, borderStyle: 'dashed', borderColor: c.lineStrong }
                    : { backgroundColor: c.panel, borderWidth: 2.5, borderColor: layer.color.fill },
                pressed && styles.pressed,
              ]}
            >
              {entry.done ? (
                <Animated.View entering={ZoomIn.springify()}>
                  <Ionicons name="checkmark" size={15} color={layer.color.ink} />
                </Animated.View>
              ) : (
                <Ionicons name={icon} size={12} color={skipped ? c.muted : layer.color.fill} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={entry.granularity === 'moment' ? 'Long-press and drag to move it' : undefined}
              onPress={() => !dragged.get() && onOpen(entry.id)}
              style={({ pressed }) => [styles.abs, vertical ? { top: 0, left: NODE + 6, right: 0 } : { left: NODE + 6, top: 0, width: 150 }, styles.labelBox, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={[styles.itemTitle, { color: skipped ? c.muted : c.ink }, entry.done && styles.doneTitle]}>
                {entry.title}
              </Text>
              <Text numberOfLines={1} style={[styles.itemTime, { color: entry.done ? layer.color.fill : isNext ? c.accentText : c.muted }]}>
                {subtitle}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </GestureDetector>
    </>
  );
}

function ClockText({ color }: { color: string }) {
  const now = useNow(1000);
  return <Text numberOfLines={1} style={[styles.clock, { color }]}>{clockFmt.format(now)}</Text>;
}

const styles = StyleSheet.create({
  tray: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  abs: { position: 'absolute' },
  fill: { top: 0, left: 0, right: 0, bottom: 0 },
  clip: { overflow: 'hidden' },
  visible: { overflow: 'visible' },
  noTouch: { pointerEvents: 'none' }, // as a style it's dropped on Animated views on web, so those use the prop
  tick: { fontSize: 11, fontFamily: F.semi, fontVariant: ['tabular-nums'] },
  tickV: { textAlign: 'right', lineHeight: 16 },
  tickH: { textAlign: 'center' },
  pill: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  clock: { fontSize: 10.5, fontFamily: F.bold, fontVariant: ['tabular-nums'] },
  laneHead: { borderRadius: 12, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  laneDot: { width: 8, height: 8, borderRadius: 4 },
  laneText: { flex: 1 },
  laneName: { fontSize: 12, fontFamily: F.bold },
  laneSub: { fontSize: 10.5, fontFamily: F.semi },
  center: { alignItems: 'center', justifyContent: 'center' },
  node: { top: 0, left: 0, width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  labelBox: { minHeight: NODE, justifyContent: 'center' },
  itemTitle: { flex: 1, fontSize: 12.5, fontFamily: F.semi, letterSpacing: -0.1 },
  pressed: { transform: [{ scale: 0.97 }] },
  breath: { borderWidth: 2 },
  itemTime: { fontSize: 10.5, fontFamily: F.semi, opacity: 0.8, fontVariant: ['tabular-nums'] },
  doneTitle: { opacity: 0.75 },
  nowButton: { position: 'absolute', right: 10, bottom: 10, height: 44, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center' },
  nowButtonText: { fontSize: 13, fontFamily: F.bold },
  zoomChip: { position: 'absolute', alignSelf: 'center', top: '42%', paddingHorizontal: 18, height: 44, borderRadius: 999, justifyContent: 'center' },
  zoomChipText: { fontSize: 16, fontFamily: F.display },
});
