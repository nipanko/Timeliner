import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import type { Direction } from '@/core/timeline/viewport';
import { setLayerVisible, type Layer } from '@/features/entries/data';
import { setSetting } from '@/features/settings/data';
import { usePalette, type IconName } from '@/ui/theme';
import { F } from '@/ui/type';

const DIRECTIONS: [Direction, IconName, string][] = [
  ['down', 'arrow-down', 'Down'],
  ['up', 'arrow-up', 'Up'],
  ['right', 'arrow-forward', 'Right'],
  ['left', 'arrow-back', 'Left'],
];

type Props = { open: boolean; layers: readonly Layer[]; direction: Direction; onClose: () => void };

/** Timeline view options in one place: which layers show, and which way time runs. */
export function ViewSheet({ open, layers, direction, onClose }: Props) {
  const c = usePalette();
  const visible = layers.filter((l) => l.visible).length;
  const toggle = (l: Layer) => {
    if (!l.visible || visible > 1) setLayerVisible(l.id, !l.visible); // never hide the last visible layer
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.backdrop, { backgroundColor: c.veil }]}>
        <Pressable onPress={() => {}} accessible={false}>
          <Animated.View entering={ZoomIn.springify().damping(16)} style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raised }]}>
            <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">View</Text>

            <Text style={[styles.section, { color: c.muted }]}>LAYERS</Text>
            <View style={styles.list}>
              {layers.map((l) => (
                <Pressable
                  key={l.id}
                  accessibilityRole="switch"
                  aria-checked={l.visible}
                  accessibilityLabel={`Show ${l.name}`}
                  onPress={() => toggle(l)}
                  style={({ pressed }) => [styles.row, { backgroundColor: l.visible ? c.tray : 'transparent' }, pressed && styles.pressed]}
                >
                  <View style={[styles.badge, { backgroundColor: l.visible ? l.color.fill : c.chip }]}>
                    <Ionicons name={l.icon} size={15} color={l.visible ? l.color.ink : c.muted} />
                  </View>
                  <Text style={[styles.name, { color: l.visible ? c.ink : c.muted }]}>{l.name}</Text>
                  <Ionicons name={l.visible ? 'eye' : 'eye-off-outline'} size={19} color={l.visible ? c.accentText : c.muted} />
                </Pressable>
              ))}
            </View>

            <Text style={[styles.section, { color: c.muted }]}>TIME RUNS</Text>
            <View style={[styles.segmented, { backgroundColor: c.chip }]}>
              {DIRECTIONS.map(([d, icon, label]) => {
                const on = d === direction;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="radio"
                    aria-checked={on}
                    accessibilityLabel={`Time runs ${label.toLowerCase()}`}
                    onPress={() => setSetting('direction', d)}
                    style={[styles.option, on && { backgroundColor: c.accent, boxShadow: c.selected }]}
                  >
                    <Ionicons name={icon} size={16} color={on ? c.accentInk : c.ink} />
                    <Text style={[styles.optionText, { color: on ? c.accentInk : c.ink }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  router.push('/settings');
                }}
                style={styles.link}
              >
                <Text style={[styles.linkText, { color: c.muted }]}>Edit layers in Settings</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.done, { backgroundColor: c.accent }, pressed && styles.pressed]}>
                <Text style={[styles.doneText, { color: c.accentInk }]}>Done</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: 340, maxWidth: '100%', borderRadius: 26, padding: 16, gap: 10 },
  title: { fontSize: 18, fontFamily: F.display },
  section: { fontSize: 11, fontFamily: F.bold, letterSpacing: 1.1, marginTop: 4 },
  list: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 8, borderRadius: 14 },
  badge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontFamily: F.semi },
  segmented: { flexDirection: 'row', borderRadius: 14, padding: 3, gap: 2 },
  option: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 2 },
  optionText: { fontSize: 11, fontFamily: F.bold },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  link: { paddingVertical: 10 },
  linkText: { fontSize: 13, fontFamily: F.semi },
  done: { height: 44, paddingHorizontal: 22, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 15, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.97 }] },
});
