
import { describe, it, expect } from 'vitest';
import { calculateKeyboardScale, validatePlaybackRate } from '../../src/lib/audio-logic';

describe('Audio and UI Logic', () => {
  describe('calculateKeyboardScale', () => {
    const BASE_WIDTH = 1248 + 48; // 1296

    it('should return 1 if window is wider than base piano width', () => {
      expect(calculateKeyboardScale(1400)).toBe(1);
      expect(calculateKeyboardScale(BASE_WIDTH)).toBe(1);
    });

    it('should scale down if window is narrower than base piano width', () => {
      // iPad Pro 11 landscape is usually 1194 or 1210 depending on safe areas
      const iPadWidth = 1194;
      const scale = calculateKeyboardScale(iPadWidth);
      expect(scale).toBeLessThan(1);
      expect(scale).toBe(iPadWidth / BASE_WIDTH);
    });

    it('should not scale below 0.5', () => {
      expect(calculateKeyboardScale(300)).toBe(0.5);
    });
  });

  describe('validatePlaybackRate', () => {
    it('should keep valid rates as is', () => {
      expect(validatePlaybackRate(1.0)).toBe(1.0);
      expect(validatePlaybackRate(0.5)).toBe(0.5);
      expect(validatePlaybackRate(2.0)).toBe(2.0);
    });

    it('should clamp rates to min 0.1', () => {
      expect(validatePlaybackRate(0.05)).toBe(0.1);
      expect(validatePlaybackRate(-1)).toBe(0.1);
    });

    it('should clamp rates to max 2.0', () => {
      expect(validatePlaybackRate(2.5)).toBe(2.0);
      expect(validatePlaybackRate(10)).toBe(2.0);
    });
  });
});
