import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import type { Badge, Rarity } from '@/core/game/badges';
import { useLoop } from '@/ui/motion';
import type { Palette } from '@/ui/theme';
import { F } from '@/ui/type';

// Each card's look: Tick with one accessory, on its own candy colour (DESIGN.md v2).
const ART = {
  sprout: ['M50 30 C50 18 56 8 72 6 C72 20 62 28 50 30Z M50 30 C50 20 44 12 30 12 C30 24 38 30 50 30Z', '#7BD88F'],
  sun: ['M84 4a13 13 0 1 1 0 26a13 13 0 1 1 0-26z', '#FFF3B0'],
  moon: ['M86 2a16 16 0 1 0 12 28a13 13 0 1 1 -12 -28z', '#FFD15C'],
  flame: ['M50 0 C60 12 68 18 63 30 C59 38 41 38 37 30 C34 21 44 16 50 0Z', '#FFD15C'],
  star: ['M84 2l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z', '#FFD15C'],
  flag: ['M74 40 V6 H94 L88 14 L94 22 H76', '#FFF7F0'],
  bolt: ['M86 2 L72 24 H84 L76 40 L96 16 H84 L92 2Z', '#FFD15C'],
  phones: ['M16 64 C16 26 84 26 84 64 L76 64 C76 38 24 38 24 64Z M10 56h14v22H10z M76 56h14v22H76z', '#F4F1FF'],
  clock: ['M84 2a15 15 0 1 1 0 30a15 15 0 1 1 0-30z M84 8 V17 L90 21', '#FFF7F0'],
  trophy: ['M72 4h24v9c0 8-5 13-12 13s-12-5-12-13z M80 26h8v6h5v6H75v-6h5z', '#FFD15C'],
  crown: ['M28 34 L32 14 L43 24 L50 8 L57 24 L68 14 L72 34Z', '#FFD15C'],
  chest: ['M70 16 h28 v18 h-28z M70 16 c0-8 6-12 14-12 s14 4 14 12z M81 20 h6 v7 h-6z', '#FFD15C'],
} as const;

const LOOK: Record<string, [keyof typeof ART, string]> = {
  first: ['sprout', '#C8F25A'],
  early: ['sun', '#FFD15C'],
  night: ['moon', '#8B5CF6'],
  'streak-3': ['flame', '#FF5D7A'],
  fresh: ['flag', '#2EC4B6'],
  'done-10': ['bolt', '#7BD88F'],
  comeback: ['star', '#FF7AB6'],
  'streak-7': ['flame', '#E23A57'],
  'focus-10': ['phones', '#5AA9FF'],
  honest: ['clock', '#5EE6C8'],
  'level-5': ['trophy', '#FFB648'],
  'quests-7': ['chest', '#E2B8FF'],
  'streak-14': ['flame', '#9B7BFF'],
  'done-100': ['bolt', '#4C7BFF'],
  'focus-50': ['phones', '#FF7AB6'],
  'level-10': ['crown', '#5EE6C8'],
  'streak-30': ['crown', '#C8F25A'],
  'streak-66': ['trophy', '#FFD15C'],
};

const GEMS: Record<Rarity, string> = { common: '◆', rare: '◆◆', epic: '◆◆◆', legendary: '◆◆◆◆' };
const INK = '#07070F';

type Props = { card: Badge; width: number; c: Palette };

