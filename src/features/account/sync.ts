import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { syncNow } from '@/db/sync';

import { useProfile, useSession } from './data';

export type SyncStatus = { state: 'off' | 'idle' | 'syncing' | 'error'; lastSyncedAt: number | null; error: string | null };

let status: SyncStatus = { state: 'off', lastSyncedAt: null, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<SyncStatus>) => {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
};

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

let activeUser: string | null = null;

/** Runs one round now (Settings › Sync now, and the automatic triggers below). */
export async function runSync() {
  if (!activeUser) return;
  set({ state: 'syncing', error: null });
  try {
    set({ state: 'idle', lastSyncedAt: await syncNow(activeUser) });
  } catch (e) {
    set({ state: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

const EVERY = 60_000;

/** Mounted once in the root layout: syncs at start, every minute and when the app comes back, while allowed. */
export function SyncRunner() {
  const session = useSession();
  const profile = useProfile(session);
  const userId = session && profile && profile.consent !== 'pending' ? session.user.id : null;

  useEffect(() => {
    activeUser = userId;
    if (!userId) {
      set({ state: 'off' });
      return;
    }
    runSync();
    const timer = setInterval(runSync, EVERY);
    const back = () => {
      if (Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active') runSync();
    };
    const sub = AppState.addEventListener('change', back);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', back);
    return () => {
      clearInterval(timer);
      sub.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', back);
      activeUser = null;
    };
  }, [userId]);

  return null;
}
