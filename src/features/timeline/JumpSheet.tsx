import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { monthGrid } from '@/core/time/periods';
import { addUnit, floorUnit, HOUR, type WeekStart } from '@/core/time/units';
import { tick } from '@/lib/tick';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';
import { Wheel } from '@/ui/Wheel';

export type JumpMode = 'date' | 'time';

type Props = {
  mode: JumpMode | null;
  /** The day the timeline shows now (start of day): the calendar opens on its month; a time lands on it. */
  day: number;
  today: number;
  weekStart: WeekStart;
  /** Sounds off in calm mode. */
  sound: boolean;
  onJump: (t: number) => void;
  onClose: () => void;
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const HALVES = ['AM', 'PM'];

/** Calendar (pick a day) or iPhone-style time wheels (pick a time); the timeline jumps there. */
export function JumpSheet({ mode, day, today, weekStart, sound, onJump, onClose }: Props) {
  const c = usePalette();
  return (
    <Modal visible={mode !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.backdrop, { backgroundColor: c.veil }]}>
        {/* Taps inside the card must not close it. */}
        <Pressable onPress={() => {}} accessible={false}>
          <Animated.View entering={ZoomIn.springify().damping(16)} style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raised }]}>
            {mode === 'date' && <Calendar day={day} today={today} weekStart={weekStart} onPick={(d) => onJump(d === today ? Date.now() : d + 9 * HOUR)} />}
            {mode === 'time' && <TimeWheels day={day} sound={sound} onPick={onJump} />}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Calendar({ day, today, weekStart, onPick }: { day: number; today: number; weekStart: WeekStart; onPick: (day: number) => void }) {
  const c = usePalette();
  const [month, setMonth] = useState(() => floorUnit(day, 'month'));
  const grid = monthGrid(month, weekStart);
  const weekdays = grid.slice(0, 7).map((d) => new Date(d).toLocaleDateString(undefined, { weekday: 'narrow' }));
  const nav = (n: number) => setMonth((m) => addUnit(m, 'month', n));

  return (
    <View style={styles.gap}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => nav(-1)} style={[styles.navButton, { backgroundColor: c.chip }]}>
          <Ionicons name="chevron-back" size={18} color={c.ink} />
        </Pressable>
        <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
          {new Date(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => nav(1)} style={[styles.navButton, { backgroundColor: c.chip }]}>
          <Ionicons name="chevron-forward" size={18} color={c.ink} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {weekdays.map((w, i) => (
          <Text key={i} style={[styles.weekday, { color: c.muted }]}>{w}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.map((d) => {
          const inMonth = floorUnit(d, 'month') === month;
          const isToday = d === today;
          const isShown = d === day;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${new Date(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
              onPress={() => onPick(d)}
              style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.dayDot,
                  isShown && { backgroundColor: c.accent, boxShadow: c.glow },
                  isToday && !isShown && { borderWidth: 2, borderColor: c.accentText },
                ]}
              >
                <Text style={[styles.dayText, { color: isShown ? c.accentInk : inMonth ? c.ink : c.muted }]}>{new Date(d).getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" onPress={() => onPick(today)} style={({ pressed }) => [styles.todayButton, { backgroundColor: c.chip }, pressed && styles.pressed]}>
        <Text style={[styles.todayText, { color: c.ink }]}>Today</Text>
      </Pressable>
    </View>
  );
}

function TimeWheels({ day, sound, onPick }: { day: number; sound: boolean; onPick: (t: number) => void }) {
  const c = usePalette();
  const [init] = useState(() => new Date());
  const [hour, setHour] = useState((init.getHours() + 11) % 12); // index into HOURS (1..12)
  const [minute, setMinute] = useState(init.getMinutes());
  const [half, setHalf] = useState(init.getHours() >= 12 ? 1 : 0);
  const onTick = () => tick(sound);
  const go = () => {
    const h24 = ((hour + 1) % 12) + half * 12;
    const at = new Date(day);
    at.setHours(h24, minute, 0, 0); // wall-clock time, right on DST days too
    onPick(at.getTime());
  };

  return (
    <View style={styles.gap}>
      <Text style={[styles.title, styles.center, { color: c.ink }]}>{new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <View style={styles.wheels}>
        <View pointerEvents="none" style={[styles.band, { backgroundColor: c.chip }]} />
        <Wheel items={HOURS} index={hour} onChange={setHour} onTick={onTick} label="Hour" width={70} />
        <Text style={[styles.colon, { color: c.ink }]}>:</Text>
        <Wheel items={MINUTES} index={minute} onChange={setMinute} onTick={onTick} label="Minute" width={70} />
        <Wheel items={HALVES} index={half} onChange={setHalf} onTick={onTick} label="AM or PM" width={70} />
      </View>
      <Pressable accessibilityRole="button" onPress={go} style={({ pressed }) => [styles.go, { boxShadow: c.glow }, pressed && styles.pressed]}>
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goFill}>
          <Ionicons name="time" size={18} color={c.accentInk} />
          <Text style={[styles.goText, { color: c.accentInk }]}>Go to this time</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: 340, maxWidth: '100%', borderRadius: 26, padding: 16 },
  gap: { gap: 12 },
  center: { textAlign: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: F.display },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: F.semi },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontFamily: F.displaySemi, fontVariant: ['tabular-nums'] },
  todayButton: { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayText: { fontSize: 14, fontFamily: F.bold },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', left: 8, right: 8, height: 40, borderRadius: 12 },
  colon: { fontSize: 24, fontFamily: F.display, marginHorizontal: -4 },
  go: { height: 52, borderRadius: 18, overflow: 'hidden' },
  goFill: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  goText: { fontSize: 15, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.95 }] },
});
