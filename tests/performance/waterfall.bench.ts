
import { describe, bench } from 'vitest';

// Mock the types and function logic since we can't easily import the React component directly for a pure performance test of the logic.
// We are testing the logic inside useMemo in Waterfall.tsx

function getNotePosition(midiNote: number) {
    const whiteKeyWidth = 100 / 52;
    let whiteKeyCount = 0;
    for (let i = 21; i < midiNote; i++) {
        const n = i % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(n);
        if (!isBlack) whiteKeyCount++;
    }

    const n = midiNote % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(n);

    if (!isBlack) {
        return { left: whiteKeyCount * whiteKeyWidth, width: whiteKeyWidth, isBlack: false };
    } else {
        const blackWidth = 1.25;
        return { left: (whiteKeyCount * whiteKeyWidth) - (blackWidth / 2), width: blackWidth, isBlack: true };
    }
}

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

function calculateVisibleNotesOriginal(midi: MidiMock, currentTick: number, windowSizeTicks: number) {
    if (!midi) return [];
    const active: { id: string; left: string; width: string; bottom: string; height: string; isBlack: boolean; name: string; color: string }[] = [];

    midi.tracks.forEach((track: Track) => {
        if (track.notes.length === 0) return;
        if (track.instrument.percussion) return;

        const noteColor = "#22d3ee"; // Simplified

        track.notes.forEach((note: Note) => {
            if (note.ticks + note.durationTicks > currentTick && note.ticks < currentTick + windowSizeTicks) {
                const bottomPct = ((note.ticks - currentTick) / windowSizeTicks) * 100;
                const heightPct = (note.durationTicks / windowSizeTicks) * 100;
                const { left, width, isBlack } = getNotePosition(note.midi);
                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left: `${left}%`,
                    width: `${width}%`,
                    bottom: `${bottomPct}%`,
                    height: `${heightPct}%`,
                    isBlack,
                    name: note.name,
                    color: noteColor
                });
            }
        });
    });
    return active;
}

function preProcessNotes(midi: MidiMock) {
    if (!midi) return { allNotes: [], maxDuration: 0 };
    const notes: Note[] = [];
    let maxDur = 0;
    midi.tracks.forEach((track: Track) => {
        if (track.notes.length === 0) return;
        if (track.instrument.percussion) return;
        const noteColor = "#22d3ee"; // Simplified
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

    const active: { id: string; left: string; width: string; bottom: string; height: string; isBlack: boolean; name: string; color: string }[] = [];

    for (let i = renderStartIdx; i < allNotes.length; i++) {
        const note = allNotes[i];
        if (note.ticks > endTime) break;

        if (note.ticks + note.durationTicks > currentTick) {
                const bottomPct = ((note.ticks - currentTick) / windowSizeTicks) * 100;
                const heightPct = (note.durationTicks / windowSizeTicks) * 100;
                const { left, width, isBlack } = getNotePosition(note.midi);
                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left: `${left}%`,
                    width: `${width}%`,
                    bottom: `${bottomPct}%`,
                    height: `${heightPct}%`,
                    isBlack,
                    name: note.name,
                    color: note.color
                });
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

describe('Waterfall Render Logic', () => {
    const midi = generateMockMidi(5, 2000); // 10,000 notes
    const windowSizeTicks = 6 * 480;

    // Simulate what happens in the component
    const { allNotes, maxDuration } = preProcessNotes(midi);

    bench('calculateVisibleNotes - Original', () => {
        const currentTick = 50000;
        calculateVisibleNotesOriginal(midi, currentTick, windowSizeTicks);
    });

    bench('calculateVisibleNotes - Optimized', () => {
        const currentTick = 50000;
        calculateVisibleNotesOptimized(allNotes, maxDuration, currentTick, windowSizeTicks, 480);
    });
});
