import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { summarizeDay } from '@/core/game/review';
import { REVIEW_XP } from '@/core/game/xp';
import { addUnit, floorUnit, HOUR, MINUTE } from '@/core/time/units';
import { saveEntry, useEntries, useLayers, type Entry } from '@/features/entries/data';
import { useFocusedByEntry } from '@/features/focus/data';
import { useProgress } from '@/features/game/useProgress';
import { useNow } from '@/hooks/useNow';
import { Reveal, ScrollScreen } from '@/ui/ScrollScreen';
import { LAYER_COLORS, usePalette, type IconName } from '@/ui/theme';
import { F } from '@/ui/type';

import { closeDay, useReviewedDays } from './data';

const duration = (ms: number) => `${Math.floor(ms / HOUR)}h ${Math.round((ms % HOUR) / MINUTE)}m`;

/** End-of-day run (DESIGN.md §3.4): wins first, gaps without blame, tomorrow's first task, ends on the best moment. */
export function ReviewScreen() {
  const c = usePalette();
  const now = useNow(60_000);
  const entries = useEntries();
  const layers = useLayers();
  const focused = useFocusedByEntry(now);
  const reviewed = useReviewedDays();
  const { streak } = useProgress();
  const [firstTask, setFirstTask] = useState('');

  const today = floorUnit(now, 'day');
  const tomorrow = addUnit(today, 'day', 1);
  const s = summarizeDay(entries, focused, today, tomorrow, now);
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
    setFirstTask('');
    await closeDay(today);
  };

  const tiles: [IconName, string, string][] = [
    ['checkmark-done', 'Tasks done', `${s.done}/${s.total}`],
    ['timer', 'Focused', duration(s.focusedMs)],
    ['flash', 'XP earned', `+${s.xp}`],
    ['flame', 'Streak', `${streak.days}d`],
  ];

  const footer = (
    <View style={styles.footer}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: closed && !firstTask.trim() }}
        onPress={finish}
        style={({ pressed }) => [styles.closeDay, { boxShadow: closed ? c.raisedSm : c.glow }, pressed && styles.pressed]}
      >
        {closed && !firstTask.trim() ? (
          <View style={[styles.closeDayFill, { backgroundColor: c.panel }]}>
            <Ionicons name="checkmark-circle" size={18} color={c.accentText} />
            <Text style={[styles.closeDayText, { color: c.ink }]}>Day closed</Text>
          </View>
        ) : (
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.closeDayFill}>
            <Ionicons name="moon" size={17} color={c.accentInk} />
            <Text style={[styles.closeDayText, { color: c.accentInk }]}>{closed ? 'Save tomorrow’s first task' : `Close the day · +${REVIEW_XP} XP`}</Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );

  return (
    <ScrollScreen title="Today's run" subtitle={new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} footer={footer}>
      <Reveal index={0}>
        <View style={styles.tiles}>
          {tiles.map(([icon, label, value]) => (
            <View key={label} style={[styles.tile, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
              <View style={styles.tileTop}>
                <Ionicons name={icon} size={15} color={c.accentText} />
                <Text style={[styles.tileLabel, { color: c.muted }]}>{label}</Text>
              </View>
              <Text style={[styles.tileValue, { color: c.ink }]}>{value}</Text>
            </View>
          ))}
        </View>
      </Reveal>

      <Reveal index={1}>
        <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
          <Text style={[styles.cardLabel, { color: c.muted }]}>THE PATH YOU WALKED</Text>
          {s.total ? (
            <View style={styles.path} accessible accessibilityLabel={`${s.done} done, ${s.missed.length} missed, ${s.total - s.done - s.missed.length} still to come`}>
              {s.path.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.node,
                    p.state === 'done'
                      ? { backgroundColor: c.accent, boxShadow: c.glow }
                      : p.state === 'missed'
                        ? { borderWidth: 2, borderStyle: 'dashed', borderColor: c.lineStrong }
                        : { borderWidth: 2, borderColor: c.lineStrong },
                  ]}
                >
                  {p.state === 'done' && <Ionicons name="checkmark" size={13} color={c.accentInk} />}
                </View>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${e.title} to tomorrow`}
                  onPress={() => moveToTomorrow(e)}
                  style={({ pressed }) => [styles.smallButton, { backgroundColor: c.chip, boxShadow: c.raisedSm }, pressed && styles.pressed]}
                >
                  <Ionicons name="arrow-forward" size={14} color={c.ink} />
                  <Text style={[styles.smallButtonText, { color: c.ink }]}>Tomorrow</Text>
                </Pressable>
              </View>
            ) : null;
          })}
        </View>
      </Reveal>

      {s.overrun !== null && Math.abs(s.overrun) >= 0.1 && (
        <Reveal index={2}>
          <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
            <Text style={[styles.cardLabel, { color: c.muted }]}>PLAN VS. ACTUAL</Text>
            <Text style={[styles.text, { color: c.ink }]}>
              {s.overrun > 0
                ? `Your focused tasks ran ${Math.round(s.overrun * 100)}% longer than planned. Give tomorrow's blocks a little more room.`
                : `You finished ${Math.round(-s.overrun * 100)}% faster than planned. You can plan tighter tomorrow.`}
            </Text>
          </View>
        </Reveal>
      )}

      <Reveal index={3}>
        <View style={[styles.card, { backgroundColor: LAYER_COLORS.yellow.fill, boxShadow: c.raisedSm }]}>
          <Text style={[styles.cardLabel, { color: LAYER_COLORS.yellow.ink }]}>TOMORROW&apos;S FIRST TASK · 9:00 AM, I WILL…</Text>
          <TextInput
            value={firstTask}
            onChangeText={setFirstTask}
            placeholder="e.g. Finish the timeline gestures"
            placeholderTextColor="rgba(42,31,0,0.55)"
            maxLength={200}
            accessibilityLabel="Tomorrow's first task"
            style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.65)', color: LAYER_COLORS.yellow.ink }]}
          />
        </View>
      </Reveal>

      {best && (
        <Reveal index={4}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { boxShadow: c.glow }]}>
            <View style={styles.tileTop}>
              <Ionicons name="trophy" size={15} color={c.accentInk} />
              <Text style={[styles.cardLabel, { color: c.accentInk }]}>BEST MOMENT</Text>
            </View>
            <Text style={[styles.best, { color: c.accentInk }]}>
              {best.title}
              {(focused.get(best.id) ?? 0) >= MINUTE ? `: ${Math.round((focused.get(best.id) ?? 0) / MINUTE)} minutes of focus` : ''}
            </Text>
          </LinearGradient>
        </Reveal>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', borderRadius: 20, padding: 14, gap: 6 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { fontSize: 12, fontFamily: F.semi },
  tileValue: { fontSize: 28, fontFamily: F.display, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  card: { borderRadius: 22, padding: 16, gap: 12 },
  cardLabel: { fontSize: 11, fontFamily: F.bold, letterSpacing: 1.1 },
  path: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  node: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontFamily: F.text, lineHeight: 20 },
  missedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallButton: { height: 40, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallButtonText: { fontSize: 12.5, fontFamily: F.bold },
  input: { height: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontFamily: F.semi },
  best: { fontSize: 17, fontFamily: F.display, lineHeight: 23 },
  footer: { paddingHorizontal: 16, paddingBottom: 6 },
  closeDay: { height: 56, borderRadius: 18, overflow: 'hidden' },
  closeDayFill: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  closeDayText: { fontSize: 16, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
