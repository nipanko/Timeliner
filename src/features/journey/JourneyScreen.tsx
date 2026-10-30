import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { badges, badgeStats } from '@/core/game/badges';
import { useEntries, useLayers, type Entry } from '@/features/entries/data';
import { useFocusedByEntry } from '@/features/focus/data';
import { useNow } from '@/hooks/useNow';
import { usePalette, type Palette } from '@/ui/theme';

import { addMilestone, deleteMilestone, setMilestoneReached, useMilestones, type Milestone } from './data';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const isGoal = (e: Entry) => e.kind === 'task' && (e.granularity === 'month' || e.granularity === 'year');

/** Goals branch off your timeline; milestones are their stops (DESIGN.md §3.5, RESEARCH.md #21). */
export function JourneyScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const entries = useEntries();
  const layers = useLayers();
  const focused = useFocusedByEntry(now);
  const all = useMilestones();
  const [tab, setTab] = useState<'goals' | 'badges'>('goals');
  const goals = entries.filter(isGoal).sort((a, b) => a.start - b.start);
  const list = badges(badgeStats(entries.map((e) => ({ ...e, focusedMs: focused.get(e.id) })), now));

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: c.ink }]}>Journey</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close journey" onPress={close} style={[styles.closeButton, { backgroundColor: c.panel, boxShadow: c.raised }]}>
          <Text style={[styles.closeText, { color: c.ink }]}>×</Text>
        </Pressable>
      </View>

      <View style={[styles.tabs, { backgroundColor: c.panel, boxShadow: c.raised }]}>
        {(['goals', 'badges'] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { backgroundColor: c.accent, boxShadow: c.selected }]}
          >
            <Text style={[styles.tabText, { color: tab === t ? c.accentInk : c.ink }]}>{t === 'goals' ? 'Goals' : 'Badges'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {tab === 'goals' ? (
          <>
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} stops={all.filter((m) => m.goalId === g.id)} color={layers.find((l) => l.id === g.layerId)?.color.strong ?? c.accent} c={c} />
            ))}
            {!goals.length && <Text style={[styles.empty, { color: c.ink }]}>A goal is a task for a whole month or year. Add one, then break it into milestones.</Text>}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/entry/[id]', params: { id: 'new', at: String(Date.now()), scale: 'year' } })}
              style={[styles.newGoal, { backgroundColor: c.panel, boxShadow: c.raised }]}
            >
              <Text style={[styles.tabText, { color: c.ink }]}>+ New goal</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.grid}>
            {list.map((b) => (
              <View key={b.id} style={[styles.badge, { backgroundColor: c.panel, boxShadow: c.raised, opacity: b.earned ? 1 : 0.75 }]} accessible accessibilityLabel={`${b.name}, ${b.desc}, ${b.earned ? 'earned' : `${Math.round(b.progress * 100)} percent`}`}>
                <View style={[styles.coin, { backgroundColor: b.earned ? '#F5C342' : c.chip }]}>
                  <Text style={[styles.coinText, { color: b.earned ? '#4A3A00' : c.muted }]}>{b.earned ? '★' : `${Math.round(b.progress * 100)}%`}</Text>
                </View>
                <Text style={[styles.badgeName, { color: c.ink }]}>{b.name}</Text>
                <Text style={[styles.badgeDesc, { color: c.muted }]}>{b.desc}</Text>
                {!b.earned && (
                  <View style={[styles.track, { backgroundColor: c.chip }]}>
                    <View style={[styles.fill, { width: `${b.progress * 100}%`, backgroundColor: c.accent }]} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
      <Text style={[styles.badgeDesc, { color: c.muted }]}>{stops.length ? `${reached} of ${stops.length} milestones` : 'No milestones yet'}</Text>

      <View style={[styles.branch, { borderLeftColor: color }]}>
        {stops.map((m) => {
          const done = m.doneAt !== null;
          return (
            <View key={m.id} style={styles.stopRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={m.title}
                onPress={() => setMilestoneReached(m, !done)}
                style={styles.stopHit}
              >
                <View style={[styles.stop, done ? { backgroundColor: color } : { borderWidth: 3, borderColor: color, backgroundColor: c.tray }]} />
                <Text style={[styles.stopText, { color: c.ink }, done && styles.struck]}>{m.title}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.title}`} onPress={() => deleteMilestone(m)} style={styles.remove}>
                <Text style={[styles.removeText, { color: c.muted }]}>×</Text>
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
          <Text style={[styles.addText, { color: c.accentInk }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '600' },
  closeButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 24, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 3, padding: 4, borderRadius: 18, marginHorizontal: 16, marginTop: 10 },
  tab: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13.5, fontWeight: '700' },
  body: { padding: 16, gap: 12 },
  empty: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  newGoal: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  goal: { borderRadius: 22, padding: 14, gap: 8 },
  goalWhen: { fontSize: 12, fontWeight: '700' },
  goalTitle: { fontSize: 19, fontWeight: '600' },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  branch: { borderLeftWidth: 4, marginLeft: 10, paddingLeft: 4, gap: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'center' },
  stopHit: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: -17 },
  stop: { width: 22, height: 22, borderRadius: 11 },
  stopText: { flex: 1, fontSize: 14, fontWeight: '600' },
  struck: { textDecorationLine: 'line-through', opacity: 0.6 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 44, borderRadius: 14, paddingHorizontal: 12, fontSize: 14, fontWeight: '600' },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 22, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { flexGrow: 1, flexBasis: '30%', borderRadius: 20, padding: 10, alignItems: 'center', gap: 4 },
  coin: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  coinText: { fontSize: 15, fontWeight: '700' },
  badgeName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badgeDesc: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
