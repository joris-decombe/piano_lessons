import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('returns C4 for MIDI 60', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('returns C#4 for MIDI 61', () => {
        expect(getNoteName(61)).toBe('C#4');
    });

    it('returns A0 for MIDI 21 (lowest piano key)', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('returns C8 for MIDI 108 (highest piano key)', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('handles negative octaves', () => {
        expect(getNoteName(0)).toBe('C-1');
    });
});
