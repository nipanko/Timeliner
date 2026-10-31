import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from './theme';
import { F } from './type';

type Props = { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode };

/**
 * A tab screen with a large title that stretches when you pull down and hands over to a compact bar
 * as you scroll (the scroll animation used across the app).
 */
export function ScrollScreen({ title, subtitle, children, footer }: Props) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  const big = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, 48], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(y.get(), [-100, 0, 60], [24, 0, -12], Extrapolation.CLAMP) },
      { scale: interpolate(y.get(), [-140, 0], [1.12, 1], Extrapolation.CLAMP) },
    ],
  }));
  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [30, 60], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={[styles.fill, { backgroundColor: c.ground }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
      >
        <Animated.View style={[styles.titleBlock, big]}>
          <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text>}
        </Animated.View>
        {children}
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[styles.bar, { paddingTop: insets.top, backgroundColor: c.panel, boxShadow: c.raisedSm }, bar]}>
        <Text style={[styles.barTitle, { color: c.ink }]}>{title}</Text>
      </Animated.View>
      {footer}
    </View>
  );
}

/** Staggered entrance for the sections of a screen. */
export function Reveal({ index, children }: { index: number; children: ReactNode }) {
  return <Animated.View entering={FadeInDown.delay(70 * index).springify().damping(16)}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // On wide screens (web, tablets) the column stays readable and centred.
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  titleBlock: { transformOrigin: 'left center', gap: 2, marginBottom: 4 },
  title: { fontSize: 32, fontFamily: F.display, letterSpacing: -0.8 },
  subtitle: { fontSize: 13, fontFamily: F.semi },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
  barTitle: { fontSize: 16, fontFamily: F.bold, paddingTop: 10 },
});
