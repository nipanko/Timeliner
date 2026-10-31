import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * A 0 → 1 → 0 loop for ambient motion (DESIGN.md §2: pulses, flicker, breathing).
 * Stays at 0 with reduce motion or when `enabled` is false.
 */
export function useLoop(duration: number, enabled = true) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce || !enabled) {
      cancelAnimation(t);
      t.set(0);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [duration, enabled, reduce, t]);
  return t;
}

type FillProps = { value: number; colors: readonly [string, string]; style?: StyleProp<ViewStyle> };

/** Gradient progress fill that eases to `value` (0–1) with a tiny overshoot. Animates scaleX, not width. */
export function ProgressFill({ value, colors, style }: FillProps) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withTiming(Math.min(1, Math.max(0, value)), { duration: 900, easing: Easing.out(Easing.back(1.3)) }));
  }, [value, v]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0, v.get()) }] }));
  return (
    <Animated.View style={[styles.fill, style, grow]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { height: '100%', width: '100%', transformOrigin: 'left center' },
});
