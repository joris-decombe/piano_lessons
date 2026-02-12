export const BASE_PIANO_WIDTH = 1248 + 48; // 1296

/**
 * Logic for calculating the scale factor of the piano keyboard
 * to fit within the available screen width.
 */
export function calculateKeyboardScale(windowWidth: number, basePianoWidth: number = BASE_PIANO_WIDTH): number {
  if (windowWidth < basePianoWidth) {
    return windowWidth / basePianoWidth;
  }
  return 1;
}

/**
 * Ensures a playback rate is within reasonable bounds.
 */
export function validatePlaybackRate(rate: number): number {
  return Math.min(Math.max(rate, 0.1), 2.0);
}
