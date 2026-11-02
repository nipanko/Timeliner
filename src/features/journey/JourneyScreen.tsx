import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { useEntries, useLayers, type Entry } from '@/features/entries/data';
import { CollectCard } from '@/features/game/CollectCard';
import { useProgress } from '@/features/game/useProgress';
import { Reveal, ScrollScreen } from '@/ui/ScrollScreen';
import { usePalette, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';

import { addMilestone, deleteMilestone, setMilestoneReached, useMilestones, type Milestone } from './data';

const isGoal = (e: Entry) => e.kind === 'task' && (e.granularity === 'month' || e.granularity === 'year');

/** Goals branch off your timeline; milestones are their stops (DESIGN.md §3.5, RESEARCH.md #21). */
export function JourneyScreen() {
  const c = usePalette();
  const entries = useEntries();
  const layers = useLayers();
  const all = useMilestones();
  const { badges } = useProgress();
  // `/journey?tab=cards` opens the collection (the card reveal links here).
  const [tab, setTab] = useState<'goals' | 'cards'>(useLocalSearchParams<{ tab?: string }>().tab === 'cards' ? 'cards' : 'goals');
  const cardW = Math.floor((Math.min(useWindowDimensions().width, 720) - 32 - 20) / 3);
  const closest = badges.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress)[0];
  const goals = entries.filter(isGoal).sort((a, b) => a.start - b.start);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <ScrollScreen title="Journey" subtitle={`${goals.length} goal${goals.length === 1 ? '' : 's'} · ${earned} of ${badges.length} cards`}>
      <View style={[styles.tabs, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
        {(['goals', 'cards'] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={({ pressed }) => [styles.tab, tab === t && { backgroundColor: c.accent, boxShadow: c.selected }, pressed && styles.pressed]}
          >
            <Ionicons name={t === 'goals' ? 'flag' : 'albums'} size={15} color={tab === t ? c.accentInk : c.muted} />
            <Text style={[styles.tabText, { color: tab === t ? c.accentInk : c.muted }]}>{t === 'goals' ? 'Goals' : 'Cards'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'goals' ? (
        <>
          {goals.map((g, i) => (
            <Reveal key={g.id} index={i}>
              <GoalCard goal={g} stops={all.filter((m) => m.goalId === g.id)} color={layers.find((l) => l.id === g.layerId)?.color.strong ?? c.accentText} c={c} />
            </Reveal>
          ))}
          {!goals.length && <Text style={[styles.empty, { color: c.ink }]}>A goal is a task for a whole month or year. Add one, then break it into milestones.</Text>}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/entry/[id]', params: { id: 'new', scale: 'year' } })}
            style={({ pressed }) => [styles.newGoal, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}
          >
            <Ionicons name="add-circle" size={18} color={c.accentText} />
            <Text style={[styles.tabText, { color: c.ink }]}>New goal</Text>
          </Pressable>
        </>
      ) : (
        <>
          {closest && (
            <Text style={[styles.empty, { color: c.muted }]}>
              Closest next card: <Text style={{ color: c.ink }}>{closest.name}</Text> · {closest.desc} ({Math.round(closest.progress * 100)}%)
            </Text>
          )}
          <View style={styles.grid}>
            {badges.map((b, i) => (
              <Reveal key={b.id} index={i}>
                <CollectCard card={b} width={cardW} c={c} />
              </Reveal>
            ))}
          </View>
        </>
      )}
    </ScrollScreen>
  );
}

function GoalCard({ goal, stops, color, c }: { goal: Entry; stops: Milestone[]; color: string; c: Palette }) {
  const [title, setTitle] = useState('');
  const reached = stops.filter((m) => m.doneAt !== null).length;
  const when =
    goal.granularity === 'year'
      ? String(new Date(goal.start).getFullYear())
      : new Date(goal.start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const add = async () => {
    const t = title.trim();
    if (!t) return;
    await addMilestone(goal.id, t, stops.length);
    setTitle('');
  };

  return (
    <View style={[styles.goal, { backgroundColor: c.panel, boxShadow: c.raised }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit goal ${goal.title}`} onPress={() => router.push({ pathname: '/entry/[id]', params: { id: goal.id } })}>
        <Text style={[styles.goalWhen, { color: c.muted }]}>{when}{goal.done ? ' · reached' : ''}</Text>
        <Text style={[styles.goalTitle, { color: c.ink }]}>{goal.title}</Text>
      </Pressable>
      <View style={[styles.track, { backgroundColor: c.chip }]}>
        <View style={[styles.fill, { width: `${stops.length ? (reached / stops.length) * 100 : 0}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.goalMeta, { color: c.muted }]}>{stops.length ? `${reached} of ${stops.length} milestones` : 'No milestones yet'}</Text>

      <View style={[styles.branch, { borderLeftColor: color }]}>
        {stops.map((m) => {
          const done = m.doneAt !== null;
          return (
            <View key={m.id} style={styles.stopRow}>
              <Pressable
                accessibilityRole="checkbox"
                aria-checked={done}
                accessibilityLabel={m.title}
                onPress={() => setMilestoneReached(m, !done)}
                style={styles.stopHit}
              >
                <View style={[styles.stop, done ? { backgroundColor: color } : { borderWidth: 3, borderColor: color, backgroundColor: c.tray }]} />
                <Text style={[styles.stopText, { color: c.ink }, done && styles.struck]}>{m.title}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.title}`} onPress={() => deleteMilestone(m)} style={styles.remove}>
                <Ionicons name="close" size={18} color={c.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.addRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={add}
          placeholder="Add a milestone"
          placeholderTextColor={c.muted}
          maxLength={120}
          accessibilityLabel={`New milestone for ${goal.title}`}
          style={[styles.input, { backgroundColor: c.tray, color: c.ink, boxShadow: c.pressedIn }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Add milestone" onPress={add} style={[styles.addButton, { backgroundColor: c.accent, boxShadow: c.selected }]}>
          <Ionicons name="add" size={22} color={c.accentInk} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 3, padding: 4, borderRadius: 18 },
  tab: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13.5, fontFamily: F.bold },
  empty: { fontSize: 14, fontFamily: F.text, lineHeight: 20 },
  newGoal: { height: 52, borderRadius: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  goal: { borderRadius: 22, padding: 16, gap: 10 },
  goalWhen: { fontSize: 11, fontFamily: F.bold, letterSpacing: 1 },
  goalTitle: { fontSize: 20, fontFamily: F.display },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  goalMeta: { fontSize: 11, fontFamily: F.text },
  fill: { height: '100%', borderRadius: 5 },
  branch: { borderLeftWidth: 3, marginLeft: 10, paddingLeft: 4, gap: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'center' },
  stopHit: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: -17 },
  stop: { width: 22, height: 22, borderRadius: 11 },
  stopText: { flex: 1, fontSize: 14, fontFamily: F.semi },
  struck: { textDecorationLine: 'line-through', opacity: 0.6 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 44, borderRadius: 14, paddingHorizontal: 12, fontSize: 14, fontFamily: F.text },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, rowGap: 14 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
