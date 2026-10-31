import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let player: AudioPlayer | null = null;

/** One notch of a picker wheel: a selection haptic and, unless muted, a soft click (like the iPhone clock). */
export function tick(sound: boolean) {
  Haptics.selectionAsync().catch(() => {});
  if (!sound) return;
  if (!player) {
    // Mix with the user's music instead of pausing it; respect the silent switch.
    setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: false }).catch(() => {});
    player = createAudioPlayer(require('../../assets/sounds/tick.wav'));
    player.volume = 0.5;
  }
  player.seekTo(0).catch(() => {});
  player.play();
}
