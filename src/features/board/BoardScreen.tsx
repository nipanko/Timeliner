import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/ui/theme';
import { F } from '@/ui/type';

// shortcut: the Board runs on web and the Windows app (BoardScreen.web.tsx); build a touch canvas before the phone release.
export function BoardScreen() {
  const c = usePalette();
  return (
    <View style={[styles.screen, { backgroundColor: c.ground }]}>
      <Text style={[styles.text, { color: c.ink }]}>The Board is on the computer app for now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { fontSize: 16, fontFamily: F.semi, textAlign: 'center' },
});
