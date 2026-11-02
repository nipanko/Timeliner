import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_GRANULARITY, entryTiming, nudge, type EntryKind, type Granularity } from '@/core/entries/timing';
import { formatRepeat, parseRepeat, repeatLabel } from '@/core/entries/repeat';
import { APPROX_MS, MINUTE } from '@/core/time/units';
import { getScale, SCALES, type ScaleId } from '@/core/timeline/scales';
import { removeFromInbox } from '@/features/inbox/data';
import { useClock24 } from '@/features/settings/data';
import { KIND_ICONS, usePalette, type IconName, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';

import { deleteEntry, saveEntry, setDone, useEntry, useLayers, type Entry, type Layer } from './data';

/** `fromInbox`: the inbox item being planned; it is removed once the entry is saved. */
type Props = { id: string | null; at: number; layerId?: string; scaleId: ScaleId; title?: string; fromInbox?: string };
type Form = { kind: EntryKind; title: string; granularity: Granularity; at: number; lengthMin: number; layerId: string; repeat: string | null };

type RepeatChoice = 'never' | 'daily' | 'weekdays' | 'weekly' | 'custom';
const REPEAT_CHOICES: [RepeatChoice, string][] = [['never', 'Never'], ['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekly', 'Weekly'], ['custom', 'Custom']];
const DAY_LETTERS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']];

/** "every day", "on weekdays", "every Mon, Wed" for the plan sentence. */
const repeatPhrase = (label: string) => (label === 'Daily' ? 'every day' : label === 'Weekdays' || label === 'Weekends' ? `on ${label.toLowerCase()}` : `every ${label}`);

/** Which chip a stored rule shows as. "Weekly" means: on the same weekday as the entry's date. */
function repeatChoice(text: string | null, at: number): RepeatChoice {
  const rule = parseRepeat(text);
  if (!rule) return 'never';
  if (rule.kind === 'daily') return 'daily';
  if (rule.days.join(',') === '1,2,3,4,5') return 'weekdays';
  if (rule.days.length === 1 && rule.days[0] === new Date(at).getDay()) return 'weekly';
  return 'custom';
}

const KINDS: [EntryKind, string][] = [['task', 'Task'], ['todo', 'Todo'], ['note', 'Note'], ['reminder', 'Reminder']];
const GRANULARITIES: [Granularity, string][] = [['moment', 'Time'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];
const LENGTHS = [5, 15, 25, 45, 60, 90];
const VERB: Record<EntryKind, string> = { task: 'I will', todo: 'I will', note: 'I note:', reminder: 'remind me to' };

export function EntrySheet({ id, at, layerId, scaleId, title, fromInbox }: Props) {
  const c = usePalette();
  const existing = useEntry(id);
  const layers = useLayers();
  if (!layers.length || (id && !existing)) return <View style={[styles.screen, { backgroundColor: c.panel }]} />;
  const initial = existing ? fromEntry(existing) : { ...newForm(at, layerId, scaleId, layers), title: title ?? '' };
  return <EntryForm key={existing?.id ?? 'new'} id={id} done={existing?.done ?? false} initial={initial} layers={layers} fromInbox={fromInbox} />;
}

function newForm(at: number, layerId: string | undefined, scaleId: ScaleId, layers: Layer[]): Form {
  const scale = SCALES.find((s) => s.id === scaleId) ?? getScale('hour');
  const taskMin = (APPROX_MS[scale.taskLength.unit] * scale.taskLength.step) / MINUTE;
  const nearest = LENGTHS.reduce((best, m) => (Math.abs(m - taskMin) < Math.abs(best - taskMin) ? m : best));
  const layer = layers.find((l) => l.id === layerId) ?? layers.find((l) => l.visible) ?? layers[0];
  return { kind: 'task', title: '', granularity: DEFAULT_GRANULARITY[scale.id], at, lengthMin: nearest, layerId: layer.id, repeat: null };
}

function fromEntry(e: Entry): Form {
  const lengthMin = e.end !== null && e.granularity === 'moment' ? Math.round((e.end - e.start) / MINUTE) : 25;
  return { kind: e.kind, title: e.title, granularity: e.granularity, at: e.start, lengthMin, layerId: e.layerId, repeat: e.repeat };
}

function whenLabel(g: Granularity, t: number, h24: boolean): string {
  if (g === 'moment') return new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: !h24 });
  if (g === 'day') return new Date(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  if (g === 'week') return `Week of ${new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  if (g === 'month') return new Date(t).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return String(new Date(t).getFullYear());
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function EntryForm({ id, done, initial, layers, fromInbox }: { id: string | null; done: boolean; initial: Form; layers: Layer[]; fromInbox?: string }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  const h24 = useClock24();
  const granularity = form.kind === 'reminder' ? 'moment' : form.granularity;
  const { start, end } = entryTiming(form.kind, granularity, form.at, form.lengthMin);
  const layer = layers.find((l) => l.id === form.layerId) ?? layers[0];
  const when = whenLabel(granularity, start, h24);
  const title = form.title.trim();
  const lead = granularity === 'moment' ? `At ${when}` : granularity === 'week' ? `In the ${when.replace('Week', 'week')}` : `${granularity === 'day' ? 'On' : 'In'} ${when}`;
  // Notes don't repeat; weeks, months and years are goals, not routines.
  const canRepeat = form.kind !== 'note' && (granularity === 'moment' || granularity === 'day');
  const rule = canRepeat ? parseRepeat(form.repeat) : null;
  // Picking Custom keeps the day picker open even when the days happen to match another choice.
  const [custom, setCustom] = useState(() => repeatChoice(initial.repeat, initial.at) === 'custom');
  const choice = custom ? 'custom' : repeatChoice(rule ? form.repeat : null, form.at);
  const pickRepeat = (next: RepeatChoice) => {
    setCustom(next === 'custom');
    const weekday = new Date(form.at).getDay();
    const text = { never: null, daily: 'daily', weekdays: 'weekly:1,2,3,4,5', weekly: `weekly:${weekday}`, custom: rule?.kind === 'weekly' ? form.repeat : `weekly:${weekday}` }[next];
    set({ repeat: text });
  };
  const toggleDay = (d: number) => {
    const days = rule?.kind === 'weekly' ? rule.days : rule?.kind === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [];
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    set({ repeat: next.length ? formatRepeat({ kind: 'weekly', days: next }) : null });
  };
  const lengths = LENGTHS.includes(form.lengthMin) ? LENGTHS : [...LENGTHS, form.lengthMin].sort((a, b) => a - b);

  const save = async () => {
    if (!title) return;
    await saveEntry(id, { layerId: layer.id, kind: form.kind, title, start, end, granularity, repeat: canRepeat ? form.repeat : null });
    if (fromInbox) await removeFromInbox(fromInbox);
    close();
  };
  const toggleDone = async () => {
    if (!id) return;
    await setDone(id, !done);
    close();
  };
  const remove = async () => {
    if (!id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteEntry(id);
    close();
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.panel, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={close} style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: c.muted }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.heading, { color: c.ink }]}>{id ? 'Edit entry' : 'New entry'}</Text>
        {id ? (
          <Pressable accessibilityRole="button" onPress={remove} style={styles.textButton}>
            <Text style={[styles.textButtonLabel, { color: confirmDelete ? c.danger : c.muted }]}>{confirmDelete ? 'Tap to delete' : 'Delete'}</Text>
          </Pressable>
        ) : (
          <View style={styles.textButton} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          {KINDS.map(([k, label]) => (
            <Chip key={k} c={c} label={label} icon={KIND_ICONS[k]} on={form.kind === k} onPress={() => set({ kind: k })} tall />
          ))}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.muted }]}>{form.kind === 'note' ? 'Note' : form.kind === 'reminder' ? 'Remind me to' : 'What will you do?'}</Text>
          <TextInput
            value={form.title}
            onChangeText={(t) => set({ title: t })}
            placeholder={form.kind === 'note' ? 'e.g. Idea: radial clock view' : form.kind === 'reminder' ? 'e.g. Drink water' : 'e.g. Write the devlog'}
            placeholderTextColor={c.muted}
            maxLength={200}
            autoFocus={!id}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="Title"
            style={[styles.input, { backgroundColor: c.tray, color: c.ink, boxShadow: c.pressedIn }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.muted }]}>When</Text>
          <View style={styles.whenRow}>
            <Chip c={c} label="‹" a11y="Earlier" onPress={() => set({ at: nudge(form.at, granularity, -1) })} square />
            <Text style={[styles.when, { color: c.ink }]}>{when}</Text>
            <Chip c={c} label="›" a11y="Later" onPress={() => set({ at: nudge(form.at, granularity, 1) })} square />
          </View>
          {form.kind !== 'reminder' && (
            <View style={[styles.row, styles.segment, { backgroundColor: c.chip, boxShadow: c.pressedIn }]}>
              {GRANULARITIES.map(([g, label]) => (
                <Chip key={g} c={c} label={label} on={granularity === g} onPress={() => set({ granularity: g })} flat />
              ))}
            </View>
          )}
        </View>

        {form.kind === 'task' && granularity === 'moment' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.muted }]}>Length</Text>
            <View style={styles.row}>
              {lengths.map((m) => (
                <Chip key={m} c={c} label={`${m}m`} a11y={`${m} minutes`} on={form.lengthMin === m} onPress={() => set({ lengthMin: m })} />
              ))}
            </View>
          </View>
        )}

        {canRepeat && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.muted }]}>Repeat</Text>
            <View style={styles.row}>
              {REPEAT_CHOICES.map(([k, label]) => (
                <Chip key={k} c={c} label={label} a11y={`Repeat: ${label}`} on={choice === k} onPress={() => pickRepeat(k)} />
              ))}
            </View>
            {choice === 'custom' && (
              <View style={styles.row}>
                {DAY_LETTERS.map(([d, letter, name]) => (
                  <Chip key={d} c={c} label={letter} a11y={name} square on={rule?.kind === 'daily' || (rule?.kind === 'weekly' && rule.days.includes(d))} onPress={() => toggleDay(d)} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.muted }]}>Layer</Text>
          <View style={styles.row}>
            {layers.map((l) => (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityState={{ selected: l.id === layer.id }}
                onPress={() => set({ layerId: l.id })}
                style={[styles.layerChip, { backgroundColor: l.color.fill, borderColor: l.id === layer.id ? l.color.ink : l.color.fill, boxShadow: c.raisedSm }]}
              >
                <Ionicons name={l.icon} size={14} color={l.color.ink} />
                <Text style={[styles.chipText, { color: l.color.ink }]}>{l.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.plan, { backgroundColor: layer.color.fill, boxShadow: c.raised }]}>
          <Text style={[styles.planLabel, { color: layer.color.ink }]}>YOUR PLAN</Text>
          <Text style={[styles.planText, { color: layer.color.ink }]}>
            {lead}, in {layer.name}, {VERB[form.kind]} {title || '…'}
            {rule ? `, ${repeatPhrase(repeatLabel(rule))}` : ''}
          </Text>
        </View>
      </ScrollView>

      {id && form.kind === 'task' && granularity === 'moment' && !done && (
        <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/focus/[id]', params: { id } })} style={[styles.doneButton, { backgroundColor: c.chip, boxShadow: c.raisedSm }]}>
          <Text style={[styles.saveText, { color: c.ink }]}>Focus on this</Text>
        </Pressable>
      )}
      {/* A repeating entry is completed per day on the timeline, not here. */}
      {id && !initial.repeat && (
        <Pressable accessibilityRole="button" onPress={toggleDone} style={[styles.doneButton, { backgroundColor: c.chip, boxShadow: c.raisedSm }]}>
          <Text style={[styles.saveText, { color: c.ink }]}>{done ? 'Mark not done' : 'Mark done'}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !title }}
        disabled={!title}
        onPress={save}
        style={[styles.save, { backgroundColor: c.accent, boxShadow: c.selected, opacity: title ? 1 : 0.45 }]}
      >
        <Text style={[styles.saveText, { color: c.accentInk }]}>{id ? 'Save' : 'Add to timeline'}</Text>
      </Pressable>
    </View>
  );
}

type ChipProps = { c: Palette; label: string; icon?: IconName; a11y?: string; on?: boolean; onPress: () => void; tall?: boolean; flat?: boolean; square?: boolean };

function Chip({ c, label, icon, a11y, on = false, onPress, tall, flat, square }: ChipProps) {
  const color = on ? c.accentInk : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        tall && styles.tallChip,
        square && styles.squareChip,
        on ? { backgroundColor: c.accent, boxShadow: c.selected } : flat ? null : { backgroundColor: c.panel, boxShadow: c.raisedSm },
        pressed && styles.pressed,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={color} />}
      <Text style={[styles.chipText, square && styles.arrow, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }, // a sheet, not a full-width page, on wide screens
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10 },
  textButton: { minWidth: 96, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  textButtonLabel: { fontSize: 14, fontFamily: F.bold },
  heading: { fontSize: 20, fontFamily: F.semi },
  body: { padding: 16, gap: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: { flexWrap: 'nowrap', gap: 3, padding: 4, borderRadius: 18 },
  field: { gap: 8 },
  label: { fontSize: 12, fontFamily: F.bold },
  input: { height: 50, borderRadius: 16, paddingHorizontal: 14, fontSize: 16, fontFamily: F.semi },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  when: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: F.semi },
  chip: { flexGrow: 1, minWidth: 44, height: 44, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tallChip: { height: 64, flexBasis: 0, borderRadius: 18, gap: 4 },
  squareChip: { flexGrow: 0, width: 44 },
  chipText: { fontSize: 12.5, fontFamily: F.bold },
  arrow: { fontSize: 22, lineHeight: 26 },
  layerChip: { flexGrow: 1, height: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 3, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  plan: { borderRadius: 22, padding: 14, gap: 4, transform: [{ rotate: '-1deg' }] },
  planLabel: { fontSize: 11, fontFamily: F.bold, letterSpacing: 1 },
  planText: { fontSize: 15, fontFamily: F.bold, lineHeight: 21 },
  save: { marginHorizontal: 16, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  doneButton: { marginHorizontal: 16, marginBottom: 10, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.96 }] },
});
