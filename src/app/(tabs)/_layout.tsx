import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentRef, Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette, type IconName } from '@/ui/theme';
import { F } from '@/ui/type';

/** Floating tab bar (adding lives on the Timeline's pointer). Tabs keep their state while hidden (React Activity). */
export default function TabsLayout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={[styles.fill, { backgroundColor: c.ground }]} activityEnabled>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        {/* TabList's Slot merges styles by object spread, so its child needs a flat style, not an array. */}
        <View style={StyleSheet.flatten([styles.row, { paddingBottom: insets.bottom + 8 }])}>
          <View style={[styles.pill, { backgroundColor: c.panel, boxShadow: c.raised }]} />
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="git-network" label="Timeline" />
          </TabTrigger>
          <TabTrigger name="journey" href="/journey" asChild>
            <TabButton icon="trophy" label="Journey" />
          </TabTrigger>
          <TabTrigger name="review" href="/review" asChild>
            <TabButton icon="stats-chart" label="Review" />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon="settings" label="Settings" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ icon, label, isFocused, ref, ...props }: TabTriggerSlotProps & { icon: string; label: string }) {
  const c = usePalette();
  const color = isFocused ? c.accentText : c.muted;
  return (
    <Pressable
      {...props}
      ref={ref as Ref<ComponentRef<typeof Pressable>>}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <Ionicons name={(isFocused ? icon : `${icon}-outline`) as IconName} size={21} color={color} />
      <Text style={[styles.tabText, { color }]}>{label}</Text>
      {isFocused && <Animated.View entering={ZoomIn.springify()} style={[styles.tabDot, { backgroundColor: c.accentText }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // TabSlot never shrinks by default, so a long screen (Journey) pushed the tab bar off the bottom.
  slot: { flexShrink: 1, flexBasis: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 },
  pill: { position: 'absolute', left: 16, right: 16, top: 10, height: 62, borderRadius: 22 },
  tab: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabText: { fontSize: 11, fontFamily: F.bold },
  tabDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2 },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
});
