import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('formats Middle C (60) correctly', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('formats A440 (69) correctly', () => {
        expect(getNoteName(69)).toBe('A4');
    });

    it('formats lowest MIDI note (21) correctly', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('formats highest MIDI note (108) correctly', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('formats sharps correctly', () => {
        expect(getNoteName(61)).toBe('C#4');
    });

    it('formats negatives correctly (theoretical)', () => {
        expect(getNoteName(0)).toBe('C-1');
    });
});
