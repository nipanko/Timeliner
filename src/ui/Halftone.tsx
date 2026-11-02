import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

/** Comic halftone dots over a whole area (DESIGN.md §1, v2). Purely decoration: no touches, hidden from screen readers. */
export function Halftone({ color }: { color: string }) {
  // Pattern ids are global on the web; each copy needs its own or a hidden tab's copy is used (and paints nothing).
  const id = `halftone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={9} height={9} patternUnits="userSpaceOnUse">
            <Circle cx={4.5} cy={4.5} r={1.3} fill={color} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
