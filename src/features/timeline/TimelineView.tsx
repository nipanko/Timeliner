import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  FadeIn,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { floorUnit } from '@/core/time/units';
import { layoutTimeline, type PlacedItem } from '@/core/timeline/layout';
import type { Scale } from '@/core/timeline/scales';
import { hasLabel, labelEvery, tickLabel, ticks } from '@/core/timeline/ticks';
import { isVertical, posToTime, timeToPos, visibleRange, type Direction, type Viewport } from '@/core/timeline/viewport';
import type { Entry, Layer } from '@/features/entries/data';
import { useNow } from '@/hooks/useNow';
import { usePalette, type Palette } from '@/ui/theme';


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
};

export function TimelineView({ entries, layers, scale, direction, camera, onAdd, onOpen }: Props) {
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
  const laneW = C / Math.max(1, layers.length);

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
    const lane = layers[Math.min(layers.length - 1, Math.max(0, Math.floor(((vertical ? x : y) - GUT) / laneW)))];
    if (lane) onAdd(floorUnit(at, scale.snap.unit, scale.snap.step), lane.id);
  };

  const along = (d: number) => {
    'worklet';
    return vertical ? [{ translateY: d }] : [{ translateX: d }];
  };
  const contentStyle = useAnimatedStyle(() => ({ transform: along((-sign * (anchorTime.get() - origin) * L) / span) }));
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
  const place = (at: number, len: number, cross: number, crossLen: number): ViewStyle =>
    vertical ? { top: at, height: len, left: cross, width: crossLen } : { left: at, width: len, top: cross, height: crossLen };
  const body: ViewStyle = vertical ? { top: HDR, left: 0, right: 0, bottom: 0 } : { left: HDR, top: 0, bottom: 0, right: 0 };
  const zeroAlong: ViewStyle = vertical ? { top: 0, left: 0, right: 0, height: 0 } : { left: 0, top: 0, bottom: 0, width: 0 };

  return (
    <View
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
                vertical ? { top: HDR, bottom: 0, left: GUT + i * laneW, width: laneW } : { left: HDR, right: 0, top: GUT + i * laneW, height: laneW },
                { backgroundColor: i % 2 ? c.laneAlt : 'transparent' },
              ]}
            />
          ))}

          <GestureDetector gesture={pan}>
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
                  <Item key={it.id} it={it} layer={layers[it.lane]} c={c} vertical={vertical} place={place} laneStart={GUT + it.lane * laneW} laneW={laneW} onOpen={onOpen} now={minuteNow} />
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

              <Animated.View pointerEvents="none" style={[styles.abs, zeroAlong, styles.visible, nowStyle]}>
                <View style={[styles.abs, vertical ? { top: -1.5, height: 3, left: GUT - 4, right: 0 } : { left: -1.5, width: 3, top: GUT - 4, bottom: 0 }, { backgroundColor: c.accent }]} />
                <View style={[styles.abs, styles.pill, vertical ? { top: -11, height: 22, left: 2, width: GUT - 4 } : { left: -48, width: 96, top: 2, height: GUT - 4 }, { backgroundColor: c.accent }]}>
                  <ClockText color={c.accentInk} />
                </View>
              </Animated.View>
            </View>
          </GestureDetector>

          <View style={[styles.abs, vertical ? { top: 0, left: 0, right: 0, height: HDR } : { left: 0, top: 0, bottom: 0, width: HDR }, { backgroundColor: c.tray }]} />
          {layers.map((layer, i) => {
            const count = entries.filter((e) => e.layerId === layer.id && (e.kind === 'task' || e.kind === 'todo') && e.start >= today && e.start < today + 86_400_000).length;
            return (
              <View
                key={layer.id}
                style={[styles.abs, styles.laneHead, place(5, HDR - 10, GUT + i * laneW + 3, laneW - 6), { backgroundColor: layer.color.fill, boxShadow: c.raisedSm }]}
              >
                <Text numberOfLines={1} style={[styles.laneName, { color: layer.color.ink }]}>{layer.name}</Text>
                <Text numberOfLines={1} style={[styles.laneSub, { color: layer.color.ink }]}>{count} today</Text>
              </View>
            );
          })}

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
  now: number;
};

