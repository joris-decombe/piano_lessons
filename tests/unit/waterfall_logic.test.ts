import { describe, it, expect } from 'vitest';
import {
    calculateVisibleNotes,
    findRenderStartIndex,
    computeProximity,
    proximityToAttr,
    MIN_HEIGHT_FOR_FINGER,
    type SourceNote,
} from '@/lib/waterfall-logic';

const CONTAINER_HEIGHT = 600;
const WINDOW_TICKS = 6 * 480;

function note(overrides: Partial<SourceNote> = {}): SourceNote {
    return { ticks: 0, durationTicks: 50, midi: 60, name: 'C4', color: 'RIGHT', ...overrides };
}

/** A run of notes 100 ticks apart, as the waterfall receives them: sorted. */
function notesEvery100(count: number, durationTicks = 50): SourceNote[] {
    return Array.from({ length: count }, (_, i) => note({ ticks: i * 100, durationTicks }));
}

function visible(allNotes: SourceNote[], currentTick: number, maxDuration?: number) {
    return calculateVisibleNotes(allNotes, {
        currentTick,
        windowSizeTicks: WINDOW_TICKS,
        maxDuration: maxDuration ?? Math.max(0, ...allNotes.map((n) => n.durationTicks)),
        containerHeight: CONTAINER_HEIGHT,
    });
}

describe('visible note selection', () => {
    it('keeps rendering a long note that started far before the current position', () => {
        // The reason findRenderStartIndex walks back past the binary search hit:
        // a note held under the playhead is still on screen.
        const held = [note({ ticks: 0, durationTicks: 100_000 })];
        expect(visible(held, 50_000)).toHaveLength(1);
    });

    it('drops notes that have already finished', () => {
        const finished = [note({ ticks: 0, durationTicks: 50 })];
        expect(visible(finished, 50)).toHaveLength(0);
        expect(visible(finished, 49)).toHaveLength(1);
    });

    it('stops at the end of the look-ahead window', () => {
        const notes = notesEvery100(200);
        const shown = visible(notes, 0);
        expect(shown.length).toBeGreaterThan(0);
        // Nothing beyond currentTick + window is built.
        const lastTick = (shown.length - 1) * 100;
        expect(lastTick).toBeLessThanOrEqual(WINDOW_TICKS);
        expect(notes.length).toBeGreaterThan(shown.length);
    });

    it('returns nothing for an empty score', () => {
        expect(calculateVisibleNotes([], {
            currentTick: 0, windowSizeTicks: WINDOW_TICKS, maxDuration: 0, containerHeight: CONTAINER_HEIGHT,
        })).toEqual([]);
    });

    it('gives every rendered note a distinct key', () => {
        // Same pitch and tick in two tracks would collide without the index.
        const stacked = [note({ ticks: 0 }), note({ ticks: 0 })];
        const ids = visible(stacked, 0).map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('positions a note by how far ahead it is', () => {
        const [ahead] = visible([note({ ticks: WINDOW_TICKS / 2, durationTicks: WINDOW_TICKS / 2 })], 0);
        expect(ahead.bottom).toBe(CONTAINER_HEIGHT / 2);
        expect(ahead.height).toBe(CONTAINER_HEIGHT / 2);
        expect(ahead.isActive).toBe(false);
    });

    it('marks a note active once it reaches the keyboard', () => {
        const [arriving] = visible([note({ ticks: 0, durationTicks: 500 })], 0);
        expect(arriving.bottom).toBe(0);
        expect(arriving.isActive).toBe(true);
        expect(arriving.proximity).toBe(1);
    });

    it('hides finger numbers on blocks too short to hold one', () => {
        const shortTicks = Math.floor((MIN_HEIGHT_FOR_FINGER - 2) * WINDOW_TICKS / CONTAINER_HEIGHT);
        const longTicks = Math.ceil((MIN_HEIGHT_FOR_FINGER + 2) * WINDOW_TICKS / CONTAINER_HEIGHT);

        const [tooShort] = visible([note({ durationTicks: shortTicks, finger: 3 })], 0);
        expect(tooShort.height).toBeLessThan(MIN_HEIGHT_FOR_FINGER);
        expect(tooShort.finger).toBeUndefined();

        const [longEnough] = visible([note({ durationTicks: longTicks, finger: 3 })], 0);
        expect(longEnough.finger).toBe(3);
    });

    it('carries the hand colour through untouched', () => {
        const [left] = visible([note({ color: 'LEFT', durationTicks: 500 })], 0);
        expect(left.color).toBe('LEFT');
    });
});

describe('findRenderStartIndex', () => {
    it('starts at the first note that is still relevant', () => {
        const notes = notesEvery100(10, 50);
        // At tick 500, notes before 450 have finished; the walk-back stops there.
        expect(findRenderStartIndex(notes, 500, 50)).toBe(5);
    });

    it('walks back far enough to catch anything still sounding', () => {
        const notes = notesEvery100(10, 400);
        expect(findRenderStartIndex(notes, 500, 400)).toBeLessThan(5);
    });

    it('handles a position before every note', () => {
        expect(findRenderStartIndex(notesEvery100(5), 0, 50)).toBe(0);
    });
});

describe('proximity', () => {
    it('runs from 0 at the top of the fall to 1 at the keyboard', () => {
        expect(computeProximity(0, CONTAINER_HEIGHT)).toBe(1);
        expect(computeProximity(CONTAINER_HEIGHT / 2, CONTAINER_HEIGHT)).toBe(0.5);
        expect(computeProximity(CONTAINER_HEIGHT, CONTAINER_HEIGHT)).toBe(0);
    });

    it('clamps outside the container and survives a zero height', () => {
        expect(computeProximity(CONTAINER_HEIGHT + 100, CONTAINER_HEIGHT)).toBe(0);
        expect(computeProximity(-50, CONTAINER_HEIGHT)).toBe(1);
        expect(computeProximity(100, 0)).toBe(0);
    });

    it('maps to the glow tiers CSS expects', () => {
        expect(proximityToAttr(1.0)).toBe('near');
        expect(proximityToAttr(0.86)).toBe('near');
        expect(proximityToAttr(0.85)).toBe('mid');
        expect(proximityToAttr(0.61)).toBe('mid');
        expect(proximityToAttr(0.6)).toBeUndefined();
        expect(proximityToAttr(0)).toBeUndefined();
    });
});
