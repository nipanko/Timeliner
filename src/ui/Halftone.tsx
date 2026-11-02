import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

/** Comic halftone dots over a whole area (DESIGN.md §1, v2). Purely decoration: no touches, hidden from screen readers. */
export function Halftone({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="halftone" width={9} height={9} patternUnits="userSpaceOnUse">
            <Circle cx={4.5} cy={4.5} r={1.3} fill={color} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#halftone)" />
      </Svg>
    </View>
  );
}
