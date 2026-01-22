import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('converts Middle C (60) to C4', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('converts A440 (69) to A4', () => {
        expect(getNoteName(69)).toBe('A4');
    });

    it('converts lowest piano note (21) to A0', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('converts highest piano note (108) to C8', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('handles sharps correctly', () => {
        expect(getNoteName(61)).toBe('C#4');
        expect(getNoteName(66)).toBe('F#4');
    });

    it('handles negative octaves (low MIDI numbers)', () => {
        expect(getNoteName(0)).toBe('C-1');
    });
});
