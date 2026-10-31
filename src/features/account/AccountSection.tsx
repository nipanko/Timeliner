import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { signOut, useProfile, useSession } from './data';

/** Settings › Account: sign in for backup / sync, or see who you're signed in as. Hidden if accounts aren't configured. */
export function AccountSection() {
  const c = usePalette();
  const session = useSession();
  const profile = useProfile(session);
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
    profile?.consent === 'pending' ? 'Waiting for a parent to confirm' : profile === null ? 'Finish setting up your account' : 'Signed in. Sync arrives in the next update.';
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
      <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.signOut, { backgroundColor: c.chip }, pressed && styles.pressed]}>
        <Text style={[styles.signOutText, { color: c.ink }]}>Sign out</Text>
      </Pressable>
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
  signOut: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontSize: 14, fontFamily: F.bold },
  pressed: { transform: [{ scale: 0.97 }] },
});
