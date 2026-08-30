/**
 * Note color utilities for consistent color assignment across components
 */

export interface ColorSettings {
  split: boolean;
  left: string;
  right: string;
  unified: string;
}

export interface SplitSettings {
  strategy: 'tracks' | 'point';
  splitPoint: number; // MIDI note number for 'point' strategy
}

const DEFAULT_COLORS: ColorSettings = {
  split: true,
  left: "#fb7185",   // Rose
  right: "#22d3ee",  // Cyan
  unified: "#fbbf24" // Gold
};

/**
 * Get color for a note based on track index (tracks strategy)
 * Track 0 = right hand color, other tracks = left hand color
 */
export function getColorByTrack(
  trackIndex: number,
  colors: ColorSettings = DEFAULT_COLORS
): string {
  if (!colors.split) return colors.unified;
  return trackIndex === 0 ? colors.right : colors.left;
}

/**
 * Get color for a note based on MIDI number (point strategy)
 * Notes below splitPoint = left hand, at/above = right hand
 */
export function getColorByMidi(
  midiNumber: number,
  splitPoint: number,
  colors: ColorSettings = DEFAULT_COLORS
): string {
  if (!colors.split) return colors.unified;
  if (isNaN(midiNumber)) return colors.right;
  return midiNumber < splitPoint ? colors.left : colors.right;
}

/**
 * Get color for a note using the appropriate strategy
 */
export function getNoteColor(
  trackIndex: number,
  midiNumber: number,
  colors: ColorSettings,
  splitSettings: SplitSettings
): string {
  if (!colors.split) return colors.unified;

  if (splitSettings.strategy === 'point') {
    return getColorByMidi(midiNumber, splitSettings.splitPoint, colors);
  }

  return getColorByTrack(trackIndex, colors);
}

/**
 * Which hand a MIDI track belongs to: 0 = right, 1 = left.
 *
 * The MusicXML pipeline splits each staff into however many non-overlapping
 * layers midi-writer-js needs, so one staff can become several MIDI tracks
 * ("P1-staff1-0", "P1-staff1-1", "P1-staff2-0", …). Track *index* is therefore
 * not the hand — those four tracks are hands 0, 0, 1, 1, not 0, 1, 2, 3. The
 * staff number in the track name is what carries the hand.
 *
 * Plain MIDI files have no staff information, so they fall back to the track
 * index, which is the convention those files follow (track 0 = right hand).
 */
export function getHandIndexForTrack(trackName: string, trackIndex: number): number {
  const staffMatch = /-staff(\d+)/.exec(trackName ?? '');
  if (!staffMatch) return trackIndex;
  const staffNumber = parseInt(staffMatch[1], 10);
  // staff1 → 0 (right), staff2 → 1 (left). A malformed number is not a hand.
  return Number.isFinite(staffNumber) && staffNumber > 0 ? staffNumber - 1 : trackIndex;
}

/** Hand index for every track in a MIDI file, in track order. */
export function getHandIndexByTrack(tracks: { name: string }[]): number[] {
  return tracks.map((track, index) => getHandIndexForTrack(track.name, index));
}
