import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import type { Mood } from '@/core/game/mascot';
import type { TickLine } from '@/core/game/voice';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { Tick } from './Tick';

const ACTION_LABEL = { plan: 'Plan', focus: 'Focus', review: 'Close day' } as const;

type Props = { line: TickLine; mood: Mood; onAction: () => void; onDismiss: () => void };

/** "Tick says…": one short line on the Timeline with at most one action (STRATEGY.md §2). */
export function TickBubble({ line, mood, onAction, onDismiss }: Props) {
  const c = usePalette();
  return (
    <Animated.View key={line.key} entering={FadeInDown.springify().damping(16)} exiting={FadeOut} style={[styles.bubble, { backgroundColor: c.panel, boxShadow: c.raised }]}>
      <Tick size={34} mood={mood} />
      <Text style={[styles.text, { color: c.ink }]} accessibilityRole="text" accessibilityLiveRegion="polite">
        {line.text}
      </Text>
      {line.action && (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.action, { backgroundColor: c.accent }, pressed && styles.pressed]}>
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
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 440, maxWidth: '100%', borderRadius: 20, paddingVertical: 8, paddingLeft: 10, paddingRight: 6 },
  text: { flex: 1, fontSize: 13.5, lineHeight: 18, fontFamily: F.semi },
  action: { height: 36, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontFamily: F.bold },
  close: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
});
