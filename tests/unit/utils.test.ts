import { describe, it, expect } from 'vitest';
import { getNoteName, formatTime } from '../../src/lib/utils';

describe('utils', () => {
  describe('getNoteName', () => {
    it('correctly converts MIDI numbers to note names', () => {
      expect(getNoteName(60)).toBe('C4');
      expect(getNoteName(61)).toBe('C#4');
      expect(getNoteName(69)).toBe('A4');
      expect(getNoteName(21)).toBe('A0');
      expect(getNoteName(108)).toBe('C8');
    });

    it('handles negative octaves', () => {
      expect(getNoteName(12)).toBe('C0');
      expect(getNoteName(0)).toBe('C-1');
    });
  });

  describe('formatTime', () => {
    it('formats seconds correctly', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(61)).toBe('1:01');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('handles invalid inputs', () => {
        expect(formatTime(-1)).toBe('0:00');
        expect(formatTime(NaN)).toBe('0:00');
    });
  });
});
