import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { summarizeDay } from '@/core/game/review';
import { streak } from '@/core/game/streaks';
import { REVIEW_XP } from '@/core/game/xp';
import { addUnit, floorUnit, HOUR, MINUTE } from '@/core/time/units';
import { saveEntry, useEntries, useLayers, type Entry } from '@/features/entries/data';
import { useFocusedByEntry } from '@/features/focus/data';
import { useNow } from '@/hooks/useNow';
import { LAYER_COLORS, usePalette } from '@/ui/theme';

import { closeDay, useReviewedDays } from './data';

const duration = (ms: number) => `${Math.floor(ms / HOUR)} h ${Math.round((ms % HOUR) / MINUTE)} m`;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** End-of-day run (DESIGN.md §3.4): wins first, gaps without blame, tomorrow's first task, ends on the best moment. */
export function ReviewScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const entries = useEntries();
  const layers = useLayers();
  const focused = useFocusedByEntry(now);
  const reviewed = useReviewedDays();
  const [firstTask, setFirstTask] = useState('');

  const today = floorUnit(now, 'day');
  const tomorrow = addUnit(today, 'day', 1);
  const s = summarizeDay(entries, focused, today, tomorrow, now);
  const run = streak(entries.filter((e) => e.done && (e.kind === 'task' || e.kind === 'todo')).map((e) => e.start), now);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const best = s.bestId ? byId.get(s.bestId) : undefined;
  const closed = reviewed.includes(today);

  const moveToTomorrow = (e: Entry) =>
    saveEntry(e.id, { ...e, start: addUnit(e.start, 'day', 1), end: e.end === null ? null : addUnit(e.end, 'day', 1) });
  const finish = async () => {
    const title = firstTask.trim();
    const layer = layers.find((l) => l.visible) ?? layers[0];
    // Implementation intention for tomorrow (RESEARCH.md #1, #6).
    const start = tomorrow + 9 * HOUR;
    if (title && layer) await saveEntry(null, { layerId: layer.id, kind: 'task', title, start, end: start + 25 * MINUTE, granularity: 'moment' });
    await closeDay(today);
    close();
  };

  const tiles: [string, string][] = [
    ['Tasks done', `${s.done} / ${s.total}`],
    ['Focused', duration(s.focusedMs)],
    ['XP earned', `+${s.xp}`],
    ['Streak', `${run.days} day${run.days === 1 ? '' : 's'}`],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }]}>
      <View style={styles.top}>
        <View>
          <Text style={[styles.date, { color: c.ink }]}>{new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text style={[styles.title, { color: c.ink }]}>Today&apos;s run</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={close} style={[styles.closeButton, { backgroundColor: c.panel, boxShadow: c.raised }]}>
          <Text style={[styles.closeText, { color: c.ink }]}>×</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.tiles}>
          {tiles.map(([label, value]) => (
            <View key={label} style={[styles.tile, { backgroundColor: c.panel, boxShadow: c.raised }]}>
              <Text style={[styles.tileLabel, { color: c.muted }]}>{label}</Text>
              <Text style={[styles.tileValue, { color: c.ink }]}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raised }]}>
          <Text style={[styles.cardLabel, { color: c.muted }]}>The path you walked</Text>
          {s.total ? (
            <View style={styles.path} accessible accessibilityLabel={`${s.done} done, ${s.missed.length} missed, ${s.total - s.done - s.missed.length} still to come`}>
              {s.path.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.node,
                    p.state === 'done' ? { backgroundColor: c.accent } : p.state === 'missed' ? { borderWidth: 2, borderStyle: 'dashed', borderColor: c.lineStrong } : { borderWidth: 2, borderColor: c.lineStrong },
                  ]}
                />
              ))}
            </View>
          ) : (
            <Text style={[styles.text, { color: c.ink }]}>Nothing was planned for today. Tomorrow is a fresh start.</Text>
          )}
          {s.missed.slice(0, 3).map((id) => {
            const e = byId.get(id);
            return e ? (
              <View key={id} style={styles.missedRow}>
                <Text numberOfLines={1} style={[styles.text, styles.grow, { color: c.ink }]}>&quot;{e.title}&quot; didn&apos;t happen. No penalty.</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Move ${e.title} to tomorrow`} onPress={() => moveToTomorrow(e)} style={[styles.smallButton, { backgroundColor: c.chip, boxShadow: c.raisedSm }]}>
                  <Text style={[styles.smallButtonText, { color: c.ink }]}>Tomorrow</Text>
                </Pressable>
              </View>
            ) : null;
          })}
        </View>

        {s.overrun !== null && Math.abs(s.overrun) >= 0.1 && (
          <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raised }]}>
            <Text style={[styles.cardLabel, { color: c.muted }]}>Plan vs. actual</Text>
            <Text style={[styles.text, { color: c.ink }]}>
              {s.overrun > 0
                ? `Your focused tasks ran ${Math.round(s.overrun * 100)}% longer than planned. Give tomorrow's blocks a little more room.`
                : `You finished ${Math.round(-s.overrun * 100)}% faster than planned. You can plan tighter tomorrow.`}
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: LAYER_COLORS.yellow.fill, boxShadow: c.raised }]}>
          <Text style={[styles.cardLabel, { color: LAYER_COLORS.yellow.ink }]}>Tomorrow&apos;s first task. At 9:00 AM, I will…</Text>
          <TextInput
            value={firstTask}
            onChangeText={setFirstTask}
            placeholder="e.g. Finish the timeline gestures"
            placeholderTextColor="rgba(42,31,0,0.55)"
            maxLength={200}
            accessibilityLabel="Tomorrow's first task"
            style={[styles.input, { backgroundColor: c.tray, color: c.ink, boxShadow: c.pressedIn }]}
          />
        </View>

        {best && (
          <View style={[styles.card, { backgroundColor: c.ink }]}>
            <Text style={[styles.cardLabel, { color: c.accent }]}>BEST MOMENT</Text>
            <Text style={[styles.best, { color: c.panel }]}>
              {best.title}
              {(focused.get(best.id) ?? 0) >= MINUTE ? `: ${Math.round((focused.get(best.id) ?? 0) / MINUTE)} minutes of focus` : ''}
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable accessibilityRole="button" onPress={finish} style={[styles.closeDay, { backgroundColor: c.accent, boxShadow: c.selected }]}>
        <Text style={[styles.closeDayText, { color: c.accentInk }]}>{closed ? 'Done' : `Close the day · +${REVIEW_XP} XP`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  date: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 27, fontWeight: '600' },
  closeButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 24, fontWeight: '700' },
  body: { padding: 16, gap: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', borderRadius: 22, padding: 12 },
  tileLabel: { fontSize: 12, fontWeight: '700' },
  tileValue: { fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  card: { borderRadius: 22, padding: 14, gap: 10 },
  cardLabel: { fontSize: 12, fontWeight: '700' },
  path: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  node: { width: 22, height: 22, borderRadius: 11 },
  text: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  grow: { flex: 1 },
  missedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallButton: { height: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' },
  smallButtonText: { fontSize: 12.5, fontWeight: '700' },
  input: { height: 46, borderRadius: 14, paddingHorizontal: 12, fontSize: 15, fontWeight: '600' },
  best: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  closeDay: { marginHorizontal: 16, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeDayText: { fontSize: 16, fontWeight: '700' },
});
