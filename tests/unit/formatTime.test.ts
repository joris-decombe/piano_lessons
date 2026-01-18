import { describe, it, expect } from 'vitest';
import { formatTime } from '../../src/lib/utils';

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
