import { useEffect, useRef, type ComponentRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { usePalette } from './theme';
import { F } from './type';

const ROW = 40;
const VISIBLE = 5; // rows shown; the middle one is selected

type Props = {
  items: readonly string[];
  index: number;
  onChange: (index: number) => void;
  /** Every notch that passes the middle (sound / haptic). */
  onTick: () => void;
  label: string;
  width: number;
};

/**
 * iPhone-alarm-style scroll wheel: flick with momentum, rows tilt away in 3D, it settles on the
 * nearest row and ticks on every notch. Same gesture code on phone and web (plus mouse wheel on web).
 */
export function Wheel({ items, index, onChange, onTick, label, width }: Props) {
  const c = usePalette();
  const max = items.length - 1;
  const y = useSharedValue(-index * ROW);
  const start = useSharedValue(0);
  const dragging = useSharedValue(false);

  useEffect(() => {
    if (!dragging.get()) y.set(withSpring(-index * ROW, { damping: 22, stiffness: 220 }));
  }, [index, y, dragging]);

  const settle = (velocity: number) => {
    'worklet';
    const projected = y.get() + velocity * 0.18;
    const i = Math.min(max, Math.max(0, Math.round(-projected / ROW)));
    y.set(withSpring(-i * ROW, { damping: 22, stiffness: 180, velocity }));
    scheduleOnRN(onChange, i);
  };

  const pan = usePanGesture({
    onBegin: () => {
      cancelAnimation(y);
    },
    onActivate: () => {
      dragging.set(true);
      start.set(y.get());
    },
    onUpdate: (e) => {
      const raw = start.get() + e.translationY;
      // Rubber band past the ends.
      y.set(raw > 0 ? raw / 3 : raw < -max * ROW ? -max * ROW + (raw + max * ROW) / 3 : raw);
    },
    onDeactivate: (e) => {
      dragging.set(false);
      settle(e.velocityY);
    },
  });

  useAnimatedReaction(
    () => Math.min(max, Math.max(0, Math.round(-y.get() / ROW))),
    (i, before) => {
      if (before !== null && i !== before) scheduleOnRN(onTick);
    },
  );

  // Web: the mouse wheel / trackpad scrolls it too.
  const root = useRef<ComponentRef<typeof View>>(null);
  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  });
  useEffect(() => {
    const el = root.current as unknown as HTMLElement | null;
    if (Platform.OS !== 'web' || !el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimation(y);
      y.set(Math.min(0, Math.max(-max * ROW, y.get() - e.deltaY * 0.5)));
      clearTimeout(timer);
      timer = setTimeout(() => settleRef.current(0), 120);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      clearTimeout(timer);
    };
  }, [max, y]);

  return (
    <GestureDetector gesture={pan}>
      <View
        ref={root}
        style={[styles.wheel, { width }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: items[index] }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(0, index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      >
        {items.map((text, i) => (
          <Row key={text} i={i} y={y} text={text} color={c.ink} />
        ))}
      </View>
    </GestureDetector>
  );
}

function Row({ i, y, text, color }: { i: number; y: SharedValue<number>; text: string; color: string }) {
  const style = useAnimatedStyle(() => {
    const d = (i * ROW + y.get()) / ROW; // rows from the middle
    const far = Math.min(Math.abs(d), 3);
    return {
      opacity: 1 - far * 0.3,
      transform: [{ translateY: d * ROW * (1 - far * 0.04) }, { perspective: 500 }, { rotateX: `${-d * 20}deg` }, { scale: 1 - far * 0.05 }],
    };
  });
  return (
    <Animated.View style={[styles.row, style]}>
      <Text style={[styles.rowText, { color }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wheel: { height: ROW * VISIBLE, overflow: 'hidden', justifyContent: 'center' },
  row: { position: 'absolute', left: 0, right: 0, top: (ROW * VISIBLE - ROW) / 2, height: ROW, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontSize: 24, fontFamily: F.displaySemi, fontVariant: ['tabular-nums'] },
});

export const WHEEL_ROW = ROW;
export const WHEEL_HEIGHT = ROW * VISIBLE;
