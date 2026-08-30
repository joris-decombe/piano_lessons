/**
 * Turns a loaded MIDI into engraved notation: a grand staff of measures,
 * chords, rests and accidentals.
 *
 * The app plays MIDI no matter what the source file was, so this reads the same
 * `Midi` object the waterfall does. That keeps one code path for MusicXML,
 * plain MIDI and ABC — at the cost of having to recover the things MIDI throws
 * away (key signature, spelling, note values, rests), which is what most of the
 * work below is.
 *
 * Pure and dependency-free on purpose: every heuristic here is unit-tested.
 */

import { getHandIndexForTrack } from '@/lib/note-colors';
import { FingeringMap, fingeringKey } from '@/lib/fingering';

/** 0 = treble (right hand), 1 = bass (left hand) */
export type StaffId = 0 | 1;

export type AccidentalKind = 'sharp' | 'flat' | 'natural';

export interface NoteValue {
    /** 1 = whole, 2 = half, 4 = quarter, 8 = eighth, 16, 32 */
    denom: number;
    dots: 0 | 1;
}

export interface NotationNote {
    midi: number;
    /** Diatonic staff step: octave * 7 + letter index (C = 0 … B = 6) */
    step: number;
    /** Semitone alteration implied by the spelling (-2 … 2) */
    alter: number;
    /** Accidental to draw, or null when the key signature already says it */
    accidental: AccidentalKind | null;
    /** Head shifted to the far side of the stem, for clustered seconds */
    shifted: boolean;
    /** Onset of the sounding note (not of this tied segment) */
    noteTicks: number;
    /** End of the sounding note, for playhead highlighting */
    noteEndTicks: number;
    finger?: number;
}

export interface NotationChord {
    /** Onset of this segment; equals the note onset unless split at a barline */
    ticks: number;
    durationTicks: number;
    staff: StaffId;
    /** Column within the onset, for staves carrying more than one voice */
    voice: number;
    value: NoteValue;
    stemUp: boolean;
    notes: NotationNote[];
    /** This segment continues a note that started in an earlier measure */
    tiedFromPrev: boolean;
    /** This segment is continued in the next measure */
    tiedToNext: boolean;
    /** Index into `NotationScore.beams`, or -1 when this chord carries flags */
    beam: number;
}

export interface NotationRest {
    ticks: number;
    durationTicks: number;
    staff: StaffId;
    value: NoteValue;
}

export interface NotationMeasure {
    /** 1-based, the number a musician would call this bar */
    number: number;
    startTicks: number;
    endTicks: number;
    timeSignature: [number, number];
}

export interface NotationScore {
    ppq: number;
    /** Key signature in fifths: negative = flats, positive = sharps */
    fifths: number;
    measures: NotationMeasure[];
    chords: NotationChord[];
    /** Runs of chord indices joined by a beam, in `chords` order */
    beams: number[][];
    rests: NotationRest[];
    totalTicks: number;
}

export interface BuildOptions {
    /** 'tracks' follows the score's own hands; 'point' splits at a pitch */
    splitStrategy?: 'tracks' | 'point';
    /** MIDI number at and above which notes go on the treble staff */
    splitPoint?: number;
    fingerings?: FingeringMap | null;
}

/** The shape this module needs from `@tonejs/midi` — a plain object also works */
export interface SourceNote {
    ticks: number;
    durationTicks: number;
    midi: number;
}
export interface SourceTrack {
    name: string;
    notes: SourceNote[];
}
export interface SourceMidi {
    header: {
        ppq: number;
        timeSignatures: { ticks: number; timeSignature: number[] }[];
        keySignatures?: { ticks: number; key: string; scale: string }[];
    };
    tracks: SourceTrack[];
}

// ---------------------------------------------------------------------------
// Key signatures and spelling
// ---------------------------------------------------------------------------

/** Letters take their key-signature accidental in this order */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

const MAJOR_FIFTHS: Record<string, number> = {
    C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
    F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
const MINOR_FIFTHS: Record<string, number> = {
    A: 0, E: 1, B: 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D#': 6, 'A#': 7,
    D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6, Ab: -7,
};

/** Sharp-side spelling of each pitch class: [letter, alteration] */
const SHARP_SPELLING: [string, number][] = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
    ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];
/** Flat-side spelling of each pitch class */
const FLAT_SPELLING: [string, number][] = [
    ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
    ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
];

/** Fifths implied by a `@tonejs/midi` key signature event, or null if unknown */
export function fifthsFromKeyName(key: string, scale: string): number | null {
    const table = scale === 'minor' ? MINOR_FIFTHS : MAJOR_FIFTHS;
    const fifths = table[key];
    return fifths === undefined ? null : fifths;
}

