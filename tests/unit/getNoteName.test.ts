import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('formats Middle C (60) correctly', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('formats lowest note (0) correctly', () => {
        expect(getNoteName(0)).toBe('C-1');
    });

    it('formats sharps correctly', () => {
        expect(getNoteName(61)).toBe('C#4');
    });

    it('formats high notes correctly', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('formats A440 correctly', () => {
        expect(getNoteName(69)).toBe('A4');
    });
});
