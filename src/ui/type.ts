// Per-weight paths: importing the package root would ship every weight (≈7 MB on the web).
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Lexend_600SemiBold } from '@expo-google-fonts/lexend/600SemiBold';
import { Lexend_700Bold } from '@expo-google-fonts/lexend/700Bold';

/** Font files loaded once by the root layout. */
export const FONT_FILES = { Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Lexend_600SemiBold, Lexend_700Bold };

// Use these families instead of fontWeight: Android picks custom fonts by family name, not weight.
// Lexend (friendly, made for reading ease, clear digits) for titles and numbers; Inter for everything you read.
export const F = {
  text: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Lexend_700Bold',
  displaySemi: 'Lexend_600SemiBold',
} as const;
