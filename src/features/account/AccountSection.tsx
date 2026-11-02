import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { deleteAccount, signOut, useProfile, useSession } from './data';
import { runSync, useSyncStatus } from './sync';

/** Settings › Account: sign in for backup / sync, or see who you're signed in as. Hidden if accounts aren't configured. */
export function AccountSection() {
  const c = usePalette();
  const session = useSession();
  const profile = useProfile(session);
  const sync = useSyncStatus();
  const [deleting, setDeleting] = useState<'ask' | 'busy' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  if (!supabase || session === undefined) return null;

  if (!session) {
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push('/account')} style={({ pressed }) => [styles.card, styles.row, { backgroundColor: c.panel, boxShadow: c.raisedSm }, pressed && styles.pressed]}>
        <View style={[styles.icon, { backgroundColor: c.chip }]}>
          <Ionicons name="cloud-upload-outline" size={20} color={c.accentText} />
        </View>
        <View style={styles.grow}>
          <Text style={[styles.title, { color: c.ink }]}>Sign in to back up</Text>
          <Text style={[styles.sub, { color: c.muted }]}>Optional. Keeps a copy safe and, soon, syncs your devices.</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.muted} />
      </Pressable>
    );
  }

  const status =
    profile?.consent === 'pending'
      ? 'Waiting for a parent to confirm. Sync starts after that.'
      : profile === null
        ? 'Finish setting up your account'
        : sync.state === 'syncing'
          ? 'Syncing…'
          : sync.state === 'error'
            ? `Sync paused: ${sync.error}`
            : sync.lastSyncedAt
              ? `Synced ${new Date(sync.lastSyncedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
              : 'Ready to sync';
  const canSync = !!profile && profile.consent !== 'pending';
  return (
    <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: c.chip }]}>
          <Ionicons name="person-circle-outline" size={22} color={c.accentText} />
        </View>
        <View style={styles.grow}>
          <Text numberOfLines={1} style={[styles.title, { color: c.ink }]}>{session.user.email}</Text>
          <Text style={[styles.sub, { color: c.muted }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        {canSync && (
          <Pressable accessibilityRole="button" onPress={runSync} style={({ pressed }) => [styles.signOut, styles.grow, { backgroundColor: c.accent }, pressed && styles.pressed]}>
            <Text style={[styles.signOutText, { color: c.accentInk }]}>Sync now</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.signOut, styles.grow, { backgroundColor: c.chip }, pressed && styles.pressed]}>
          <Text style={[styles.signOutText, { color: c.ink }]}>Sign out</Text>
        </Pressable>
      </View>
      {deleting ? (
        <View style={[styles.danger, { borderColor: c.danger }]}>
          <Text style={[styles.sub, { color: c.ink }]}>
            This deletes your account and the copy on our server, for good. Everything on this device stays, and you can keep using TIMELINER without an account.
          </Text>
          {deleteError && <Text style={[styles.sub, { color: c.danger }]}>{deleteError}</Text>}
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={() => setDeleting(null)} style={({ pressed }) => [styles.signOut, styles.grow, { backgroundColor: c.chip }, pressed && styles.pressed]}>
              <Text style={[styles.signOutText, { color: c.ink }]}>Keep my account</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={deleting === 'busy'}
              onPress={async () => {
                setDeleting('busy');
                setDeleteError(null);
                try {
                  await deleteAccount(session.user.id);
                } catch (e) {
                  setDeleteError(e instanceof Error ? e.message : 'Could not delete the account. Try again.');
                  setDeleting('ask');
                }
              }}
              style={({ pressed }) => [styles.signOut, styles.grow, { backgroundColor: c.danger }, pressed && styles.pressed]}
            >
              <Text style={[styles.signOutText, { color: c.panel }]}>{deleting === 'busy' ? 'Deleting…' : 'Delete for good'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setDeleting('ask')} style={styles.deleteLink}>
          <Text style={[styles.deleteText, { color: c.danger }]}>Delete account</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  title: { fontSize: 15, fontFamily: F.semi },
  sub: { fontSize: 12.5, fontFamily: F.text, lineHeight: 17 },
  buttons: { flexDirection: 'row', gap: 8 },
  signOut: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontSize: 14, fontFamily: F.bold },
  danger: { borderWidth: 2, borderRadius: 14, padding: 10, gap: 8 },
  deleteLink: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  deleteText: { fontSize: 13, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.97 }] },
});
