import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { addLayer, setLayerVisible, updateLayer, useLayers, type Layer } from '@/features/entries/data';
import { LAYER_COLORS, LAYER_ICONS, usePalette, type LayerColorKey } from '@/ui/theme';
import { F } from '@/ui/type';

const COLOR_KEYS = Object.keys(LAYER_COLORS) as LayerColorKey[];

/** Rename, recolor, re-icon, show/hide and add layers (lanes). */
export function LayersSection() {
  const c = usePalette();
  const layers = useLayers();
  const [open, setOpen] = useState<string | null>(null);

  const add = async () => {
    const used = new Set(layers.map((l) => l.colorKey));
    await addLayer('New layer', COLOR_KEYS.find((k) => !used.has(k)) ?? 'teal', 'heart', layers.length);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
      {layers.map((l) => (
        <LayerRow key={l.id} layer={l} open={open === l.id} onToggle={() => setOpen(open === l.id ? null : l.id)} canHide={layers.filter((x) => x.visible).length > 1} />
      ))}
      <Pressable accessibilityRole="button" onPress={add} style={({ pressed }) => [styles.add, { backgroundColor: c.chip }, pressed && styles.pressed]}>
        <Ionicons name="add" size={18} color={c.accentText} />
        <Text style={[styles.addText, { color: c.ink }]}>Add layer</Text>
      </Pressable>
    </View>
  );
}

function LayerRow({ layer, open, onToggle, canHide }: { layer: Layer; open: boolean; onToggle: () => void; canHide: boolean }) {
  const c = usePalette();
  const [name, setName] = useState(layer.name);
  const saveName = () => {
    const clean = name.trim();
    if (clean && clean !== layer.name) updateLayer(layer.id, { name: clean });
    else setName(layer.name);
  };

  return (
    <View style={[styles.row, open && { backgroundColor: c.tray, boxShadow: c.pressedIn }]}>
      <View style={styles.rowTop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${open ? 'Close' : 'Edit'} color and icon of ${layer.name}`}
          onPress={onToggle}
          style={({ pressed }) => [styles.badge, { backgroundColor: layer.color.fill }, pressed && styles.pressed]}
        >
          <Ionicons name={layer.icon} size={18} color={layer.color.ink} />
        </Pressable>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          maxLength={24}
          accessibilityLabel={`Layer name: ${layer.name}`}
          style={[styles.name, { color: c.ink }]}
        />
        <Pressable
          accessibilityRole="switch"
          aria-checked={layer.visible}
          aria-disabled={layer.visible && !canHide}
          accessibilityLabel={`Show ${layer.name} on the timeline`}
          hitSlop={8}
          onPress={() => (!layer.visible || canHide) && setLayerVisible(layer.id, !layer.visible)}
        >
          <Ionicons name={layer.visible ? 'eye' : 'eye-off-outline'} size={20} color={layer.visible ? c.accentText : c.muted} />
        </Pressable>
      </View>

      {open && (
        <Animated.View entering={FadeIn} style={styles.editor}>
          <View style={styles.swatches}>
            {COLOR_KEYS.map((k) => (
              <Pressable
                key={k}
                accessibilityRole="radio"
                aria-checked={layer.colorKey === k}
                accessibilityLabel={`${k} color`}
                onPress={() => updateLayer(layer.id, { color: k })}
                style={[styles.swatch, { backgroundColor: LAYER_COLORS[k].fill }, layer.colorKey === k && { boxShadow: `0 0 0 3px ${c.panel}, 0 0 0 5px ${LAYER_COLORS[k].fill}` }]}
              />
            ))}
          </View>
          <View style={styles.icons}>
            {LAYER_ICONS.map((icon) => {
              const on = layer.icon === icon;
              return (
                <Pressable
                  key={icon}
                  accessibilityRole="radio"
                  aria-checked={on}
                  accessibilityLabel={`${icon} icon`}
                  onPress={() => updateLayer(layer.id, { icon })}
                  style={({ pressed }) => [styles.iconChoice, { backgroundColor: on ? layer.color.fill : c.chip }, pressed && styles.pressed]}
                >
                  <Ionicons name={icon} size={18} color={on ? layer.color.ink : c.ink} />
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 8, gap: 4 },
  row: { borderRadius: 14, padding: 8, gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, height: 44, fontSize: 15, fontFamily: F.semi },
  editor: { gap: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 4 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconChoice: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  add: { height: 48, borderRadius: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  addText: { fontSize: 14, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.96 }] },
});
