import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { QUEST_BONUS_XP, type Quest } from '@/core/game/quests';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

/** The day's quests in one slim row: three pips and the next one to do. Tap for the list. */
export function QuestStrip({ quests, onOpen }: { quests: readonly Quest[]; onOpen: () => void }) {
  const c = usePalette();
  const done = quests.filter((q) => q.done).length;
  const next = quests.find((q) => !q.done);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Daily quests, ${done} of ${quests.length} done${next ? `. Next: ${next.title}` : ''}. Show all`}
      onPress={onOpen}
      style={({ pressed }) => [styles.strip, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
    >
      <Text style={[styles.label, { color: c.muted }]}>QUESTS</Text>
      <View style={styles.pips}>
        {quests.map((q) => (
          <View key={q.id} style={[styles.pip, { backgroundColor: q.done ? c.accent : c.chip }]} />
        ))}
      </View>
      <Text numberOfLines={1} style={[styles.next, { color: next ? c.ink : c.accentText }]}>
        {next ? next.title : `All done · +${QUEST_BONUS_XP} XP`}
      </Text>
      <Ionicons name={next ? 'chevron-forward' : 'trophy'} size={16} color={next ? c.muted : c.gold} />
    </Pressable>
  );
}

/** All three quests with their progress, and what finishing them earns. */
export function QuestSheet({ open, quests, onClose }: { open: boolean; quests: readonly Quest[]; onClose: () => void }) {
  const c = usePalette();
  const all = quests.every((q) => q.done);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.backdrop, { backgroundColor: c.veil }]}>
        <Pressable onPress={() => {}} accessible={false}>
          <Animated.View entering={ZoomIn.springify().damping(16)} style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raised }]}>
            <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
              Today&apos;s quests
            </Text>
            {quests.map((q) => (
              <View key={q.id} style={[styles.row, { backgroundColor: c.tray }]} accessible accessibilityLabel={`${q.title}, ${q.done ? 'done' : `${q.value} of ${q.target}`}`}>
                <View style={[styles.check, q.done ? { backgroundColor: c.accent, boxShadow: c.selected } : { borderWidth: 2.5, borderColor: c.lineStrong }]}>
                  {q.done && <Ionicons name="checkmark" size={16} color={c.accentInk} />}
                </View>
                <View style={styles.grow}>
                  <Text style={[styles.questTitle, { color: c.ink }, q.done && styles.struck]}>{q.title}</Text>
                  {q.target > 1 && (
                    <View style={[styles.track, { backgroundColor: c.chip }]}>
                      <View style={[styles.fill, { width: `${q.progress * 100}%`, backgroundColor: q.done ? c.accent : c.gold }]} />
                    </View>
                  )}
                </View>
                <Text style={[styles.count, { color: q.done ? c.accentText : c.muted }]}>
                  {q.target > 1 ? `${q.value}/${q.target}` : q.done ? '1/1' : '0/1'}
                </Text>
              </View>
            ))}
            <View style={[styles.reward, { backgroundColor: all ? c.accent : c.chip }]}>
              <Ionicons name="trophy" size={18} color={all ? c.accentInk : c.gold} />
              <Text style={[styles.rewardText, { color: all ? c.accentInk : c.ink }]}>
                {all ? `All three done: +${QUEST_BONUS_XP} XP earned` : `Finish all three: +${QUEST_BONUS_XP} XP`}
              </Text>
            </View>
            <Text style={[styles.hint, { color: c.muted }]}>New quests every day. Complete all three on 7 days for the Quest master card.</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.done, { backgroundColor: c.accent, boxShadow: c.selected }, pressed && styles.pressed]}>
              <Text style={[styles.doneText, { color: c.accentInk }]}>Let&apos;s go</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 12, borderRadius: 14 },
  label: { fontSize: 11, fontFamily: F.display, letterSpacing: 1.4 },
  pips: { flexDirection: 'row', gap: 4 },
  pip: { width: 20, height: 8, borderRadius: 4 },
  next: { flex: 1, fontSize: 13, fontFamily: F.bold },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: 340, maxWidth: '100%', borderRadius: 26, padding: 16, gap: 10 },
  title: { fontSize: 22, fontFamily: F.display },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 6 },
  questTitle: { fontSize: 14.5, fontFamily: F.bold },
  struck: { opacity: 0.6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  count: { fontSize: 15, fontFamily: F.display },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, height: 44 },
  rewardText: { fontSize: 14, fontFamily: F.bold },
  hint: { fontSize: 12.5, fontFamily: F.text, lineHeight: 17 },
  done: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  doneText: { fontSize: 17, fontFamily: F.display },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
});
