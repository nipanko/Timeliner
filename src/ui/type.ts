// Per-weight paths: importing the package root would ship every weight (≈7 MB on the web).
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';

/** Font files loaded once by the root layout. */
export const FONT_FILES = { LilitaOne_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold };

// Use these families instead of fontWeight: Android picks custom fonts by family name, not weight.
// Lilita One (chunky, rounded, arcade) for titles and numbers; Nunito (round, easy to read) for everything else.
export const F = {
  text: 'Nunito_600SemiBold',
  semi: 'Nunito_700Bold',
  bold: 'Nunito_800ExtraBold',
  display: 'LilitaOne_400Regular',
  // Lilita One has one weight; smaller numbers (calendar days, wheels) use it too.
  displaySemi: 'LilitaOne_400Regular',
} as const;
