import { useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { addUnit } from '@/core/time/units';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

type Props = {
  weekStart: number;
  today: number;
  /** +1 = the next week, -1 = the previous one. */
  onShift: (weeks: number) => void;
  onPick: (day: number) => void;
  dotsFor: (day: number) => string[];
};

const PAGES = [-1, 0, 1];

/**
 * Swipe through weeks without end: only the previous, current and next week exist. After a swipe
 * settles, the parent moves `weekStart` and the row snaps back to the middle page.
 */
export function WeekStrip({ weekStart, today, onShift, onPick, dotsFor }: Props) {
  const c = usePalette();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const swiped = useSharedValue(false); // a swipe ends on a day; that release must not count as a tap
  useLayoutEffect(() => {
    x.set(0);
  }, [weekStart, x]);

  const pan = usePanGesture({
    activeOffsetX: [-10, 10],
    failOffsetY: [-12, 12],
    onBegin: () => {
      swiped.set(false);
    },
    onActivate: () => {
      swiped.set(true);
    },
    onUpdate: (e) => {
      x.set(e.translationX);
    },
    onDeactivate: (e) => {
      const fling = e.translationX + e.velocityX * 0.15;
      const dir = Math.abs(fling) > Math.min(80, width / 4) ? Math.sign(fling) : 0;
      x.set(
        withTiming(dir * width, { duration: 220 }, (finished) => {
          'worklet';
          if (finished && dir) scheduleOnRN(onShift, -dir);
        }),
      );
    },
  });
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() - width }] }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.clip} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View style={[styles.row, { width: width * 3 }, rowStyle]}>
            {PAGES.map((p) => {
              const start = addUnit(weekStart, 'week', p);
              return (
                // Off-screen weeks stay out of focus order, or the browser scrolls the strip to show them.
                <View key={start} aria-hidden={p !== 0} style={[styles.week, { width }]}>
                  {Array.from({ length: 7 }, (_, i) => addUnit(start, 'day', i)).map((day) => {
                    const isToday = day === today;
                    return (
                      <Pressable
                        key={day}
                        focusable={p === 0}
                        accessibilityRole="button"
                        accessibilityLabel={`Go to ${new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                        onPress={() => !swiped.get() && onPick(day)}
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
              );
            })}
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Padding keeps today's glow inside the clip.
  clip: { overflow: 'hidden', minHeight: 72, paddingVertical: 4, marginVertical: -4 },
  row: { flexDirection: 'row' },
  week: { flexDirection: 'row' },
  day: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  weekday: { fontSize: 11, fontFamily: F.semi },
  dayNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 16, fontFamily: F.displaySemi, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  pressed: { transform: [{ scale: 0.94 }] },
});
