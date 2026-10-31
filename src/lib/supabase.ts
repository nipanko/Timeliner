import { createClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Accounts are optional: without the two public values (see .env.example) the app runs local-only. */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          // Phones keep the session in expo-sqlite's key-value store; the web uses localStorage (the default).
          storage: Platform.OS === 'web' ? undefined : Storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // we sign in with a 6-digit code, not a link
        },
      })
    : null;
