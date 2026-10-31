let ctx: AudioContext | null = null;

/** Web: a tiny synthesized click (no file to load); no haptics in browsers. */
export function tick(sound: boolean) {
  if (!sound || typeof AudioContext === 'undefined') return;
  ctx ??= new AudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 3200;
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.025);
}
