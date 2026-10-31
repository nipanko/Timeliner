import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { openDb, type Db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
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
    openDb().then(setDb, setError);
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
      </Stack>
      <Celebrations />
    </GestureHandlerRootView>
  );
}

function DataError({ error }: { error: Error }) {
  return <Text style={{ margin: 40 }}>Could not open your data: {error.message}</Text>;
}
