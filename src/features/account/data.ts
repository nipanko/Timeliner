import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { forgetSync } from '@/db/sync';
import { supabase } from '@/lib/supabase';

export type Profile = { id: string; nickname: string | null; birth_year: number; consent: 'not_needed' | 'pending' | 'granted' };

/** The signed-in session, or null. `undefined` while it is still being read. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/** This user's profile row (null until created), refreshed when the session or `refresh` changes. */
export function useProfile(session: Session | null | undefined, refresh = 0): Profile | null | undefined {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    let live = true;
    supabase
      .from('profiles')
      .select('id, nickname, birth_year, consent')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => live && setProfile((data as Profile | null) ?? null));
    return () => {
      live = false;
    };
  }, [userId, refresh]);
  return userId ? profile : null;
}

/** Emails a 6-digit code (Supabase Auth). Creates the account on first use. */
export async function sendCode(email: string) {
  if (!supabase) throw new Error('Accounts are not set up in this build.');
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  if (!supabase) throw new Error('Accounts are not set up in this build.');
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data.session;
}

/** Creates the profile once; the database decides `consent` from the birth year (and refuses under 13). */
export async function createProfile(userId: string, birthYear: number) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert({ id: userId, birth_year: birthYear }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

/**
 * 13-17: asks a parent by email (Edge Function `send-consent-email`, which makes the confirm link
 * server-side so this device never sees it). Throws with the server's plain-English message.
 */
export async function requestParentConsent(parentEmail: string) {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('send-consent-email', { body: { parentEmail } });
  if (!error) return;
  const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
  throw new Error(body?.error ?? 'Could not send the email. Try again later.');
}

/** The parent's link: confirms with the token from the email and their name. No sign-in needed. */
export async function confirmParentConsent(token: string, parentName: string) {
  if (!supabase) throw new Error('Accounts are not set up in this build.');
  const { error } = await supabase.rpc('confirm_parent_consent', { consent_token: token, parent_name: parentName });
  if (error) throw new Error(error.message);
}

/**
 * Deletes the account on the server (sign-in, profile, synced copy). Data on this device stays;
 * the user can keep using the app without an account.
 */
export async function deleteAccount(userId: string) {
  if (!supabase) return;
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await forgetSync(userId);
  await supabase.auth.signOut({ scope: 'local' }); // the server session is already gone
}
