import * as Tone from "tone";

let synth: Tone.Synth | null = null;
let lastPlayTime = 0;
const THROTTLE_MS = 100;

function getSynth(): Tone.Synth | null {
  if (Tone.context.state !== 'running') return null;
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.02 },
      volume: -24,
    }).toDestination();
  }
  return synth;
}

function canPlay(): boolean {
  const now = Date.now();
  if (now - lastPlayTime < THROTTLE_MS) return false;
  lastPlayTime = now;
  return true;
}

export function playHoverSound() {
  if (!canPlay()) return;
  const s = getSynth();
  if (s) {
    s.triggerAttackRelease('C6', '32n');
  }
}

export function playSelectSound() {
  if (!canPlay()) return;
  const s = getSynth();
  if (s) {
    s.triggerAttackRelease('E6', '16n');
  }
}
