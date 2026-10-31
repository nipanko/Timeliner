import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { occurrenceId, occurrences, parseRepeat } from '@/core/entries/repeat';
import { focusedMs } from '@/core/game/focus';
import { DAY, floorUnit } from '@/core/time/units';
import { setEntryDone, useEntry, useLayers, type Entry } from '@/features/entries/data';
import { Tick } from '@/features/game/Tick';
import { addToInbox } from '@/features/inbox/data';
import { useNow } from '@/hooks/useNow';
import { cancelFocusEnd, scheduleFocusEnd } from '@/lib/notifications';
import { ProgressFill } from '@/ui/motion';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { endSession, pauseSession, resumeSession, startSession, useSessions } from './data';

const mmss = (ms: number) => {
  const t = Math.ceil(Math.abs(ms) / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** A repeating entry is finished for today's occurrence (the one closest to now); others as a whole. */
function currentOccurrence(entry: Entry, now: number) {
  const rule = parseRepeat(entry.repeat);
  if (!rule) return entry;
  const length = entry.end === null ? 0 : entry.end - entry.start;
  const day = floorUnit(now, 'day');
  const today = occurrences(entry.start, length, rule, day, day + DAY);
  const at = today.reduce((best, t) => (Math.abs(t - now) < Math.abs(best - now) ? t : best), today[0] ?? now);
  return { id: occurrenceId(entry.id, at), start: at, seriesId: entry.id };
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** One task only (RESEARCH.md #7): countdown of its planned length, pause, done. */
export function FocusScreen({ id }: { id: string }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(250);
  const entry = useEntry(id);
  const layer = useLayers().find((l) => l.id === entry?.layerId);
  const sessions = useSessions().filter((s) => s.entryId === id);
  if (!entry || entry.end === null) return <View style={[styles.screen, { backgroundColor: c.ground }]} />;

  const active = sessions.find((s) => s.endedAt === null);
  const planned = entry.end - entry.start;
  const focused = sessions.reduce((sum, s) => sum + focusedMs(s, now), 0);
  const left = planned - focused;
  const paused = active?.pausedAt != null;

  const start = async () => {
    await startSession(id);
    await scheduleFocusEnd(id, entry.title, Date.now() + Math.max(0, left));
  };
  const togglePause = async () => {
    if (!active) return;
    if (paused) {
      await resumeSession(active);
      await scheduleFocusEnd(id, entry.title, Date.now() + Math.max(0, left));
    } else {
      await pauseSession(active);
      await cancelFocusEnd(id);
    }
  };
  const finish = async (done: boolean) => {
    if (active) await endSession(active);
    await cancelFocusEnd(id);
    if (done) await setEntryDone(currentOccurrence(entry, Date.now()), true);
    close();
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Pressable accessibilityRole="button" onPress={() => finish(false)} style={({ pressed }) => [styles.back, { backgroundColor: c.panel, boxShadow: c.raised }, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={17} color={c.ink} />
        <Text style={[styles.backText, { color: c.ink }]}>{active ? 'Stop' : 'Timeline'}</Text>
      </Pressable>

      <View style={styles.middle}>
        <Tick size={72} mood={active && !paused ? 'focused' : 'happy'} />
        {layer && (
          <Text style={[styles.layer, { backgroundColor: layer.color.fill, color: layer.color.ink }]}>{layer.name}</Text>
        )}
        <Text style={[styles.title, { color: c.ink }]}>{entry.title}</Text>
        <View style={[styles.dial, { backgroundColor: c.panel, boxShadow: active && !paused ? c.selected : c.raised }]} accessible accessibilityLabel={`${left >= 0 ? mmss(left) + ' left' : mmss(left) + ' over time'}`}>
          <Text style={[styles.time, { color: c.ink }]}>{left >= 0 ? mmss(left) : `+${mmss(left)}`}</Text>
          <Text style={[styles.sub, { color: c.muted }]}>{!active ? 'ready' : paused ? 'paused' : left >= 0 ? 'left' : 'over time, wrap up'}</Text>
          <View style={[styles.track, { backgroundColor: c.chip, boxShadow: c.pressedIn }]}>
            <ProgressFill value={focused / planned} colors={c.gradient} />
          </View>
        </View>
      </View>

      <ParkThought />

      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          onPress={active ? togglePause : start}
          style={({ pressed }) => [styles.button, { backgroundColor: c.panel, boxShadow: c.raised }, pressed && styles.pressed]}
        >
          <Ionicons name={active && !paused ? 'pause' : 'play'} size={18} color={c.ink} />
          <Text style={[styles.buttonText, { color: c.ink }]}>{active ? (paused ? 'Resume' : 'Pause') : focused > 0 ? 'Focus again' : 'Start'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => finish(true)} style={({ pressed }) => [styles.primary, { boxShadow: c.glow }, pressed && styles.pressed]}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryFill}>
            <Ionicons name="checkmark" size={20} color={c.accentInk} />
            <Text style={[styles.buttonText, { color: c.accentInk }]}>Done</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

/** Park a stray thought without leaving focus (RESEARCH.md #6): it waits in the Inbox. */
function ParkThought() {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parked, setParked] = useState(false);
  const park = async () => {
    if (!text.trim()) return;
    await addToInbox(text);
    setText('');
    setOpen(false);
    setParked(true);
    setTimeout(() => setParked(false), 1800);
  };

  if (!open) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={({ pressed }) => [styles.park, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}>
        <Ionicons name={parked ? 'checkmark-circle' : 'file-tray-outline'} size={17} color={parked ? c.accentText : c.muted} />
        <Text style={[styles.parkText, { color: parked ? c.accentText : c.muted }]}>{parked ? 'Parked in your Inbox' : 'Park a thought'}</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.parkRow, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={park}
        autoFocus
        maxLength={200}
        placeholder="Write it down, then back to focus"
        placeholderTextColor={c.muted}
        accessibilityLabel="Thought to park"
        style={[styles.parkInput, { color: c.ink }]}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Park it" onPress={park} style={({ pressed }) => [styles.parkSave, { backgroundColor: c.accent }, pressed && styles.pressed]}>
        <Ionicons name="arrow-up" size={18} color={c.accentInk} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  back: { alignSelf: 'flex-start', height: 44, paddingLeft: 10, paddingRight: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 14, fontFamily: F.bold },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  layer: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, fontSize: 12.5, fontFamily: F.bold },
  title: { fontSize: 26, fontFamily: F.display, letterSpacing: -0.5, textAlign: 'center' },
  dial: { width: 270, height: 270, borderRadius: 135, alignItems: 'center', justifyContent: 'center', gap: 6 },
  time: { fontSize: 60, fontFamily: F.display, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  sub: { fontSize: 13, fontFamily: F.bold },
  track: { width: 170, height: 10, borderRadius: 6, overflow: 'hidden', marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, height: 58, borderRadius: 18, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 1.6, height: 58, borderRadius: 18, overflow: 'hidden' },
  primaryFill: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  park: { alignSelf: 'center', height: 44, paddingHorizontal: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  parkText: { fontSize: 13.5, fontFamily: F.semi },
  parkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, padding: 6, paddingLeft: 14, marginBottom: 14 },
  parkInput: { flex: 1, height: 44, fontSize: 15, fontFamily: F.semi },
  parkSave: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
