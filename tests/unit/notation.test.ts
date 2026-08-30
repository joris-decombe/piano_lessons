import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Midi } from '@tonejs/midi';
import { MusicXMLParser } from '@/lib/musicxml/parser';
import { MIDIGenerator } from '@/lib/musicxml/midi-generator';
import {
    buildMeasures,
    buildNotationScore,
    buildRests,
    fifthsFromKeyName,
    inferFifths,
    keyAlterForLetter,
    letterOfStep,
    quantizeValue,
    beatTicks,
    spellPitch,
    valueTicks,
    SourceMidi,
} from '@/lib/score/notation';

const PPQ = 128;

function fakeMidi(tracks: { name: string; notes: [number, number, number][] }[], header?: Partial<SourceMidi['header']>): SourceMidi {
    return {
        header: {
            ppq: PPQ,
            timeSignatures: [{ ticks: 0, timeSignature: [4, 4] }],
            ...header,
        },
        tracks: tracks.map(track => ({
            name: track.name,
            notes: track.notes.map(([midi, ticks, durationTicks]) => ({ midi, ticks, durationTicks })),
        })),
    };
}

/** Load a bundled score through the real MusicXML → MIDI path */
function loadScore(name: string): Midi {
    const xml = readFileSync(`public/scores/${name}.xml`, 'utf-8');
    const parsed = new MusicXMLParser().parse(xml);
    const { base64 } = new MIDIGenerator().generate(parsed);
    return new Midi(Uint8Array.from(Buffer.from(base64, 'base64')));
}

describe('note values', () => {
    it('reads exact durations as their written value', () => {
        expect(quantizeValue(PPQ * 4, PPQ)).toEqual({ denom: 1, dots: 0 });
        expect(quantizeValue(PPQ * 2, PPQ)).toEqual({ denom: 2, dots: 0 });
        expect(quantizeValue(PPQ, PPQ)).toEqual({ denom: 4, dots: 0 });
        expect(quantizeValue(PPQ / 2, PPQ)).toEqual({ denom: 8, dots: 0 });
        expect(quantizeValue(PPQ * 3, PPQ)).toEqual({ denom: 2, dots: 1 });
        expect(quantizeValue(PPQ * 1.5, PPQ)).toEqual({ denom: 4, dots: 1 });
    });

    it('still reads a shortened quarter as a quarter', () => {
        // Real MIDI gates notes short of their written length. Matching on the
        // ratio rides that out; matching on the difference would demote them.
        expect(quantizeValue(PPQ * 0.95, PPQ)).toEqual({ denom: 4, dots: 0 });
        expect(quantizeValue(PPQ * 0.87, PPQ)).toEqual({ denom: 4, dots: 0 });
        // Below the midpoint it is a dotted eighth, which is what 3/4 of a
        // quarter actually is — the quantiser is not guessing there.
        expect(quantizeValue(PPQ * 0.75, PPQ)).toEqual({ denom: 8, dots: 1 });
    });

    it('never returns a zero-length value', () => {
        expect(valueTicks(quantizeValue(0, PPQ), PPQ)).toBeGreaterThan(0);
        expect(valueTicks(quantizeValue(1, PPQ), PPQ)).toBeGreaterThan(0);
    });
});

describe('key signatures', () => {
    it('maps @tonejs/midi key names to fifths', () => {
        expect(fifthsFromKeyName('C', 'major')).toBe(0);
        expect(fifthsFromKeyName('D', 'major')).toBe(2);
        expect(fifthsFromKeyName('Eb', 'major')).toBe(-3);
        expect(fifthsFromKeyName('A', 'minor')).toBe(0);
        expect(fifthsFromKeyName('C', 'minor')).toBe(-3);
        expect(fifthsFromKeyName('nonsense', 'major')).toBeNull();
    });

    it('knows which letters the signature alters', () => {
        expect(keyAlterForLetter('F', 2)).toBe(1);
        expect(keyAlterForLetter('C', 2)).toBe(1);
        expect(keyAlterForLetter('G', 2)).toBe(0);
        expect(keyAlterForLetter('B', -1)).toBe(-1);
        expect(keyAlterForLetter('E', -1)).toBe(0);
        expect(keyAlterForLetter('F', 0)).toBe(0);
    });

    it('infers a signature from the notes when the file carries none', () => {
        const counts = new Array(12).fill(0);
        for (const pc of [0, 2, 4, 5, 7, 9, 11]) counts[pc] = 10; // C major
        expect(inferFifths(counts)).toBe(0);

        const dMajor = new Array(12).fill(0);
        for (const pc of [2, 4, 6, 7, 9, 11, 1]) dMajor[pc] = 10;
        expect(inferFifths(dMajor)).toBe(2);
    });

    it('prefers the plain signature when a few accidentals could suggest more', () => {
        const counts = new Array(12).fill(0);
        for (const pc of [0, 2, 4, 5, 7, 9, 11]) counts[pc] = 20;
        counts[6] = 1; // one passing F#
        expect(inferFifths(counts)).toBe(0);
    });
});

