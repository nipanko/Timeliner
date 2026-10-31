import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import type { Mood } from '@/core/game/mascot';
import { useLoop } from '@/ui/motion';

type Props = {
  size: number;
  mood: Mood;
  /** Bump this number to make Tick jump and cheer (e.g. pass the XP total). */
  celebrate?: number;
  /** Idle bob on (off for tiny placements that sit in text). */
  bob?: boolean;
};

const INK = '#2A1406';

/** "Tick", the orange clay blob with a sprout (DESIGN.md §1). Bobs when idle, jumps when you gain. */
export function Tick({ size, mood, celebrate, bob = true }: Props) {
  const reduce = useReducedMotion();
  const idle = useLoop(2400, bob);
  const lift = useSharedValue(0);
  const squash = useSharedValue(1);
  const [cheering, setCheering] = useState(false);
  const last = useRef(celebrate);

  useEffect(() => {
    if (celebrate === undefined || last.current === undefined || celebrate <= last.current) {
      last.current = celebrate;
      return;
    }
    last.current = celebrate;
    if (!reduce) {
      lift.set(withSequence(withTiming(-size * 0.28, { duration: 180 }), withSpring(0, { damping: 9, stiffness: 260 })));
      squash.set(withSequence(withTiming(1.06, { duration: 180 }), withTiming(0.9, { duration: 90 }), withSpring(1, { damping: 10, stiffness: 300 })));
    }
    const show = setTimeout(() => setCheering(true), 0);
    const hide = setTimeout(() => setCheering(false), 1400);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [celebrate, reduce, size, lift, squash]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.get() - idle.get() * size * 0.04 }, { scaleY: squash.get() }, { scaleX: 2 - squash.get() }],
    transformOrigin: 'center bottom',
  }));

  const face: Mood = cheering ? 'cheer' : mood;
  const a11y = { happy: 'smiling', proud: 'proud', sleepy: 'sleepy', focused: 'focused', cheer: 'cheering' }[face];

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={`Tick, your buddy, ${a11y}`}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Ellipse cx={50} cy={95} rx={26} ry={4} fill="#000" opacity={0.18} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, body]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="tickBody" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor="#FFB45E" />
              <Stop offset="1" stopColor="#FF7438" />
            </LinearGradient>
            <LinearGradient id="tickLeaf" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#D8F77A" />
              <Stop offset="1" stopColor="#7CC43F" />
            </LinearGradient>
          </Defs>
          {/* sprout */}
          <Path d="M50 24 C50 18 50 14 51 9" stroke="#6BAA32" strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M51 12 C42 4 31 6 29 12 C36 17 45 17 51 12 Z" fill="url(#tickLeaf)" />
          <Path d="M51 11 C58 2 70 3 72 9 C65 15 56 15 51 11 Z" fill="url(#tickLeaf)" />
          {/* body + clay light */}
          <Path d="M50 22 C75 22 89 39 89 61 C89 81 72 92 50 92 C28 92 11 81 11 61 C11 39 25 22 50 22 Z" fill="url(#tickBody)" />
          <Ellipse cx={34} cy={38} rx={12} ry={7} fill="#fff" opacity={0.32} transform="rotate(-25 34 38)" />
          <Path d="M20 76 C30 88 70 88 80 76 C72 86 28 86 20 76 Z" fill="#C24A16" opacity={0.25} />
          {/* cheeks */}
          <Ellipse cx={28} cy={66} rx={6} ry={3.6} fill="#FF4F6A" opacity={0.35} />
          <Ellipse cx={72} cy={66} rx={6} ry={3.6} fill="#FF4F6A" opacity={0.35} />
          <Face mood={face} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Face({ mood }: { mood: Mood }) {
  const arcEyes = (
    <G stroke={INK} strokeWidth={3.4} strokeLinecap="round" fill="none">
      <Path d="M32 57 Q38 50 44 57" />
      <Path d="M56 57 Q62 50 68 57" />
    </G>
  );
  switch (mood) {
    case 'proud':
      return (
        <G>
          {arcEyes}
          <Path d="M38 66 Q50 78 62 66" stroke={INK} strokeWidth={3.4} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'cheer':
      return (
        <G>
          {arcEyes}
          <Path d="M38 64 Q50 64 62 64 Q60 80 50 80 Q40 80 38 64 Z" fill={INK} />
          <Ellipse cx={50} cy={75} rx={6} ry={3.2} fill="#FF6B7D" />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <G stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none">
            <Path d="M32 56 Q38 61 44 56" />
            <Path d="M56 56 Q62 61 68 56" />
          </G>
          <Ellipse cx={50} cy={70} rx={3.4} ry={4} fill={INK} />
          <SvgText x={74} y={34} fontSize={14} fontWeight="bold" fill="#9AB8FF">z</SvgText>
          <SvgText x={83} y={24} fontSize={10} fontWeight="bold" fill="#9AB8FF">z</SvgText>
        </G>
      );
    case 'focused':
      return (
        <G>
          <G stroke={INK} strokeWidth={3} strokeLinecap="round">
            <Path d="M31 47 L43 50" />
            <Path d="M69 47 L57 50" />
          </G>
          <Ellipse cx={38} cy={58} rx={4.2} ry={5} fill={INK} />
          <Ellipse cx={62} cy={58} rx={4.2} ry={5} fill={INK} />
          <Path d="M44 70 L56 70" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
        </G>
      );
    default:
      return (
        <G>
          <Ellipse cx={38} cy={56} rx={4.6} ry={6.2} fill={INK} />
          <Ellipse cx={62} cy={56} rx={4.6} ry={6.2} fill={INK} />
          <Circle cx={39.6} cy={53.6} r={1.6} fill="#fff" />
          <Circle cx={63.6} cy={53.6} r={1.6} fill="#fff" />
          <Path d="M42 67 Q50 74 58 67" stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        </G>
      );
  }
}
