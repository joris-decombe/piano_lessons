import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('returns correct note name for C4 (Middle C)', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('returns correct note name for A0 (Piano Lowest)', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('returns correct note name for C8 (Piano Highest)', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('returns correct note name for sharps (C#4)', () => {
        expect(getNoteName(61)).toBe('C#4');
    });

    it('returns correct note name for sharps (F#3)', () => {
        expect(getNoteName(54)).toBe('F#3');
    });
});
