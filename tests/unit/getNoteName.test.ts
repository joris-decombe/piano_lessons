import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('returns C4 for MIDI 60', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('returns A0 for MIDI 21', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('returns C8 for MIDI 108', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('handles sharps correctly', () => {
        expect(getNoteName(61)).toBe('C#4');
        expect(getNoteName(66)).toBe('F#4');
    });

    it('handles negative octaves', () => {
        expect(getNoteName(0)).toBe('C-1');
        expect(getNoteName(12)).toBe('C0');
    });
});
