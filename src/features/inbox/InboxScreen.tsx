import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addUnit, floorUnit } from '@/core/time/units';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { addToInbox, removeFromInbox, useInbox, type InboxItem } from './data';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const ago = (t: number, now: number) => {
  const min = Math.round((now - t) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Capture first, plan later (RESEARCH.md #6): parked thoughts stop nagging once they're written down. */
export function InboxScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const items = useInbox();
  const [text, setText] = useState('');
  const [now] = useState(Date.now);

  const capture = async () => {
    if (!text.trim()) return;
    await addToInbox(text);
    setText('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.panel, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <View style={styles.side} />
        <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">Inbox</Text>
        <Pressable accessibilityRole="button" onPress={close} style={[styles.side, styles.right]}>
          <Text style={[styles.done, { color: c.accentText }]}>Done</Text>
        </Pressable>
      </View>

      <View style={[styles.captureRow, { backgroundColor: c.tray, boxShadow: c.pressedIn }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={capture}
          submitBehavior="submit"
          autoFocus
          maxLength={200}
          placeholder="What's on your mind?"
          placeholderTextColor={c.muted}
          accessibilityLabel="New inbox item"
          style={[styles.input, { color: c.ink }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add to inbox"
          onPress={capture}
          style={({ pressed }) => [styles.addButton, { backgroundColor: text.trim() ? c.accent : c.chip }, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-up" size={20} color={text.trim() ? c.accentInk : c.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {items.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={36} color={c.muted} />
            <Text style={[styles.emptyText, { color: c.muted }]}>Nothing parked. Write down anything that pops into your head, then plan it when you have a minute.</Text>
          </View>
        )}
        {items.map((item) => (
          <Row key={item.id} item={item} now={now} />
        ))}
      </ScrollView>
    </View>
  );
}

function Row({ item, now }: { item: InboxItem; now: number }) {
  const c = usePalette();
  const [confirm, setConfirm] = useState(false);
  // Planning opens the add sheet at the next quarter hour; saving it clears this item.
  const plan = () =>
    router.push({
      pathname: '/entry/[id]',
      params: { id: 'new', at: String(addUnit(floorUnit(Date.now(), 'minute', 15), 'minute', 15)), title: item.title, inbox: item.id },
    });

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut} layout={LinearTransition} style={[styles.row, { backgroundColor: c.ground, boxShadow: c.raisedSm }]}>
      <View style={styles.grow}>
        <Text style={[styles.rowTitle, { color: c.ink }]}>{item.title}</Text>
        <Text style={[styles.rowSub, { color: c.muted }]}>{ago(item.createdAt, now)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={confirm ? `Tap again to delete ${item.title}` : `Delete ${item.title}`}
        onPress={() => (confirm ? removeFromInbox(item.id) : setConfirm(true))}
        style={({ pressed }) => [styles.iconButton, { backgroundColor: confirm ? c.danger : c.chip }, pressed && styles.pressed]}
      >
        <Ionicons name="trash-outline" size={17} color={confirm ? c.panel : c.muted} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Plan ${item.title}`} onPress={plan} style={({ pressed }) => [styles.plan, { backgroundColor: c.accent }, pressed && styles.pressed]}>
        <Ionicons name="calendar" size={15} color={c.accentInk} />
        <Text style={[styles.planText, { color: c.accentInk }]}>Plan</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }, // a sheet, not a full-width page, on wide screens
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10 },
  side: { minWidth: 80, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  right: { alignItems: 'flex-end' },
  title: { fontSize: 18, fontFamily: F.display },
  done: { fontSize: 15, fontFamily: F.bold },
  captureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 18, padding: 6, paddingLeft: 14 },
  input: { flex: 1, height: 44, fontSize: 16, fontFamily: F.semi },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyText: { fontSize: 14, fontFamily: F.text, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, padding: 12 },
  grow: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontFamily: F.semi },
  rowSub: { fontSize: 12, fontFamily: F.text },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  plan: { height: 44, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', gap: 6, alignItems: 'center' },
  planText: { fontSize: 14, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.95 }] },
});
