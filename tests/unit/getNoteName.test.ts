import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('returns C-1 for MIDI 0', () => {
        expect(getNoteName(0)).toBe('C-1');
    });

    it('returns C4 for MIDI 60', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('returns A4 for MIDI 69', () => {
        expect(getNoteName(69)).toBe('A4');
    });

    it('returns G9 for MIDI 127', () => {
        expect(getNoteName(127)).toBe('G9');
    });

    it('handles sharps correctly', () => {
        expect(getNoteName(61)).toBe('C#4');
    });
});
