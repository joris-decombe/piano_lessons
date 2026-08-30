import { describe, bench } from 'vitest';
import { calculateVisibleNotes, type SourceNote } from '@/lib/waterfall-logic';
import { getKeyPosition } from '@/components/piano/geometry';

/**
 * Benchmarks the real render pass, not a copy of it. The comparison is against
 * a naive full scan, which is what the binary search plus walk-back replaced —
 * the win only matters on long scores, so the fixture is a big one.
 */

const PPQ = 480;
const WINDOW_TICKS = 6 * PPQ;
const CONTAINER_HEIGHT = 600;

function buildNotes(trackCount: number, notesPerTrack: number): SourceNote[] {
    const notes: SourceNote[] = [];
    for (let track = 0; track < trackCount; track++) {
        for (let i = 0; i < notesPerTrack; i++) {
            notes.push({
                ticks: i * 100,
                durationTicks: 50,
                midi: 21 + ((track * 7 + i) % 88),
                name: 'C4',
                color: track === 0 ? 'RIGHT' : 'LEFT',
            });
        }
    }
    return notes.sort((a, b) => a.ticks - b.ticks);
}

/** What the component did before the windowing: touch every note, every frame. */
function calculateVisibleNotesNaive(
    allNotes: SourceNote[],
    currentTick: number,
    windowSizeTicks: number,
    containerHeight: number
) {
    const endTime = currentTick + windowSizeTicks;
    return allNotes
        .filter((n) => n.ticks <= endTime && n.ticks + n.durationTicks > currentTick)
        .map((note, i) => {
            const bottomPx = Math.round(((note.ticks - currentTick) / windowSizeTicks) * containerHeight);
            const heightPx = Math.round((note.durationTicks / windowSizeTicks) * containerHeight);
            const { left, width, isBlack } = getKeyPosition(note.midi);
            return {
                id: `${note.name}-${note.ticks}-${i}`,
                left, width, isBlack,
                bottom: bottomPx,
                height: heightPx,
                color: note.color,
                proximity: containerHeight > 0 ? Math.max(0, Math.min(1, 1 - bottomPx / containerHeight)) : 0,
                isActive: bottomPx <= 0,
            };
        });
}

describe('Waterfall render pass', () => {
    const allNotes = buildNotes(4, 2000);
    const maxDuration = 50;
    // Mid-score: the naive scan pays for everything behind the playhead.
    const currentTick = 100_000;

    bench('calculateVisibleNotes (shipping)', () => {
        calculateVisibleNotes(allNotes, {
            currentTick,
            windowSizeTicks: WINDOW_TICKS,
            maxDuration,
            containerHeight: CONTAINER_HEIGHT,
        });
    });

    bench('full scan (pre-windowing baseline)', () => {
        calculateVisibleNotesNaive(allNotes, currentTick, WINDOW_TICKS, CONTAINER_HEIGHT);
    });
});
