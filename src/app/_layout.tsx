import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { openDb, type Db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { SyncRunner } from '@/features/account/sync';
import { Celebrations } from '@/features/game/Celebrations';
import { useSetting } from '@/features/settings/data';
import { setupNotifications } from '@/lib/notifications';
import { ThemePreferenceContext, usePalette, useScheme, type ThemePreference } from '@/ui/theme';
import { FONT_FILES } from '@/ui/type';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    openDb().then(
      (opened) => {
        forgetRetry();
        setDb(opened);
      },
      (e: Error) => {
        // Web: the browser's storage pool can be held for a moment by the page we just left (reload, another tab).
        // The worker can't retry once it failed, so reload once with a fresh one before giving up.
        if (retryOnce()) return;
        setError(e);
      },
    );
  }, []);
  if (error) return <DataError error={error} />;
  // A font that fails to load falls back to the system font rather than blocking the app.
  return db && (fontsLoaded || fontError) ? <MigratedApp db={db} /> : null;
}

function MigratedApp({ db }: { db: Db }) {
  const { success, error } = useMigrations(db, migrations);
  useEffect(() => {
    setupNotifications();
  }, []);
  if (error) return <DataError error={error} />;
  return success ? <ThemedApp /> : null;
}

function ThemedApp() {
  const theme = useSetting<ThemePreference>('theme', 'system');
  return (
    <ThemePreferenceContext value={theme}>
      <AppStack />
    </ThemePreferenceContext>
  );
}

function AppStack() {
  const c = usePalette();
  const scheme = useScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.ground }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="focus/[id]" />
        <Stack.Screen name="inbox" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ presentation: 'modal' }} />
      </Stack>
      <Celebrations />
      <SyncRunner />
    </GestureHandlerRootView>
  );
}

const RETRY_KEY = 'timeliner-db-retry';

function retryOnce(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    if (sessionStorage.getItem(RETRY_KEY)) return false;
    sessionStorage.setItem(RETRY_KEY, '1');
  } catch {
    return false;
  }
  setTimeout(() => location.reload(), 600);
  return true;
}

function forgetRetry() {
  if (Platform.OS !== 'web') return;
  try {
    sessionStorage.removeItem(RETRY_KEY);
  } catch {}
}

/** Shown before the theme exists, so it uses the dark ground directly. */
function DataError({ error }: { error: Error }) {
  const web = Platform.OS === 'web';
  return (
    <ScrollView style={errorStyles.screen} contentContainerStyle={errorStyles.content}>
      <Text style={errorStyles.title} accessibilityRole="header">TIMELINER couldn&apos;t open its storage</Text>
      <Text style={errorStyles.text}>Your data is kept on this device, and the {web ? 'browser' : 'phone'} didn&apos;t let the app open it this time.</Text>
      {web && (
        <View style={errorStyles.list}>
          <Text style={errorStyles.text}>• Close other TIMELINER tabs or windows: only one can use the storage at a time.</Text>
          <Text style={errorStyles.text}>• Private / Incognito windows can&apos;t keep app data. Use a normal window.</Text>
          <Text style={errorStyles.text}>• On iPhone and iPad, update to the latest iOS: older Safari versions lack the storage the app needs.</Text>
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={() => (web ? location.reload() : undefined)} style={errorStyles.button}>
        <Text style={errorStyles.buttonText}>Try again</Text>
      </Pressable>
      <Text style={errorStyles.detail}>Details: {error.message}</Text>
    </ScrollView>
  );
}

const errorStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D0E12' },
  content: { padding: 24, paddingTop: 64, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { color: '#F2F3F5', fontSize: 22, fontWeight: '700' },
  text: { color: '#C9CBD2', fontSize: 15, lineHeight: 22 },
  list: { gap: 8 },
  button: { backgroundColor: '#C8F25A', height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: '#11160A', fontSize: 16, fontWeight: '700' },
  detail: { color: '#9A9CA6', fontSize: 12 },
});
