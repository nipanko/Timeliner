import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { HOUR } from '@/core/time/units';
import type { Entry } from '@/features/entries/data';

// shortcut: no local notifications on web (no service worker); add web push with the Phase 2 web dashboard.
const enabled = Platform.OS !== 'web';
// iOS keeps at most 64 scheduled local notifications, so only the near future is scheduled and refilled on change.
const WINDOW = 48 * HOUR;
const MAX = 50;

export async function setupNotifications() {
  if (!enabled) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Reminders and tasks', importance: AndroidImportance.HIGH });
  }
}

async function allowed() {
  if ((await Notifications.getPermissionsAsync()).granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function cancelWhere(prefix: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

const at = (date: number) => ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'default' }) as const;

/** Reminders fire at their time; tasks tell you when they start. Only for the next 48 hours. */
export async function syncEntryNotifications(entries: readonly Entry[], now: number) {
  if (!enabled) return;
  const upcoming = entries
    .filter((e) => !e.done && (e.kind === 'reminder' || e.kind === 'task') && e.granularity === 'moment' && e.start > now && e.start < now + WINDOW)
    .sort((a, b) => a.start - b.start)
    .slice(0, MAX);
  await cancelWhere('entry-');
  if (!upcoming.length || !(await allowed())) return;
  await Promise.all(
    upcoming.map((e) =>
      Notifications.scheduleNotificationAsync({
        identifier: `entry-${e.id}`,
        content: { title: e.kind === 'reminder' ? 'Reminder' : 'Time to start', body: e.title },
        trigger: at(e.start),
      }),
    ),
  );
}

/** The only notification sent during a focus block: its end. */
export async function scheduleFocusEnd(entryId: string, title: string, when: number) {
  if (!enabled || !(await allowed())) return;
  await Notifications.scheduleNotificationAsync({ identifier: `focus-${entryId}`, content: { title: 'Focus block done', body: title }, trigger: at(when) });
}

export async function cancelFocusEnd(entryId: string) {
  if (enabled) await cancelWhere(`focus-${entryId}`);
}