function Item({ it, layer, c, vertical, place, laneStart, laneW, onOpen, now }: ItemProps) {
  const { entry, shape } = it;
  const sub = laneW / it.columns;
  const start = laneStart + it.column * sub;
  if (shape === 'band') {
    return <View style={[styles.abs, styles.noTouch, place(it.at, it.len, laneStart + 1, 4), { backgroundColor: layer.color.strong, opacity: 0.45, borderRadius: 2 }]} />;
  }
  const flatPill = !vertical && shape === 'pill';
  const frame = place(it.at, it.len, flatPill ? start + (sub - 30) / 2 : start + 4, flatPill ? 30 : sub - 8);
  // A missed task stays as a neutral gap, never a red failure (RESEARCH.md #10).
  const skipped = entry.kind === 'task' && !entry.done && entry.end !== null && entry.end <= now;
  const look = skipped
    ? { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed' as const, borderColor: c.lineStrong }
    : { backgroundColor: layer.color.fill, opacity: entry.done ? 0.55 : 1 };
  const label = `${entry.kind}, ${entry.title}, ${entry.end ? `${timeFmt.format(entry.start)} to ${timeFmt.format(entry.end)}` : timeFmt.format(entry.start)}${entry.done ? ', done' : skipped ? ', missed' : ''}`;

  if (shape === 'compact' || shape === 'dot') {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onOpen(entry.id)} style={[styles.abs, frame, look, { borderRadius: 4 }]} />;
  }
  const showTime = shape === 'card' && entry.granularity === 'moment' && it.len > (vertical ? 48 : 110);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onOpen(entry.id)} style={[styles.abs, frame, look, shape === 'card' ? styles.card : styles.pillItem, !skipped && { boxShadow: c.raisedSm }]}>
      <View style={styles.row}>
        {entry.kind !== 'task' && <View style={[styles.kindMark, kindMarks[entry.kind], { borderColor: layer.color.ink, backgroundColor: entry.kind === 'note' ? layer.color.ink : 'transparent' }]} />}
        <Text numberOfLines={1} style={[styles.itemTitle, { color: layer.color.ink }, entry.done && entry.kind === 'todo' && styles.struck]}>
          {entry.title}
        </Text>
      </View>
      {showTime && entry.end !== null && (
        <Text numberOfLines={1} style={[styles.itemTime, { color: layer.color.ink }]}>
          {timeFmt.format(entry.start)}–{timeFmt.format(entry.end)}
        </Text>
      )}
    </Pressable>
  );
}

function ClockText({ color }: { color: string }) {
  const now = useNow(1000);
  return <Text numberOfLines={1} style={[styles.clock, { color }]}>{clockFmt.format(now)}</Text>;
}

const kindMarks: Record<Exclude<Entry['kind'], 'task'>, ViewStyle> = {
  todo: { borderRadius: 3 },
  note: { borderRadius: 2, height: 4 },
  reminder: { borderRadius: 5 },
};

const styles = StyleSheet.create({
  tray: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  abs: { position: 'absolute' },
  fill: { top: 0, left: 0, right: 0, bottom: 0 },
  clip: { overflow: 'hidden' },
  visible: { overflow: 'visible' },
  noTouch: { pointerEvents: 'none' }, // as a style it's dropped on Animated views on web, so those use the prop
  tick: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tickV: { textAlign: 'right', lineHeight: 16 },
  tickH: { textAlign: 'center' },
  pill: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  clock: { fontSize: 10.5, fontWeight: '900', fontVariant: ['tabular-nums'] },
  laneHead: { borderRadius: 14, paddingHorizontal: 8, justifyContent: 'center' },
  laneName: { fontSize: 12, fontWeight: '900' },
  laneSub: { fontSize: 10.5, fontWeight: '800' },
  card: { borderRadius: 16, paddingHorizontal: 8, paddingVertical: 6, gap: 2 },
  pillItem: { borderRadius: 999, paddingHorizontal: 10, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kindMark: { width: 10, height: 10, borderWidth: 2 },
  itemTitle: { flexShrink: 1, fontSize: 12, fontWeight: '900' },
  itemTime: { fontSize: 10.5, fontWeight: '800', opacity: 0.8, fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through' },
  nowButton: { position: 'absolute', right: 10, bottom: 10, height: 44, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center' },
  nowButtonText: { fontSize: 13, fontWeight: '900' },
});
