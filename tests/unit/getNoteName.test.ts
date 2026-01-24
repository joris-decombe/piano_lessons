import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('correctly converts MIDI numbers to note names', () => {
        expect(getNoteName(60)).toBe('C4');
        expect(getNoteName(61)).toBe('Db4');
        expect(getNoteName(21)).toBe('A0');
        expect(getNoteName(108)).toBe('C8');
    });

    it('handles negative octaves correctly', () => {
        expect(getNoteName(12)).toBe('C0');
        expect(getNoteName(0)).toBe('C-1');
    });
});