describe('pitch spelling', () => {
    it('places naturals on the right staff step', () => {
        expect(spellPitch(60, 0)).toEqual({ step: 28, alter: 0 }); // C4
        expect(spellPitch(64, 0)).toEqual({ step: 30, alter: 0 }); // E4, treble bottom line
        expect(spellPitch(43, 0)).toEqual({ step: 18, alter: 0 }); // G2, bass bottom line
    });

    it('spells black keys with the side the key signature uses', () => {
        expect(spellPitch(61, 2)).toEqual({ step: 28, alter: 1 });  // C#4 in D major
        expect(spellPitch(61, -3)).toEqual({ step: 29, alter: -1 }); // Db4 in Eb major
    });

    it('keeps a flat spelling in the octave its letter belongs to', () => {
        // Bb3 is written on the B step of octave 3, not on C4's
        expect(spellPitch(58, -2)).toEqual({ step: 27, alter: -1 });
        expect(letterOfStep(27)).toBe('B');
    });
});

describe('measures', () => {
    it('lays out bars from the time signature', () => {
        const measures = buildMeasures(PPQ, [{ ticks: 0, timeSignature: [3, 4] }], PPQ * 9);
        expect(measures).toHaveLength(3);
        expect(measures[0]).toMatchObject({ number: 1, startTicks: 0, endTicks: PPQ * 3 });
        expect(measures[2].startTicks).toBe(PPQ * 6);
    });

    it('defaults to 4/4 when the file declares nothing', () => {
        const measures = buildMeasures(PPQ, [], PPQ * 8);
        expect(measures[0].timeSignature).toEqual([4, 4]);
        expect(measures[0].endTicks).toBe(PPQ * 4);
    });

    it('follows a metre change mid-piece', () => {
        const measures = buildMeasures(PPQ, [
            { ticks: 0, timeSignature: [4, 4] },
            { ticks: PPQ * 8, timeSignature: [3, 4] },
        ], PPQ * 14);
        expect(measures[1].endTicks).toBe(PPQ * 8);
        expect(measures[2]).toMatchObject({ startTicks: PPQ * 8, endTicks: PPQ * 11 });
    });
});

describe('buildNotationScore', () => {
    it('puts each staff on its own hand and colours nothing by accident', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[72, 0, PPQ]] },
            { name: 'P1-staff2', notes: [[48, 0, PPQ]] },
        ]));
        const staves = score.chords.map(chord => chord.staff);
        expect(staves).toContain(0);
        expect(staves).toContain(1);
        expect(score.chords.find(c => c.notes[0].midi === 72)!.staff).toBe(0);
        expect(score.chords.find(c => c.notes[0].midi === 48)!.staff).toBe(1);
    });

    it('splits a single-track file by pitch, since it has no hands to follow', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'Piano', notes: [[72, 0, PPQ], [48, 0, PPQ]] },
        ]), { splitPoint: 60 });
        expect(score.chords.find(c => c.notes[0].midi === 72)!.staff).toBe(0);
        expect(score.chords.find(c => c.notes[0].midi === 48)!.staff).toBe(1);
    });

    it('groups simultaneous notes of equal length into one chord', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, 0, PPQ], [64, 0, PPQ], [67, 0, PPQ]] },
        ]));
        expect(score.chords).toHaveLength(1);
        expect(score.chords[0].notes.map(n => n.midi)).toEqual([60, 64, 67]);
    });

    it('offsets the upper note of a second so two heads do not overlap', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, 0, PPQ], [62, 0, PPQ]] },
        ]));
        expect(score.chords[0].notes.map(n => n.shifted)).toEqual([false, true]);
    });

    it('cuts a note that crosses a bar line into tied segments', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, PPQ * 3, PPQ * 2]] },
        ]));
        expect(score.chords).toHaveLength(2);
        expect(score.chords[0]).toMatchObject({ ticks: PPQ * 3, durationTicks: PPQ, tiedToNext: true });
        expect(score.chords[1]).toMatchObject({ ticks: PPQ * 4, durationTicks: PPQ, tiedFromPrev: true });
        // Both halves still report the sounding note, so the playhead lights both
        expect(score.chords[1].notes[0].noteTicks).toBe(PPQ * 3);
    });

    it('writes an accidental once per bar and restates it in the next', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[61, 0, PPQ], [61, PPQ, PPQ], [61, PPQ * 4, PPQ]] },
        ], { keySignatures: [{ ticks: 0, key: 'C', scale: 'major' }] }));
        expect(score.fifths).toBe(0);
        expect(score.chords[0].notes[0].accidental).toBe('sharp');
        expect(score.chords[1].notes[0].accidental).toBeNull();
        expect(score.chords[2].notes[0].accidental).toBe('sharp');
    });

    it('leaves notes the key signature covers unmarked', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[66, 0, PPQ]] }, // F#4
        ], { keySignatures: [{ ticks: 0, key: 'D', scale: 'major' }] }));
        expect(score.fifths).toBe(2);
        expect(score.chords[0].notes[0].accidental).toBeNull();
    });

    it('marks a natural when a note contradicts the signature', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[65, 0, PPQ]] }, // F natural in D major
        ], { keySignatures: [{ ticks: 0, key: 'D', scale: 'major' }] }));
        expect(score.chords[0].notes[0].accidental).toBe('natural');
    });

    it('points stems away from the middle line', () => {
        const low = buildNotationScore(fakeMidi([{ name: 'P1-staff1', notes: [[60, 0, PPQ]] }]));
        const high = buildNotationScore(fakeMidi([{ name: 'P1-staff1', notes: [[81, 0, PPQ]] }]));
        expect(low.chords[0].stemUp).toBe(true);
        expect(high.chords[0].stemUp).toBe(false);
    });
});

