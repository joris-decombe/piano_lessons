import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('converts C4 (60) correctly', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('converts A0 (21) correctly', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('converts C8 (108) correctly', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('converts sharps correctly (61 -> C#4)', () => {
        expect(getNoteName(61)).toBe('C#4');
    });

    it('handles NaN safely', () => {
        expect(getNoteName(NaN)).toBe('Unknown');
    });
});
