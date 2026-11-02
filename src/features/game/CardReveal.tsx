import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { Badge } from '@/core/game/badges';
import { useLoop } from '@/ui/motion';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { CollectCard } from './CollectCard';

const RAYS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const b = a + Math.PI / 20;
  const p = (t: number) => `${450 + Math.cos(t) * 650} ${450 + Math.sin(t) * 650}`;
  return `M450 450 L${p(a)} L${p(b)} Z`;
}).join(' ');

type Props = { card: Badge; owned: number; total: number; still: boolean; onClose: () => void; onSeeAll: () => void };

/** The reward moment for a new card (DESIGN.md v2): light rays, the card floating in, then into the collection. */
export function CardReveal({ card, owned, total, still, onClose, onSeeAll }: Props) {
  const c = usePalette();
  const spin = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    spin.set(withRepeat(withTiming(1, { duration: 18_000, easing: Easing.linear }), -1));
    return () => cancelAnimation(spin);
  }, [still, spin]);
  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  const float = useLoop(3000);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * float.get() }, { rotate: `${-4 + 2 * float.get()}deg` }] }));

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]} accessibilityViewIsModal>
      <View pointerEvents="none" style={styles.raysBox}>
        <Animated.View style={raysStyle}>
          <Svg width={900} height={900} viewBox="0 0 900 900">
            <Path d={RAYS} fill="#FFFFFF" opacity={0.09} />
          </Svg>
        </Animated.View>
      </View>
      <Text style={[styles.kicker, { backgroundColor: c.edge, color: c.accent }]}>
        {card.rarity.toUpperCase()} · CARD {String(card.no).padStart(2, '0')}
      </Text>
      <Animated.Text entering={ZoomIn.springify().damping(10)} style={[styles.title, { color: c.gold, textShadowColor: c.edge }]} accessibilityRole="header">
        NEW CARD!
      </Animated.Text>
      <Animated.View entering={ZoomIn.springify().damping(11).delay(150)}>
        <Animated.View style={floatStyle}>
          <CollectCard card={card} width={210} c={c} />
        </Animated.View>
      </Animated.View>
      <Text style={styles.desc}>{card.desc}</Text>
      <Text style={[styles.count, { backgroundColor: c.edge }]}>
        {owned} / {total} collected
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.primary, { backgroundColor: c.gold, boxShadow: c.raised }, pressed && styles.pressed]}>
          <Text style={[styles.primaryText, { color: c.edge }]}>ADD TO COLLECTION</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onSeeAll} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>See all cards</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(36,58,190,0.96)', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, overflow: 'hidden' },
  raysBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  kicker: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', fontSize: 12, fontFamily: F.bold, letterSpacing: 2 },
  title: { fontSize: 52, lineHeight: 58, fontFamily: F.display, transform: [{ rotate: '-3deg' }], textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 0 },
  desc: { marginTop: 8, fontSize: 15, fontFamily: F.bold, color: '#FFF7F0', textAlign: 'center' },
  count: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, overflow: 'hidden', fontSize: 13, fontFamily: F.bold, color: '#FFF7F0' },
  actions: { alignSelf: 'stretch', maxWidth: 340, width: '100%', marginHorizontal: 'auto', gap: 10, marginTop: 6 },
  primary: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 22, fontFamily: F.display, letterSpacing: 1 },
  secondary: { height: 44, borderRadius: 14, borderWidth: 2.5, borderColor: 'rgba(255,247,240,0.6)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontFamily: F.bold, color: '#FFF7F0' },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
});