describe('beaming', () => {
    it('joins a run of eighths inside one beat', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, 0, PPQ / 2], [62, PPQ / 2, PPQ / 2]] },
        ]));
        expect(score.beams).toHaveLength(1);
        expect(score.beams[0]).toHaveLength(2);
        expect(score.chords.every(chord => chord.beam === 0)).toBe(true);
    });

    it('does not beam across a beat boundary', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, PPQ / 2, PPQ / 2], [62, PPQ, PPQ / 2]] },
        ]));
        expect(score.beams).toHaveLength(0);
        expect(score.chords.every(chord => chord.beam === -1)).toBe(true);
    });

    it('leaves a lone eighth with its flag', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, 0, PPQ / 2], [62, PPQ, PPQ]] },
        ]));
        expect(score.beams).toHaveLength(0);
    });

    it('never beams quarters or longer', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, 0, PPQ], [62, PPQ, PPQ]] },
        ]));
        expect(score.beams).toHaveLength(0);
    });

    it('groups compound metres in dotted beats', () => {
        expect(beatTicks([12, 8], PPQ)).toBe(PPQ * 1.5);
        expect(beatTicks([6, 8], PPQ)).toBe(PPQ * 1.5);
        expect(beatTicks([4, 4], PPQ)).toBe(PPQ);
        expect(beatTicks([2, 2], PPQ)).toBe(PPQ * 2);
    });

    it('beams the rag it was written for', () => {
        const score = buildNotationScore(loadScore('maple_leaf_rag'));
        const beamed = score.chords.filter(chord => chord.beam >= 0).length;
        const flagged = score.chords.filter(chord => chord.beam < 0 && chord.value.denom >= 8).length;
        expect(beamed).toBeGreaterThan(flagged);
    });
});

describe('rests', () => {
    it('fills a silent staff and leaves sounding spans alone', () => {
        const score = buildNotationScore(fakeMidi([
            { name: 'P1-staff1', notes: [[60, 0, PPQ]] },
        ]));
        const trebleRests = score.rests.filter(rest => rest.staff === 0);
        expect(trebleRests.length).toBeGreaterThan(0);
        // Nothing may overlap the note itself
        expect(trebleRests.every(rest => rest.ticks >= PPQ)).toBe(true);
    });

    it('ignores gaps too short to be worth a rest', () => {
        const chords = [
            { ticks: 0, durationTicks: PPQ - 8, staff: 0 as const },
            { ticks: PPQ, durationTicks: PPQ * 3, staff: 0 as const },
        ].map(c => ({ ...c, voice: 0, value: { denom: 4, dots: 0 as const }, stemUp: true, notes: [], tiedFromPrev: false, tiedToNext: false, beam: -1 }));
        const measures = buildMeasures(PPQ, [{ ticks: 0, timeSignature: [4, 4] }], PPQ * 4);
        expect(buildRests(chords, measures, PPQ)).toHaveLength(0);
    });
});

describe('bundled scores', () => {
    it('carries the metre and key of Gymnopédie No. 1 through to notation', () => {
        const score = buildNotationScore(loadScore('gymnopedie_1'));
        expect(score.measures[0].timeSignature).toEqual([3, 4]);
        expect(score.fifths).toBe(2); // D major
        expect(score.chords.length).toBeGreaterThan(100);
    });

    it('reads Nocturne Op. 9 No. 2 as 12/8 in E flat', () => {
        const score = buildNotationScore(loadScore('nocturne_op9_no2'));
        expect(score.measures[0].timeSignature).toEqual([12, 8]);
        expect(score.fifths).toBe(-3);
    });

    it('reads Clair de Lune in D flat', () => {
        const score = buildNotationScore(loadScore('clair_de_lune'));
        expect(score.fifths).toBe(-5);
    });

    it('keeps both hands on their own staves for every bundled score', () => {
        for (const name of ['ode_to_joy', 'minuet_in_g', 'gymnopedie_1', 'maple_leaf_rag']) {
            const score = buildNotationScore(loadScore(name));
            const staves = new Set(score.chords.map(chord => chord.staff));
            expect(staves, name).toEqual(new Set([0, 1]));
        }
    });

    it('never writes a note outside the bar it starts in', () => {
        const score = buildNotationScore(loadScore('minuet_in_g'));
        for (const chord of score.chords) {
            const measure = score.measures.find(
                m => chord.ticks >= m.startTicks && chord.ticks < m.endTicks,
            );
            expect(measure).toBeDefined();
            expect(chord.ticks + chord.durationTicks).toBeLessThanOrEqual(measure!.endTicks);
        }
    });
});
