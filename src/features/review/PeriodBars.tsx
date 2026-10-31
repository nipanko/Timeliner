import { StyleSheet, Text, View } from 'react-native';

import { periodProgress, type Period } from '@/core/time/periods';
import type { WeekStart } from '@/core/time/units';
import { usePalette, type Palette } from '@/ui/theme';
import { F } from '@/ui/type';

const PERIODS: [string, Period][] = [['DAY', 'day'], ['WEEK', 'week'], ['MONTH', 'month'], ['YEAR', 'year']];

/** How much of today, this week, month and year has passed: ten segments each, like a watch complication. */
export function PeriodBars({ now, weekStart }: { now: number; weekStart: WeekStart }) {
  const c = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
      {PERIODS.map(([label, period]) => {
        const f = periodProgress(now, period, weekStart);
        return (
          <View key={period} style={styles.item} accessible accessibilityLabel={`${label.toLowerCase()} ${Math.floor(f * 100)} percent done`}>
            <View style={styles.text}>
              <Text style={[styles.micro, { color: c.muted }]}>{label}</Text>
              <Text style={[styles.micro, { color: c.ink }]}>{Math.floor(f * 100)}%</Text>
            </View>
            <Segments value={f} c={c} />
          </View>
        );
      })}
    </View>
  );
}

function Segments({ value, c }: { value: number; c: Palette }) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: 10 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, value * 10 - i));
        return <View key={i} style={[styles.segment, { backgroundColor: fill > 0 ? c.ink : c.chip, opacity: fill > 0 ? 0.35 + 0.65 * fill : 1 }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16 },
  item: { flex: 1, gap: 4 },
  text: { flexDirection: 'row', justifyContent: 'space-between' },
  micro: { fontSize: 10, fontFamily: F.semi, letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
  segments: { flexDirection: 'row', gap: 2 },
  segment: { flex: 1, height: 8, borderRadius: 2 },
});