/** Semitone the key signature applies to a letter (-1, 0 or 1) */
export function keyAlterForLetter(letter: string, fifths: number): number {
    if (fifths > 0) return SHARP_ORDER.slice(0, fifths).includes(letter) ? 1 : 0;
    if (fifths < 0) return FLAT_ORDER.slice(0, -fifths).includes(letter) ? -1 : 0;
    return 0;
}

/** Pitch classes of the major scale for a given signature */
function scalePitchClasses(fifths: number): Set<number> {
    // Major scale of the key whose signature this is: tonic = 7 * fifths mod 12
    const tonic = ((fifths * 7) % 12 + 12) % 12;
    return new Set([0, 2, 4, 5, 7, 9, 11].map(step => (tonic + step) % 12));
}

/**
 * Guess a key signature from the notes themselves, for files that carry none.
 * Scores the 15 signatures by how many notes fall outside the scale and prefers
 * the plainest signature among ties — C major beats a chromatic reading of B#.
 */
export function inferFifths(pitchClassCounts: number[]): number {
    let best = 0;
    let bestScore = Infinity;
    for (let fifths = -7; fifths <= 7; fifths++) {
        const inScale = scalePitchClasses(fifths);
        let outside = 0;
        for (let pc = 0; pc < 12; pc++) {
            if (!inScale.has(pc)) outside += pitchClassCounts[pc];
        }
        // Nudge towards simpler signatures so a handful of accidentals doesn't
        // drag a C major piece into five sharps.
        const score = outside + Math.abs(fifths) * 0.5;
        if (score < bestScore - 1e-9) {
            bestScore = score;
            best = fifths;
        }
    }
    return best;
}

/** Spell a MIDI number as a staff step plus alteration, honouring the key */
export function spellPitch(midi: number, fifths: number): { step: number; alter: number } {
    const pc = ((midi % 12) + 12) % 12;
    const table = fifths < 0 ? FLAT_SPELLING : SHARP_SPELLING;
    const [letter, alter] = table[pc];
    // The octave number of the letter, not of the MIDI pitch: B#3 and C4 are
    // the same key but sit an octave apart on the staff.
    const octave = Math.floor((midi - alter) / 12) - 1;
    return { step: octave * 7 + LETTER_INDEX[letter], alter };
}

/** Letter (C = 0 … B = 6) of a staff step */
export function letterOfStep(step: number): string {
    const index = ((step % 7) + 7) % 7;
    return ['C', 'D', 'E', 'F', 'G', 'A', 'B'][index];
}

// ---------------------------------------------------------------------------
// Note values
// ---------------------------------------------------------------------------

const VALUE_CANDIDATES: NoteValue[] = [
    { denom: 1, dots: 0 }, { denom: 2, dots: 1 }, { denom: 2, dots: 0 },
    { denom: 4, dots: 1 }, { denom: 4, dots: 0 }, { denom: 8, dots: 1 },
    { denom: 8, dots: 0 }, { denom: 16, dots: 1 }, { denom: 16, dots: 0 },
    { denom: 32, dots: 0 },
];

export function valueTicks(value: NoteValue, ppq: number): number {
    const base = (ppq * 4) / value.denom;
    return value.dots ? base * 1.5 : base;
}

/**
 * Pick the note value that best matches a duration in ticks.
 *
 * Matching on the *ratio* rather than the difference is what makes this survive
 * real MIDI files, where a played quarter note is routinely 60–90% of its
 * written length. A staccato quarter still reads as a quarter, not an eighth.
 */
export function quantizeValue(durationTicks: number, ppq: number): NoteValue {
    if (durationTicks <= 0) return { denom: 32, dots: 0 };
    let best = VALUE_CANDIDATES[VALUE_CANDIDATES.length - 1];
    let bestError = Infinity;
    for (const candidate of VALUE_CANDIDATES) {
        const error = Math.abs(Math.log(durationTicks / valueTicks(candidate, ppq)));
        if (error < bestError) {
            bestError = error;
            best = candidate;
        }
    }
    return best;
}

