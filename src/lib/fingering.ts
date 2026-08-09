/**
 * Fingering side-channel.
 *
 * MusicXML carries `<notations><technical><fingering>` per note, but the app
 * converts scores to MIDI for playback and MIDI has nowhere to put a finger
 * number. So the generator emits this lookup alongside the MIDI bytes, keyed by
 * values that survive the round-trip: track name, tick offset and pitch.
 */

/** Maps `fingeringKey(...)` → finger number (1 = thumb … 5 = little finger). */
export type FingeringMap = Record<string, number>;

export function fingeringKey(trackName: string, ticks: number, midiNumber: number): string {
    return `${trackName}:${ticks}:${midiNumber}`;
}

const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PITCH_RE = /^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/;

/** Convert a parser pitch string ("C#4", "Bb3", "Ebb2") to a MIDI note number. */
export function pitchToMidi(pitch: string): number | null {
    const match = PITCH_RE.exec(pitch);
    if (!match) return null;
    const [, step, accidental = '', octave] = match;
    const alter = accidental.startsWith('#') ? accidental.length : -accidental.length;
    return STEP_SEMITONES[step] + alter + (parseInt(octave, 10) + 1) * 12;
}
