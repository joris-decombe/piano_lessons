import { describe, it, expect } from 'vitest';
import { getNoteName } from '../../src/lib/utils';

describe('getNoteName', () => {
    it('correctly converts Middle C (60)', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('correctly converts A440 (69)', () => {
        expect(getNoteName(69)).toBe('A4');
    });

    it('correctly converts lowest piano note (21)', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('correctly converts highest piano note (108)', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('correctly handles sharps', () => {
        expect(getNoteName(61)).toBe('C#4');
        expect(getNoteName(66)).toBe('F#4');
    });
});
