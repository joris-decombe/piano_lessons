
/**
 * Logic for calculating the scale factor of the piano keyboard
 * to fit within the available screen width.
 */
export function calculateKeyboardScale(windowWidth: number, basePianoWidth: number = 1248 + 48): number {
  if (windowWidth < basePianoWidth) {
    return Math.max(0.5, windowWidth / basePianoWidth);
  }
  return 1;
}

/**
 * Ensures a playback rate is within reasonable bounds.
 */
export function validatePlaybackRate(rate: number): number {
  return Math.min(Math.max(rate, 0.1), 2.0);
}
