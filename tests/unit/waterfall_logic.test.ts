
import { describe, it, expect } from 'vitest';

// Mock types
interface Note {
    ticks: number;
    durationTicks: number;
    midi: number;
    name: string;
    color?: string;
}

interface Track {
    notes: Note[];
    instrument: { percussion: boolean; name: string };
    name: string;
}

interface MidiMock {
    tracks: Track[];
    header: { ppq: number };
}

// Logic copied from Waterfall.tsx (adapted for testing)
function preProcessNotes(midi: MidiMock) {
    if (!midi) return { allNotes: [], maxDuration: 0 };
    const notes: Note[] = [];
    let maxDur = 0;
    midi.tracks.forEach((track: Track) => {
        if (track.notes.length === 0) return;
        if (track.instrument.percussion) return;
        const noteColor = "#22d3ee";
        track.notes.forEach((note: Note) => {
            if (note.durationTicks > maxDur) maxDur = note.durationTicks;
            notes.push({
                ...note,
                color: noteColor
            });
        });
    });
    return { allNotes: notes.sort((a, b) => a.ticks - b.ticks), maxDuration: maxDur };
}

function calculateVisibleNotesOptimized(allNotes: Note[], maxDuration: number, currentTick: number, windowSizeTicks: number) {
    if (allNotes.length === 0) return [];

    const endTime = currentTick + windowSizeTicks;
    let startIdx = 0;
    let left = 0;
    let right = allNotes.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (allNotes[mid].ticks < currentTick) {
            left = mid + 1;
        } else {
            startIdx = mid;
            right = mid - 1;
        }
    }

    let renderStartIdx = startIdx;
    const lookbackTicks = maxDuration;
    while (renderStartIdx > 0 && allNotes[renderStartIdx - 1].ticks > currentTick - lookbackTicks) {
        renderStartIdx--;
    }

    const active: Note[] = [];

    for (let i = renderStartIdx; i < allNotes.length; i++) {
        const note = allNotes[i];
        if (note.ticks > endTime) break;

        if (note.ticks + note.durationTicks > currentTick) {
            active.push(note);
        }
    }
    return active;
}

// Generate a large MIDI mock
const generateMockMidi = (numTracks: number, notesPerTrack: number) => {
    const tracks = [];
    for (let i = 0; i < numTracks; i++) {
        const notes = [];
        for (let j = 0; j < notesPerTrack; j++) {
            notes.push({
                name: "C4",
                midi: 60,
                ticks: j * 100,
                durationTicks: 50
            });
        }
        tracks.push({
            notes,
            instrument: { percussion: false, name: "Piano" },
            name: `Track ${i}`
        });
    }
    return { tracks, header: { ppq: 480 } };
};

describe('Waterfall Logic Correctness', () => {
    const windowSizeTicks = 6 * 480;

    it('should correctly render a very long note that started way before currentTick', () => {
        const longNoteMidi = generateMockMidi(1, 1);
        // Make the note extremely long
        longNoteMidi.tracks[0].notes[0].ticks = 0;
        longNoteMidi.tracks[0].notes[0].durationTicks = 100000; // Very long duration

        const { allNotes, maxDuration } = preProcessNotes(longNoteMidi);

        const currentTick = 50000; // Middle of the note
        const visible = calculateVisibleNotesOptimized(allNotes, maxDuration, currentTick, windowSizeTicks);

        // Should contain the note
        expect(visible.length).toBe(1);
    });

    it('should correctly render normal notes inside window', () => {
        const midi = generateMockMidi(1, 10);
        const { allNotes, maxDuration } = preProcessNotes(midi);
        const currentTick = 0;
        const visible = calculateVisibleNotesOptimized(allNotes, maxDuration, currentTick, windowSizeTicks);
        // Notes at 0, 100, 200... should be visible
        expect(visible.length).toBeGreaterThan(0);
    });
});

// --- Note visual property computations (proximity, isActive) ---
// Extracted from Waterfall.tsx for testability

function computeNoteProperties(bottomPx: number, containerHeight: number) {
    const proximity = containerHeight > 0
        ? Math.max(0, Math.min(1, 1 - bottomPx / containerHeight))
        : 0;
    return {
        proximity,
        isActive: bottomPx <= 0,
    };
}

function proximityToAttr(proximity: number): string | undefined {
    if (proximity > 0.85) return "near";
    if (proximity > 0.6) return "mid";
    return undefined;
}

describe('Note Visual Properties', () => {
    const containerHeight = 600;

    describe('proximity', () => {
        it('should be 1.0 when note is at keyboard line (bottomPx = 0)', () => {
            const { proximity } = computeNoteProperties(0, containerHeight);
            expect(proximity).toBe(1);
        });

        it('should be 0.0 when note is at top of container (bottomPx = containerHeight)', () => {
            const { proximity } = computeNoteProperties(containerHeight, containerHeight);
            expect(proximity).toBe(0);
        });

        it('should be 0.5 when note is at midpoint', () => {
            const { proximity } = computeNoteProperties(containerHeight / 2, containerHeight);
            expect(proximity).toBe(0.5);
        });

        it('should clamp to 0 when note is above container', () => {
            const { proximity } = computeNoteProperties(containerHeight + 100, containerHeight);
            expect(proximity).toBe(0);
        });

        it('should clamp to 1 when note is below keyboard line', () => {
            const { proximity } = computeNoteProperties(-50, containerHeight);
            expect(proximity).toBe(1);
        });

        it('should be 0 when containerHeight is 0', () => {
            const { proximity } = computeNoteProperties(100, 0);
            expect(proximity).toBe(0);
        });
    });

    describe('proximityToAttr', () => {
        it('should return "near" when proximity > 0.85', () => {
            expect(proximityToAttr(0.9)).toBe("near");
            expect(proximityToAttr(1.0)).toBe("near");
            expect(proximityToAttr(0.86)).toBe("near");
        });

        it('should return "mid" when proximity > 0.6 but <= 0.85', () => {
            expect(proximityToAttr(0.7)).toBe("mid");
            expect(proximityToAttr(0.85)).toBe("mid");
            expect(proximityToAttr(0.61)).toBe("mid");
        });

        it('should return undefined when proximity <= 0.6', () => {
            expect(proximityToAttr(0.6)).toBeUndefined();
            expect(proximityToAttr(0.3)).toBeUndefined();
            expect(proximityToAttr(0)).toBeUndefined();
        });
    });

    describe('isActive', () => {
        it('should be true when bottomPx is 0 (note at keyboard line)', () => {
            const { isActive } = computeNoteProperties(0, containerHeight);
            expect(isActive).toBe(true);
        });

        it('should be true when bottomPx is negative (note below keyboard)', () => {
            const { isActive } = computeNoteProperties(-10, containerHeight);
            expect(isActive).toBe(true);
        });

        it('should be false when bottomPx is positive (note above keyboard)', () => {
            const { isActive } = computeNoteProperties(1, containerHeight);
            expect(isActive).toBe(false);
        });
    });
});
