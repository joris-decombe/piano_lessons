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
