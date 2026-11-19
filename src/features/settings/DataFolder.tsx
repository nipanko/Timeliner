import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

type Tauri = { core: { invoke: <T>(cmd: string, args?: object) => Promise<T> }; dialog: { open: (o: object) => Promise<string | null> } };
const tauri = () => (Platform.OS === 'web' ? (window as unknown as { __TAURI__?: Tauri }).__TAURI__ : undefined);

/** Windows app only: the folder that holds everything (tasks, board, pictures). Changing it copies the data and restarts. */
export function DataFolder() {
  const c = usePalette();
  const [dir, setDir] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    tauri()?.core.invoke<string>('get_data_dir').then(setDir, () => setDir(null));
  }, []);
  if (!tauri() || !dir) return null;

  const change = async () => {
    setError(null);
    const picked = await tauri()!.dialog.open({ directory: true, title: 'Choose where TIMELINER keeps your data' });
    if (!picked || picked === dir) return;
    try {
      await tauri()!.core.invoke('set_data_dir', { path: picked }); // copies your data there and restarts the app
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
      <View style={styles.row}>
        <Ionicons name="folder-open-outline" size={20} color={c.accentText} />
        <View style={styles.grow}>
          <Text style={[styles.title, { color: c.ink }]}>Data folder</Text>
          <Text selectable style={[styles.sub, { color: c.muted }]}>{dir}</Text>
        </View>
      </View>
      <Text style={[styles.sub, { color: c.muted }]}>Tasks, board and pictures are all saved here. Changing it copies your data to the new folder and restarts the app.</Text>
      {error && <Text style={[styles.sub, { color: c.danger }]}>{error}</Text>}
      <Pressable accessibilityRole="button" onPress={change} style={({ pressed }) => [styles.button, { backgroundColor: c.chip }, pressed && styles.pressed]}>
        <Text style={[styles.buttonText, { color: c.ink }]}>Change folder…</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 12, gap: 10, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  title: { fontSize: 15, fontFamily: F.semi },
  sub: { fontSize: 12.5, fontFamily: F.text, lineHeight: 17 },
  button: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.97 }] },
});
