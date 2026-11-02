import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tick } from '@/features/game/Tick';
import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

import { confirmParentConsent } from './data';

/** `/consent?token=…`: the page a parent opens from the email to agree to their child's account. */
export function ConsentScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [state, setState] = useState<{ step: 'form' | 'busy' | 'done'; error?: string }>({ step: 'form' });
  const ready = !!token && agreed && name.trim().length >= 2 && state.step === 'form';

  const confirm = async () => {
    setState({ step: 'busy' });
    try {
      await confirmParentConsent(token ?? '', name.trim());
      setState({ step: 'done' });
    } catch (e) {
      setState({ step: 'form', error: e instanceof Error ? e.message : 'Something went wrong. Try again.' });
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.ground }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.card, { backgroundColor: c.panel, boxShadow: c.raised }]}>
        <View style={styles.center}>
          <Tick size={72} mood={state.step === 'done' ? 'cheer' : 'happy'} />
        </View>
        {state.step === 'done' ? (
          <>
            <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
              Thank you
            </Text>
            <Text style={[styles.body, { color: c.ink }]}>Your child&apos;s account can now back up and sync. You can close this page.</Text>
          </>
        ) : !token ? (
          <>
            <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
              This link is incomplete
            </Text>
            <Text style={[styles.body, { color: c.ink }]}>Open the link from the email again, or ask your child to send a new request from the app.</Text>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
              Your child asked to use TIMELINER
            </Text>
            <Text style={[styles.body, { color: c.ink }]}>
              TIMELINER is a planner. With an account, we keep a copy of their plans on our server so they can use it on more than one device. For under-18s there are no ads, no tracking and no social features.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={c.muted}
              accessibilityLabel="Your full name"
              style={[styles.input, { color: c.ink, backgroundColor: c.tray }]}
            />
            <Pressable accessibilityRole="checkbox" aria-checked={agreed} onPress={() => setAgreed((a) => !a)} style={styles.agree}>
              <View style={[styles.box, agreed ? { backgroundColor: c.accent } : { borderWidth: 2.5, borderColor: c.lineStrong }]}>
                {agreed && <Ionicons name="checkmark" size={16} color={c.accentInk} />}
              </View>
              <Text style={[styles.body, styles.grow, { color: c.ink }]}>I am this child&apos;s parent or legal guardian, and I agree to their TIMELINER account.</Text>
            </Pressable>
            {state.error && <Text style={[styles.body, { color: c.danger }]}>{state.error}</Text>}
            <Pressable accessibilityRole="button" disabled={!ready} onPress={confirm} style={({ pressed }) => [styles.button, { backgroundColor: ready ? c.accent : c.chip }, pressed && styles.pressed]}>
              <Text style={[styles.buttonText, { color: ready ? c.accentInk : c.muted }]}>{state.step === 'busy' ? 'Confirming…' : 'I agree'}</Text>
            </Pressable>
            <Text style={[styles.small, { color: c.muted }]}>If you don&apos;t know about this, close this page; nothing changes.</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16 },
  card: { width: 440, maxWidth: '100%', borderRadius: 26, padding: 20, gap: 12 },
  center: { alignItems: 'center' },
  title: { fontSize: 24, fontFamily: F.display, textAlign: 'center' },
  body: { fontSize: 14.5, fontFamily: F.text, lineHeight: 21 },
  small: { fontSize: 12.5, fontFamily: F.text, textAlign: 'center' },
  input: { height: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, fontFamily: F.semi },
  agree: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  grow: { flex: 1 },
  button: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 17, fontFamily: F.display },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