/** A collectible card: owned ones show Tick in their outfit and shine; locked ones show what earns them. */
export function CollectCard({ card, width, c }: Props) {
  const height = Math.round(width * 1.42);
  const scale = width / 110;
  const no = String(card.no).padStart(2, '0');
  const shine = useLoop(3200, card.earned);
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -width * 0.5 + shine.get() * width * 1.6 }, { rotate: '20deg' }] }));

  if (!card.earned) {
    return (
      <View
        accessible
        accessibilityLabel={`Card ${no}, locked. ${card.desc}. ${Math.round(card.progress * 100)} percent`}
        style={[styles.card, styles.locked, { width, height, borderRadius: 14 * scale, padding: 7 * scale, backgroundColor: c.panel, borderColor: c.lineStrong }]}
      >
        <Text style={[styles.no, styles.lockedNo, { fontSize: 10 * scale, color: c.muted, backgroundColor: c.chip }]}>{no}</Text>
        <Text style={[styles.question, { fontSize: 44 * scale, color: c.chip }]}>?</Text>
        <View style={styles.hint}>
          <Text numberOfLines={3} style={[styles.hintText, { fontSize: 9.5 * scale, lineHeight: 12 * scale, color: c.muted }]}>{card.desc}</Text>
          <View style={[styles.track, { backgroundColor: c.chip }]}>
            <View style={[styles.trackFill, { width: `${card.progress * 100}%`, backgroundColor: c.accentText }]} />
          </View>
        </View>
      </View>
    );
  }

  const [art, bg] = LOOK[card.id] ?? ['star', c.gold];
  const [d, fill] = ART[art];
  return (
    <View
      accessible
      accessibilityLabel={`Card ${no}, ${card.name}, ${card.rarity}. ${card.desc}`}
      style={[styles.card, { width, height, borderRadius: 14 * scale, padding: 7 * scale, backgroundColor: bg, borderColor: INK, boxShadow: `0 ${4 * scale}px 0 ${INK}` }]}
    >
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: 11 * scale }]} pointerEvents="none">
        <Animated.View style={[styles.shine, { width: width * 0.24, height: height * 1.4, top: -height * 0.2 }, shineStyle]} />
      </View>
      <View style={styles.top}>
        <Text numberOfLines={2} style={[styles.name, { fontSize: 12 * scale, lineHeight: 13 * scale }]}>
          {card.name.toUpperCase()}
        </Text>
        <Text style={[styles.no, { fontSize: 10 * scale, color: '#FFF7F0', backgroundColor: INK }]}>{no}</Text>
      </View>
      <Svg width={78 * scale} height={78 * scale} viewBox="0 0 100 100" style={styles.art}>
        <Ellipse cx={50} cy={95} rx={28} ry={4} fill={INK} opacity={0.25} />
        <Path d="M50 14 C50 22 50 26 50 32" stroke="#2F8F4E" strokeWidth={5} fill="none" />
        <Path d="M50 20 C56 10 68 10 70 14 C64 22 56 22 50 20Z" fill="#7BD88F" stroke={INK} strokeWidth={4} />
        <Path d="M50 32 C74 32 86 50 86 66 C86 84 70 94 50 94 C30 94 14 84 14 66 C14 50 26 32 50 32Z" fill="#FF8A4C" stroke={INK} strokeWidth={5} />
        <Circle cx={38} cy={62} r={6} fill={INK} />
        <Circle cx={62} cy={62} r={6} fill={INK} />
        <Circle cx={36} cy={60} r={2} fill="#FFF7F0" />
        <Circle cx={60} cy={60} r={2} fill="#FFF7F0" />
        <Path d="M42 76 Q50 82 58 76" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d={d} fill={fill} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      </Svg>
      <View style={styles.bottom}>
        <Text style={[styles.rarity, { fontSize: 8.5 * scale }]}>{card.rarity.toUpperCase()}</Text>
        <Text style={[styles.rarity, { fontSize: 8.5 * scale }]}>{GEMS[card.rarity]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 3, justifyContent: 'space-between' },
  locked: { borderStyle: 'dashed', alignItems: 'stretch' },
  clip: { overflow: 'hidden' },
  shine: { position: 'absolute', left: 0, backgroundColor: 'rgba(255,255,255,0.28)' },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 },
  name: { flex: 1, fontFamily: F.display, color: '#FFF7F0', textShadowColor: INK, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  no: { fontFamily: F.display, paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
  lockedNo: { alignSelf: 'flex-end' },
  art: { alignSelf: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rarity: { fontFamily: F.bold, color: INK, letterSpacing: 0.8 },
  question: { fontFamily: F.display, textAlign: 'center' },
  hint: { gap: 4 },
  hintText: { fontFamily: F.bold, textAlign: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: '100%' },
});