/** Largest value that fits in `ticks`, for filling silence with rests */
function largestValueWithin(ticks: number, ppq: number): NoteValue | null {
    for (const candidate of VALUE_CANDIDATES) {
        if (valueTicks(candidate, ppq) <= ticks + 1e-6) return candidate;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Measures
// ---------------------------------------------------------------------------

/** Bar lines from the tempo map, walking any mid-piece metre changes */
export function buildMeasures(
    ppq: number,
    timeSignatures: { ticks: number; timeSignature: number[] }[],
    totalTicks: number,
): NotationMeasure[] {
    const changes = timeSignatures.length > 0
        ? [...timeSignatures].sort((a, b) => a.ticks - b.ticks)
        : [{ ticks: 0, timeSignature: [4, 4] }];
    if (changes[0].ticks > 0) changes.unshift({ ticks: 0, timeSignature: [4, 4] });

    const measures: NotationMeasure[] = [];
    let tick = 0;
    let number = 1;
    let changeIndex = 0;
    // Bar past the end of the music, so the last note has a bar to sit in
    const end = Math.max(totalTicks, 1);

    while (tick < end && measures.length < 5000) {
        while (
            changeIndex + 1 < changes.length &&
            changes[changeIndex + 1].ticks <= tick
        ) {
            changeIndex++;
        }
        const [beats, beatType] = changes[changeIndex].timeSignature;
        const safeBeats = beats > 0 ? beats : 4;
        const safeType = beatType > 0 ? beatType : 4;
        let length = Math.round((ppq * 4 * safeBeats) / safeType);
        if (length <= 0) length = ppq * 4;

        // A metre change mid-bar cuts the bar short, as it does on paper
        const next = changes[changeIndex + 1];
        if (next && next.ticks > tick && next.ticks < tick + length) {
            length = next.ticks - tick;
        }

        measures.push({
            number,
            startTicks: tick,
            endTicks: tick + length,
            timeSignature: [safeBeats, safeType],
        });
        tick += length;
        number++;
    }
    return measures;
}

// ---------------------------------------------------------------------------
// Score assembly
// ---------------------------------------------------------------------------

interface RawNote extends SourceNote {
    staff: StaffId;
    finger?: number;
}

/** Which staff a note belongs on, by the same rule the waterfall colours by */
function staffForNote(
    handIndex: number,
    midi: number,
    strategy: 'tracks' | 'point',
    splitPoint: number,
): StaffId {
    if (strategy === 'point') return midi < splitPoint ? 1 : 0;
    return handIndex >= 1 ? 1 : 0;
}

export function buildNotationScore(midi: SourceMidi, options: BuildOptions = {}): NotationScore {
    const ppq = midi.header.ppq > 0 ? midi.header.ppq : 128;
    const fingerings = options.fingerings ?? null;
    const splitPoint = options.splitPoint ?? 60;

    // A single-track file has no hands to follow, so fall back to a pitch split
    const trackCount = midi.tracks.filter(track => track.notes.length > 0).length;
    const strategy: 'tracks' | 'point' =
        options.splitStrategy === 'point' || trackCount <= 1 ? 'point' : 'tracks';

    const raw: RawNote[] = [];
    const pitchClassCounts = new Array(12).fill(0);
    let totalTicks = 0;

    midi.tracks.forEach((track, trackIndex) => {
        const handIndex = getHandIndexForTrack(track.name ?? '', trackIndex);
        for (const note of track.notes) {
            const staff = staffForNote(handIndex, note.midi, strategy, splitPoint);
            const finger = fingerings?.[fingeringKey(track.name ?? '', note.ticks, note.midi)];
            const entry: RawNote = {
                ticks: note.ticks,
                durationTicks: Math.max(1, note.durationTicks),
                midi: note.midi,
                staff,
            };
            if (finger !== undefined) entry.finger = finger;
            raw.push(entry);
            pitchClassCounts[((note.midi % 12) + 12) % 12]++;
            totalTicks = Math.max(totalTicks, note.ticks + entry.durationTicks);
        }
    });

    const declared = midi.header.keySignatures?.[0];
    const declaredFifths = declared ? fifthsFromKeyName(declared.key, declared.scale) : null;
    const fifths = declaredFifths ?? inferFifths(pitchClassCounts);

    const measures = buildMeasures(ppq, midi.header.timeSignatures ?? [], totalTicks);

    // 1. Cut every note at the bar lines it crosses, so nothing spills over one
    interface Segment {
        ticks: number;
        durationTicks: number;
        staff: StaffId;
        measureIndex: number;
        note: RawNote;
        tiedFromPrev: boolean;
        tiedToNext: boolean;
    }
    const segments: Segment[] = [];
    for (const note of raw) {
        const noteEnd = note.ticks + note.durationTicks;
        let index = measures.findIndex(m => note.ticks < m.endTicks && noteEnd > m.startTicks);
        if (index === -1) continue;
        let cursor = note.ticks;
        while (cursor < noteEnd && index < measures.length) {
            const measure = measures[index];
            const segmentEnd = Math.min(noteEnd, measure.endTicks);
            segments.push({
                ticks: cursor,
                durationTicks: segmentEnd - cursor,
                staff: note.staff,
                measureIndex: index,
                note,
                tiedFromPrev: cursor > note.ticks,
                tiedToNext: segmentEnd < noteEnd,
            });
            cursor = segmentEnd;
            index++;
        }
    }

    // 2. Group simultaneous segments of equal value into chords. Segments that
    //    share an onset but not a value are separate voices, drawn side by side.
    const groups = new Map<string, Segment[]>();
    for (const segment of segments) {
        const value = quantizeValue(segment.durationTicks, ppq);
        const key = `${segment.staff}:${segment.ticks}:${value.denom}.${value.dots}`;
        const bucket = groups.get(key);
        if (bucket) bucket.push(segment);
        else groups.set(key, [segment]);
    }

    // 3. Accidental state, walked in time order: a written accidental holds for
    //    the rest of its bar on that letter and octave, per staff.
    const chords: NotationChord[] = [];
    const ordered = Array.from(groups.values()).sort((a, b) => {
        if (a[0].ticks !== b[0].ticks) return a[0].ticks - b[0].ticks;
        return a[0].staff - b[0].staff;
    });

    const activeAlters = new Map<string, number>();
    let accidentalMeasure = -1;
    const voiceCounter = new Map<string, number>();

    for (const group of ordered) {
        const first = group[0];
        if (first.measureIndex !== accidentalMeasure) {
            activeAlters.clear();
            accidentalMeasure = first.measureIndex;
        }

        const value = quantizeValue(first.durationTicks, ppq);
        const notes: NotationNote[] = group
            .map(segment => {
                const { step, alter } = spellPitch(segment.note.midi, fifths);
                const letter = letterOfStep(step);
                const stateKey = `${segment.staff}:${step}`;
                const current = activeAlters.has(stateKey)
                    ? activeAlters.get(stateKey)!
                    : keyAlterForLetter(letter, fifths);
                let accidental: AccidentalKind | null = null;
                if (alter !== current) {
                    // A note tied over the bar line keeps its accidental in
                    // force but doesn't restate it, the way it reads on paper.
                    if (!segment.tiedFromPrev) {
                        accidental = alter === 0 ? 'natural' : alter > 0 ? 'sharp' : 'flat';
                    }
                    activeAlters.set(stateKey, alter);
                }
                const note: NotationNote = {
                    midi: segment.note.midi,
                    step,
                    alter,
                    accidental,
                    shifted: false,
                    noteTicks: segment.note.ticks,
                    noteEndTicks: segment.note.ticks + segment.note.durationTicks,
                };
                if (segment.note.finger !== undefined) note.finger = segment.note.finger;
                return note;
            })
            .sort((a, b) => a.step - b.step);

        // Seconds can't share a side of the stem — push every other one across
        for (let i = 1; i < notes.length; i++) {
            if (notes[i].step - notes[i - 1].step === 1 && !notes[i - 1].shifted) {
                notes[i].shifted = true;
            }
        }

        const onsetKey = `${first.staff}:${first.ticks}`;
        const voice = voiceCounter.get(onsetKey) ?? 0;
        voiceCounter.set(onsetKey, voice + 1);

        // Stems point away from the middle line, unless a second voice on the
        // same staff has already claimed the up direction.
        const middleStep = first.staff === 0 ? 34 : 22; // B4 on treble, D3 on bass
        const average = notes.reduce((sum, n) => sum + n.step, 0) / notes.length;
        const stemUp = voice === 0 ? average < middleStep : voice % 2 === 0;

        chords.push({
            ticks: first.ticks,
            durationTicks: first.durationTicks,
            staff: first.staff,
            voice,
            value,
            stemUp,
            notes,
            tiedFromPrev: group.some(s => s.tiedFromPrev),
            tiedToNext: group.some(s => s.tiedToNext),
            beam: -1,
        });
    }

    const beams = buildBeams(chords, measures, ppq);

    return {
        ppq,
        fifths,
        measures,
        chords,
        beams,
        rests: buildRests(chords, measures, ppq),
        totalTicks,
    };
}

/** Ticks in one beamed group for a metre — compound time beams in dotted beats */
export function beatTicks(timeSignature: [number, number], ppq: number): number {
    const [beats, beatType] = timeSignature;
    const unit = (ppq * 4) / beatType;
    // 6/8, 9/8 and 12/8 group in threes; everything else beams per beat
    if (beatType === 8 && beats % 3 === 0) return unit * 3;
    return unit;
}

/**
 * Join runs of short notes under a beam, the way an engraver would: same staff,
 * same voice, no gap between them, and all inside one beat of the bar. Anything
 * left over keeps its flags.
 *
 * `chords` is mutated to record each chord's beam index.
 */
export function buildBeams(
    chords: NotationChord[],
    measures: NotationMeasure[],
    ppq: number,
): number[][] {
    const byVoice = new Map<string, number[]>();
    chords.forEach((chord, index) => {
        if (chord.value.denom < 8) return;
        const key = `${chord.staff}:${chord.voice}`;
        const bucket = byVoice.get(key);
        if (bucket) bucket.push(index);
        else byVoice.set(key, [index]);
    });

    const beams: number[][] = [];
    let measureIndex = 0;

    const beatOf = (ticks: number): string => {
        while (
            measureIndex < measures.length - 1 &&
            measures[measureIndex].endTicks <= ticks
        ) {
            measureIndex++;
        }
        while (measureIndex > 0 && measures[measureIndex].startTicks > ticks) {
            measureIndex--;
        }
        const measure = measures[measureIndex];
        if (!measure) return `x${ticks}`;
        const unit = beatTicks(measure.timeSignature, ppq);
        return `${measure.number}:${Math.floor((ticks - measure.startTicks) / unit)}`;
    };

    for (const indices of byVoice.values()) {
        indices.sort((a, b) => chords[a].ticks - chords[b].ticks);
        let run: number[] = [];
        let runBeat = '';

        const flush = () => {
            if (run.length >= 2) {
                const id = beams.length;
                for (const index of run) chords[index].beam = id;
                beams.push(run);
            }
            run = [];
        };

        for (const index of indices) {
            const chord = chords[index];
            const beat = beatOf(chord.ticks);
            const previous = run.length > 0 ? chords[run[run.length - 1]] : null;
            const contiguous =
                previous !== null &&
                previous.ticks + previous.durationTicks === chord.ticks &&
                beat === runBeat;
            if (!contiguous) {
                flush();
                runBeat = beat;
            }
            run.push(index);
        }
        flush();
    }
    return beams;
}

/**
 * Fill the silences. Real engraving needs one rest per voice; this fills only
 * spans where a whole staff is silent, which is what a reader following along
 * actually needs to see.
 */
export function buildRests(
    chords: NotationChord[],
    measures: NotationMeasure[],
    ppq: number,
): NotationRest[] {
    const rests: NotationRest[] = [];
    const minimum = ppq / 2; // Anything shorter is a gap between notes, not a rest

    for (const staff of [0, 1] as StaffId[]) {
        // Merge the staff's sounding spans into disjoint intervals once, then
        // sweep the bars against them — the naive nested walk is quadratic and
        // a long score has thousands of both.
        const sorted = chords
            .filter(chord => chord.staff === staff)
            .map(chord => [chord.ticks, chord.ticks + chord.durationTicks] as [number, number])
            .sort((a, b) => a[0] - b[0]);
        if (sorted.length === 0) continue;

        const merged: [number, number][] = [];
        for (const span of sorted) {
            const last = merged[merged.length - 1];
            if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
            else merged.push([span[0], span[1]]);
        }

        const lastEnd = merged[merged.length - 1][1];
        let index = 0;
        for (const measure of measures) {
            if (measure.startTicks >= lastEnd) break;
            while (index < merged.length && merged[index][1] <= measure.startTicks) index++;
            let cursor = measure.startTicks;
            for (let i = index; i < merged.length; i++) {
                const [start, end] = merged[i];
                if (start >= measure.endTicks) break;
                if (start > cursor) {
                    pushRests(rests, staff, cursor, Math.min(start, measure.endTicks), ppq, minimum);
                }
                cursor = Math.max(cursor, Math.min(end, measure.endTicks));
            }
            if (cursor < measure.endTicks) {
                pushRests(rests, staff, cursor, measure.endTicks, ppq, minimum);
            }
        }
    }
    return rests.sort((a, b) => a.ticks - b.ticks);
}

function pushRests(
    out: NotationRest[],
    staff: StaffId,
    from: number,
    to: number,
    ppq: number,
    minimum: number,
) {
    let cursor = from;
    let guard = 0;
    while (to - cursor >= minimum && guard++ < 8) {
        const value = largestValueWithin(to - cursor, ppq);
        if (!value) break;
        const ticks = valueTicks(value, ppq);
        out.push({ ticks: cursor, durationTicks: ticks, staff, value });
        cursor += ticks;
    }
}
