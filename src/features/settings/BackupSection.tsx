import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { parseBackup, type Backup } from '@/core/backup';
import { exportAll, replaceAll } from '@/db/backup';
import { usePalette, type IconName } from '@/ui/theme';
import { F } from '@/ui/type';

const web = Platform.OS === 'web';
const fileName = (t: number) => `timeliner-backup-${new Date(t).toISOString().slice(0, 10)}.json`;

/** Web: save the JSON as a file. Phone: the share sheet (save to Files, mail it to yourself…). */
async function saveBackup(backup: Backup) {
  const json = JSON.stringify(backup);
  if (!web) {
    await Share.share({ title: fileName(backup.exportedAt), message: json });
    return;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(backup.exportedAt);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pickFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

type Pending = { backup: Backup; summary: string };
type Note = { ok: boolean; text: string };

/** Settings › Your data: a backup file you own, and restoring from one (replaces this device's data). */
export function BackupSection() {
  const c = usePalette();
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const exportNow = async () => {
    setNote(null);
    try {
      await saveBackup(await exportAll());
      if (web) setNote({ ok: true, text: 'Backup saved to your downloads.' });
    } catch {
      setNote({ ok: false, text: 'Could not create the backup.' });
    }
  };

  const chooseFile = async () => {
    setNote(null);
    const text = await pickFile();
    if (text === null) return;
    const parsed = parseBackup(text);
    if (!parsed.ok) return setNote({ ok: false, text: parsed.error });
    const when = parsed.backup.exportedAt ? new Date(parsed.backup.exportedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'an unknown date';
    const n = parsed.counts;
    setPending({ backup: parsed.backup, summary: `Backup from ${when}: ${n.entries} entries, ${n.layers} layers, ${n.inbox} in the inbox.` });
  };

  const replace = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await saveBackup(await exportAll()); // a safety copy of what is about to be replaced
      await replaceAll(pending.backup.data);
      setNote({ ok: true, text: 'Restored. A copy of your previous data was downloaded first, just in case. Reloading…' });
      // Every screen re-reads the new data from scratch (live queries alone left some numbers stale).
      setTimeout(() => location.reload(), 1500);
    } catch {
      setNote({ ok: false, text: 'Restore failed. Nothing was changed.' });
    }
    setPending(null);
    setBusy(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
      <Row c={c} icon="download-outline" title="Export a backup" sub={web ? 'A file with all your data. Keep it somewhere safe.' : 'Share all your data as text (save it to Files or mail it to yourself).'} onPress={exportNow} />
      {web && <Row c={c} icon="push-outline" title="Restore from a backup" sub="Replaces the data on this device." onPress={chooseFile} />}

      {pending && (
        <Animated.View entering={FadeIn} style={[styles.confirm, { backgroundColor: c.tray, boxShadow: c.pressedIn }]}>
          <Text style={[styles.confirmText, { color: c.ink }]}>{pending.summary}</Text>
          <Text style={[styles.sub, { color: c.muted }]}>Everything on this device will be replaced. Your current data is downloaded first.</Text>
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={() => setPending(null)} style={({ pressed }) => [styles.button, { backgroundColor: c.chip }, pressed && styles.pressed]}>
              <Text style={[styles.buttonText, { color: c.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              aria-disabled={busy}
              onPress={busy ? undefined : replace}
              style={({ pressed }) => [styles.button, { backgroundColor: c.danger }, pressed && styles.pressed]}
            >
              <Text style={[styles.buttonText, { color: c.panel }]}>{busy ? 'Restoring…' : 'Replace my data'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {note && (
        <View style={styles.note} accessibilityLiveRegion="polite">
          <Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={note.ok ? c.accentText : c.danger} />
          <Text style={[styles.sub, styles.grow, { color: note.ok ? c.ink : c.danger }]}>{note.text}</Text>
        </View>
      )}
    </View>
  );
}

function Row({ c, icon, title, sub, onPress }: { c: ReturnType<typeof usePalette>; icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: c.chip }]}>
        <Ionicons name={icon} size={18} color={c.accentText} />
      </View>
      <View style={styles.grow}>
        <Text style={[styles.title, { color: c.ink }]}>{title}</Text>
        <Text style={[styles.sub, { color: c.muted }]}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 8, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 14, minHeight: 56 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  title: { fontSize: 15, fontFamily: F.semi },
  sub: { fontSize: 12.5, fontFamily: F.text, lineHeight: 17 },
  confirm: { borderRadius: 14, padding: 12, gap: 8, margin: 4 },
  confirmText: { fontSize: 14, fontFamily: F.semi, lineHeight: 19 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontFamily: F.bold },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  pressed: { transform: [{ scale: 0.97 }] },
});
