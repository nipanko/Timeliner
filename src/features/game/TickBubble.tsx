import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import type { Mood } from '@/core/game/mascot';
import type { TickLine } from '@/core/game/voice';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { Tick } from './Tick';

const ACTION_LABEL = { plan: 'Plan', focus: 'Focus', review: 'Close day' } as const;

type Props = {
  line: TickLine;
  mood: Mood;
  /** Bump to make Tick jump and cheer (pass the XP total). */
  celebrate?: number;
  onAction: () => void;
  onDismiss: () => void;
};

/** "Tick says…": one short line above the Timeline with at most one action (STRATEGY.md §2). */
export function TickBubble({ line, mood, celebrate, onAction, onDismiss }: Props) {
  const c = usePalette();
  return (
    <Animated.View key={line.key} entering={FadeInDown.springify().damping(16)} exiting={FadeOut} style={[styles.bar, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
      <Tick size={32} mood={mood} celebrate={celebrate} />
      <Text style={[styles.text, { color: c.ink }]} accessibilityRole="text" accessibilityLiveRegion="polite">
        {line.text}
      </Text>
      {line.action && (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.action, { backgroundColor: c.accent, boxShadow: c.selected }, pressed && styles.pressed]}>
          <Text style={[styles.actionText, { color: c.accentInk }]}>{ACTION_LABEL[line.action]}</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Hide Tick’s tip" onPress={onDismiss} hitSlop={8} style={styles.close}>
        <Ionicons name="close" size={16} color={c.muted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 6, paddingLeft: 8, paddingRight: 4 },
  text: { flex: 1, fontSize: 13, lineHeight: 17, fontFamily: F.semi },
  action: { height: 34, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontFamily: F.display },
  close: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
});
