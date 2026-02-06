import { describe, it, expect } from 'vitest';
import { formatTime, getNoteName } from '../../src/lib/utils';

describe('formatTime', () => {
    it('formats 0 seconds correctly', () => {
        expect(formatTime(0)).toBe('0:00');
    });

    it('formats seconds less than 10 with leading zero', () => {
        expect(formatTime(5)).toBe('0:05');
    });

    it('formats seconds greater than 10 correctly', () => {
        expect(formatTime(30)).toBe('0:30');
    });

    it('formats minutes correctly', () => {
        expect(formatTime(65)).toBe('1:05');
    });

    it('formats larger durations correctly', () => {
        expect(formatTime(125)).toBe('2:05');
    });

    it('handles rounding down (floors seconds)', () => {
        expect(formatTime(10.9)).toBe('0:10');
    });

    it('handles negative numbers safely', () => {
        expect(formatTime(-5)).toBe('0:00');
    });

    it('handles NaN safely', () => {
        expect(formatTime(NaN)).toBe('0:00');
    });
});

describe('getNoteName', () => {
    it('converts MIDI 60 to C4', () => {
        expect(getNoteName(60)).toBe('C4');
    });

    it('converts MIDI 21 to A0', () => {
        expect(getNoteName(21)).toBe('A0');
    });

    it('converts MIDI 108 to C8', () => {
        expect(getNoteName(108)).toBe('C8');
    });

    it('handles sharp notes (e.g. 61 -> C#4)', () => {
        expect(getNoteName(61)).toBe('C#4');
    });

    it('handles low notes (e.g. 0 -> C-1)', () => {
        expect(getNoteName(0)).toBe('C-1');
    });
});
