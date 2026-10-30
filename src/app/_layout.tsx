import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { openDb, type Db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { setupNotifications } from '@/lib/notifications';

export default function RootLayout() {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    openDb().then(setDb, setError);
  }, []);
  if (error) return <DataError error={error} />;
  return db ? <MigratedApp db={db} /> : null;
}

function MigratedApp({ db }: { db: Db }) {
  const { success, error } = useMigrations(db, migrations);
  useEffect(() => {
    setupNotifications();
  }, []);
  if (error) return <DataError error={error} />;
  if (!success) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="entry/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="focus/[id]" />
        <Stack.Screen name="review" />
      </Stack>
    </GestureHandlerRootView>
  );
}

function DataError({ error }: { error: Error }) {
  return <Text style={{ margin: 40 }}>Could not open your data: {error.message}</Text>;
}
