import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ageGroup, validBirthYear } from '@/core/age';
import { usePalette, type IconName } from '@/ui/theme';
import { F } from '@/ui/type';

import { createProfile, sendCode, verifyCode } from './data';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

type Step = 'age' | 'child' | 'email' | 'code' | 'done';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign in with a 6-digit email code. The age question comes first, before any personal data. */
export function AccountScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('age');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teen, setTeen] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(friendly(e));
    }
    setBusy(false);
  };

  const submitAge = () => {
    const y = Number(year);
    const now = new Date();
    if (!validBirthYear(y, now)) return setError('Enter the year you were born, like 2004.');
    setError(null);
    const group = ageGroup(y, now);
    setTeen(group === 'teen');
    setStep(group === 'child' ? 'child' : 'email');
  };
  const submitEmail = () => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) return setError('Enter a valid email address.');
    run(async () => {
      await sendCode(clean);
      setEmail(clean);
      setStep('code');
    });
  };
  const submitCode = () => {
    if (!/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code from the email.');
    run(async () => {
      const session = await verifyCode(email, code.trim());
      if (session) await createProfile(session.user.id, Number(year));
      setStep('done');
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.panel, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={close} style={styles.side}>
          <Text style={[styles.sideText, { color: c.muted }]}>{step === 'done' ? '' : 'Cancel'}</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">Your account</Text>
        <View style={styles.side} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 'age' && (
          <>
            <Lead icon="cloud-upload-outline" title="Back up and sync" text="An account keeps a copy of your timeline safe and, soon, the same on your phone and computer. The app keeps working without one." />
            <Field label="What year were you born?" value={year} onChange={setYear} placeholder="2004" keyboard="number-pad" onSubmit={submitAge} />
            <Primary label="Continue" onPress={submitAge} busy={busy} />
          </>
        )}

        {step === 'child' && (
          <>
            <Lead icon="happy-outline" title="Accounts are for 13 and over" text="You can keep using TIMELINER on this device, with all your XP, streaks and Tick. Nothing changes. Ask again when you're 13." />
            <Primary label="Back to the app" onPress={close} />
          </>
        )}

        {step === 'email' && (
          <>
            <Lead icon="mail-outline" title="Sign in with your email" text="We'll send you a 6-digit code. No password to remember." />
            {teen && <Note text="You're under 18, so a parent will be asked to confirm your account before sync turns on." />}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboard="email-address" onSubmit={submitEmail} />
            <Primary label="Send code" onPress={submitEmail} busy={busy} />
          </>
        )}

        {step === 'code' && (
          <>
            <Lead icon="keypad-outline" title="Check your email" text={`We sent a 6-digit code to ${email}. It can take a minute.`} />
            <Field label="Code" value={code} onChange={setCode} placeholder="123456" keyboard="number-pad" onSubmit={submitCode} />
            <Primary label="Sign in" onPress={submitCode} busy={busy} />
            <Pressable accessibilityRole="button" onPress={() => setStep('email')} style={styles.link}>
              <Text style={[styles.linkText, { color: c.muted }]}>Use a different email</Text>
            </Pressable>
          </>
        )}

        {step === 'done' && (
          <>
            <Lead icon="checkmark-circle" title="You're signed in" text={teen ? "Next, a parent confirms your account. Until then everything works as before on this device." : 'Your account is ready. Syncing your timeline comes in the next update.'} />
            <Primary label="Done" onPress={close} />
          </>
        )}

        {error && (
          <View style={styles.errorRow} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={16} color={c.danger} />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/rate limit|too many/i.test(msg)) return 'Too many codes asked for. Wait a few minutes, then try again.';
  if (/expired|invalid/i.test(msg)) return "That code didn't work. Check it, or ask for a new one.";
  if (/13 and over/.test(msg)) return 'Accounts are for people aged 13 and over.';
  if (/network|fetch/i.test(msg)) return "Couldn't reach the server. Check your connection.";
  return msg;
}

function Lead({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const c = usePalette();
  return (
    <View style={styles.lead}>
      <View style={[styles.leadIcon, { backgroundColor: c.chip }]}>
        <Ionicons name={icon} size={26} color={c.accentText} />
      </View>
      <Text style={[styles.leadTitle, { color: c.ink }]}>{title}</Text>
      <Text style={[styles.leadText, { color: c.muted }]}>{text}</Text>
    </View>
  );
}

function Note({ text }: { text: string }) {
  const c = usePalette();
  return (
    <View style={[styles.note, { backgroundColor: c.tray, boxShadow: c.pressedIn }]}>
      <Ionicons name="people-outline" size={16} color={c.accentText} />
      <Text style={[styles.noteText, { color: c.ink }]}>{text}</Text>
    </View>
  );
}

type FieldProps = { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard: 'number-pad' | 'email-address'; onSubmit: () => void };

function Field({ label, value, onChange, placeholder, keyboard, onSubmit }: FieldProps) {
  const c = usePalette();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboard}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={keyboard === 'email-address' ? 'email' : 'one-time-code'}
        autoFocus
        maxLength={keyboard === 'email-address' ? 200 : 6}
        accessibilityLabel={label}
        style={[styles.input, { color: c.ink, backgroundColor: c.tray, boxShadow: c.pressedIn }]}
      />
    </View>
  );
}

function Primary({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="button" aria-busy={busy} onPress={busy ? undefined : onPress} style={({ pressed }) => [styles.primary, { boxShadow: c.glow }, pressed && styles.pressed]}>
      <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryFill}>
        <Text style={[styles.primaryText, { color: c.accentInk }]}>{busy ? 'One moment…' : label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10 },
  side: { minWidth: 80, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  sideText: { fontSize: 14, fontFamily: F.bold },
  title: { fontSize: 18, fontFamily: F.display },
  body: { padding: 20, gap: 16 },
  lead: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  leadIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  leadTitle: { fontSize: 22, fontFamily: F.display, textAlign: 'center' },
  leadText: { fontSize: 14, fontFamily: F.text, lineHeight: 21, textAlign: 'center' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 14, padding: 12 },
  noteText: { flex: 1, fontSize: 13.5, fontFamily: F.text, lineHeight: 19 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: F.bold, letterSpacing: 0.4 },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, fontSize: 18, fontFamily: F.semi },
  primary: { height: 54, borderRadius: 18, overflow: 'hidden' },
  primaryFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontFamily: F.bold },
  link: { alignSelf: 'center', padding: 10 },
  linkText: { fontSize: 13.5, fontFamily: F.semi },
  errorRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  errorText: { flex: 1, fontSize: 13.5, fontFamily: F.semi },
  pressed: { transform: [{ scale: 0.97 }] },
});
