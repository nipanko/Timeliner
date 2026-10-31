import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { progressEvents, type ProgressSnapshot } from '@/core/game/events';
import { LAYER_COLORS, usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { useSetting } from '@/features/settings/data';

import { useProgress } from './useProgress';

type Toast = { id: number; text: string; badge: boolean };
const haptic = (run: () => Promise<void>) => {
  if (Platform.OS !== 'web') run().catch(() => {});
};
let nextId = 1;

/** Plays the game's juice for any gain, wherever it happened: +XP, confetti, level-up, badges (DESIGN.md §2). */
export function Celebrations() {
  const p = useProgress();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  // Calm mode (Settings) drops confetti and vibration, like reduce motion; XP and level news stay.
  const calm = useSetting<string>('calm', 'off') === 'on';
  const reduceMotion = useReducedMotion() || calm;
  const before = useRef<ProgressSnapshot | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!p.ready) return;
    const after = { xp: p.xp, level: p.level.level, badges: p.badges.filter((b) => b.earned).map((b) => b.id) };
    const events = before.current ? progressEvents(before.current, after) : [];
    before.current = after;
    if (!events.length) return;
    // A beat after the tap, so the card's own feedback lands first.
    setTimeout(() => {
      for (const ev of events) {
        if (ev.type === 'level') {
          setLevelUp(ev.level);
          if (!calm) haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
          continue;
        }
        const id = nextId++;
        const name = ev.type === 'badge' ? (p.badges.find((b) => b.id === ev.id)?.name ?? 'New badge') : '';
        setToasts((t) => [...t, { id, text: ev.type === 'xp' ? `+${ev.amount} XP` : `Badge unlocked · ${name}`, badge: ev.type === 'badge' }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ev.type === 'xp' ? 1600 : 2600);
        if (ev.type === 'xp') setBurst((b) => b + 1);
        if (!calm) haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      }
    }, 120);
  }, [p, calm]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {!reduceMotion && burst > 0 && <Confetti key={burst} originY={0.78} />}

      <View style={[styles.toastStack, styles.noTouch, { bottom: insets.bottom + 96 }]}>
        {toasts.filter((t) => !t.badge).map((t) => (
          <Animated.View key={t.id} entering={FadeInDown.springify().damping(14)} exiting={FadeOutUp.duration(300)} style={[styles.xpToast, { boxShadow: c.glow }]}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.xpFill}>
              <Ionicons name="flash" size={15} color={c.accentInk} />
              <Text style={[styles.xpText, { color: c.accentInk }]}>{t.text}</Text>
            </LinearGradient>
          </Animated.View>
        ))}
      </View>

      <View style={[styles.badgeStack, styles.noTouch, { top: insets.top + 10 }]}>
        {toasts.filter((t) => t.badge).map((t) => (
          <Animated.View key={t.id} entering={FadeInDown.springify()} exiting={FadeOutUp} style={[styles.badgeToast, { backgroundColor: c.panel, boxShadow: c.raised }]}>
            <Ionicons name="ribbon" size={18} color={LAYER_COLORS.yellow.fill} />
            <Text style={[styles.badgeText, { color: c.ink }]}>{t.text}</Text>
          </Animated.View>
        ))}
      </View>

      {levelUp !== null && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
          {!reduceMotion && <Confetti originY={0.42} pieces={24} />}
          <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.levelCard, { backgroundColor: c.panel, boxShadow: c.raised }]}>
            <Text style={[styles.levelLabel, { color: c.muted }]}>LEVEL UP</Text>
            <Text style={[styles.levelNumber, { color: c.accentText, textShadowColor: c.gradient[0] }]}>{levelUp}</Text>
            <Text style={[styles.levelSub, { color: c.ink }]}>New level reached. Keep the run going.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLevelUp(null)}
              style={({ pressed }) => [styles.levelButton, { backgroundColor: c.accent, boxShadow: c.selected }, pressed && styles.pressed]}
            >
              <Text style={[styles.levelButtonText, { color: c.accentInk }]}>Let&apos;s go</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const CONFETTI_COLORS = ['#C8F25A', '#5EE6C8', LAYER_COLORS.yellow.fill, LAYER_COLORS.lilac.fill, LAYER_COLORS.salmon.fill, LAYER_COLORS.green.fill];

/** A one-shot burst: pieces fly out, fall with gravity and fade. Remount (new key) to fire again. */
function Confetti({ originY, pieces = 12 }: { originY: number; pieces?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch, { top: `${originY * 100}%`, alignItems: 'center' }]}>
      {Array.from({ length: pieces }, (_, i) => (
        <Piece key={i} index={i} count={pieces} />
      ))}
    </View>
  );
}

function Piece({ index, count }: { index: number; count: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
  }, [t]);
  // Spread the pieces around a circle with a little per-piece variety.
  const angle = (index / count) * Math.PI * 2 + (index % 3) * 0.3;
  const speed = 110 + (index % 5) * 28;
  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: 1 - p * p * p,
      transform: [
        { translateX: Math.cos(angle) * speed * p },
        { translateY: Math.sin(angle) * speed * p - 60 * p + 240 * p * p },
        { rotate: `${(index % 2 ? 1 : -1) * 540 * p}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.piece, { backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length], borderRadius: index % 3 === 0 ? 5 : 2 }, style]} />;
}

const styles = StyleSheet.create({
  toastStack: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  xpToast: { borderRadius: 999, overflow: 'hidden' },
  xpFill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 40 },
  xpText: { fontSize: 17, fontFamily: F.display, fontVariant: ['tabular-nums'] },
  badgeStack: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8 },
  badgeToast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 46, borderRadius: 16 },
  badgeText: { fontSize: 14, fontFamily: F.semi },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  levelCard: { width: 280, borderRadius: 28, padding: 24, alignItems: 'center', gap: 6 },
  levelLabel: { fontSize: 12, fontFamily: F.bold, letterSpacing: 3 },
  levelNumber: { fontSize: 88, lineHeight: 96, fontFamily: F.display, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24 },
  levelSub: { fontSize: 14, fontFamily: F.text, textAlign: 'center' },
  levelButton: { marginTop: 14, alignSelf: 'stretch', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  levelButtonText: { fontSize: 16, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  piece: { position: 'absolute', width: 9, height: 13 },
  passThrough: { pointerEvents: 'box-none', overflow: 'hidden' }, // confetti must never widen the page
  noTouch: { pointerEvents: 'none' },
});
