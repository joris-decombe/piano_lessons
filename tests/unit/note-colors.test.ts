import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { Midi } from '@tonejs/midi';
import {
    getHandIndexForTrack,
    getHandIndexByTrack,
    getColorByTrack,
    getColorByMidi,
    getNoteColor,
} from '@/lib/note-colors';
import { MusicXMLParser } from '@/lib/musicxml/parser';
import { MIDIGenerator } from '@/lib/musicxml/midi-generator';

const COLORS = { split: true, left: 'LEFT', right: 'RIGHT', unified: 'UNIFIED' };
const RIGHT = 0;
const LEFT = 1;

describe('hand index from track name', () => {
    it('reads the staff number, not the track position', () => {
        expect(getHandIndexForTrack('P1-staff1', 0)).toBe(RIGHT);
        expect(getHandIndexForTrack('P1-staff2', 1)).toBe(LEFT);
        // The staff wins even when the track sits somewhere else entirely.
        expect(getHandIndexForTrack('P1-staff1', 7)).toBe(RIGHT);
        expect(getHandIndexForTrack('P1-staff2', 0)).toBe(LEFT);
    });

    it('keeps layers of one staff on the same hand', () => {
        // The generator splits a staff into as many non-overlapping layers as
        // midi-writer-js needs. Track index would call these four different
        // hands; they are two.
        const tracks = [
            { name: 'P1-staff1-0' },
            { name: 'P1-staff1-1' },
            { name: 'P1-staff2-0' },
            { name: 'P1-staff2-1' },
        ];
        expect(getHandIndexByTrack(tracks)).toEqual([RIGHT, RIGHT, LEFT, LEFT]);
    });

    it('falls back to track order for plain MIDI, which carries no staff', () => {
        expect(getHandIndexByTrack([{ name: 'upper:' }, { name: 'lower:' }])).toEqual([RIGHT, LEFT]);
        expect(getHandIndexByTrack([{ name: '' }, { name: '' }, { name: '' }])).toEqual([0, 1, 2]);
    });

    it('is not fooled by names that merely contain "staff"', () => {
        expect(getHandIndexForTrack('Staff Band', 3)).toBe(3);
        expect(getHandIndexForTrack('P1-staffX', 2)).toBe(2);
        expect(getHandIndexForTrack('-staff0', 4)).toBe(4);
    });
});

describe('colour assignment', () => {
    it('maps hand 0 to the right hand and everything else to the left', () => {
        expect(getColorByTrack(RIGHT, COLORS)).toBe('RIGHT');
        expect(getColorByTrack(LEFT, COLORS)).toBe('LEFT');
        expect(getColorByTrack(5, COLORS)).toBe('LEFT');
    });

    it('collapses to one colour when hands are not split', () => {
        const merged = { ...COLORS, split: false };
        expect(getColorByTrack(RIGHT, merged)).toBe('UNIFIED');
        expect(getColorByMidi(30, 60, merged)).toBe('UNIFIED');
        expect(getNoteColor(1, 30, merged, { strategy: 'point', splitPoint: 60 })).toBe('UNIFIED');
    });

    it('splits on pitch when using the point strategy', () => {
        const point = { strategy: 'point', splitPoint: 60 } as const;
        expect(getNoteColor(0, 59, COLORS, point)).toBe('LEFT');
        expect(getNoteColor(0, 60, COLORS, point)).toBe('RIGHT'); // boundary is right-hand
        expect(getColorByMidi(NaN, 60, COLORS)).toBe('RIGHT');    // unknown pitch is not "left"
    });

    it('ignores pitch when using the tracks strategy', () => {
        const tracks = { strategy: 'tracks', splitPoint: 60 } as const;
        // A low note in the right-hand track stays right-handed.
        expect(getNoteColor(RIGHT, 40, COLORS, tracks)).toBe('RIGHT');
        expect(getNoteColor(LEFT, 90, COLORS, tracks)).toBe('LEFT');
    });
});

// The two bugs this guards against were both "the chord is the wrong colour".
describe('bundled Satie scores end up in the right hands', () => {
    function handsFor(file: string) {
        const score = new MusicXMLParser().parse(fs.readFileSync(`public/scores/${file}`, 'utf8'));
        const midi = new Midi(Buffer.from(new MIDIGenerator().generate(score).base64, 'base64'));
        const hands = getHandIndexByTrack(midi.tracks);
        return midi.tracks.map((track, i) => ({
            name: track.name,
            hand: hands[i],
            pitches: track.notes.map((n) => n.midi),
        }));
    }

    it('puts the Gymnopédie accompaniment chord in the left hand', () => {
        const tracks = handsFor('gymnopedie_1.xml');
        // Staff 1 splits into layers here, so index-based colouring would be wrong.
        expect(tracks.length).toBeGreaterThan(2);

        const right = tracks.filter((t) => t.hand === RIGHT).flatMap((t) => t.pitches);
        const left = tracks.filter((t) => t.hand === LEFT).flatMap((t) => t.pitches);
        // Melody only on the right, never below middle C.
        expect(Math.min(...right)).toBeGreaterThanOrEqual(60);
        // Bass and chord on the left.
        expect(Math.min(...left)).toBeLessThan(48);
        expect(left.length).toBeGreaterThan(right.length);
    });

    it('keeps the whole Gnossienne chord in the left hand', () => {
        const tracks = handsFor('gnossienne1.xml');
        const left = tracks.filter((t) => t.hand === LEFT).flatMap((t) => t.pitches);
        const right = tracks.filter((t) => t.hand === RIGHT).flatMap((t) => t.pitches);

        // Ab3-C4-F4 (56, 60, 65) is one chord and belongs to one hand.
        for (const pitch of [56, 60, 65]) {
            expect(left).toContain(pitch);
        }
        // The old MIDI leaked C4 and F4 into the right hand; nothing there now
        // reaches that low.
        expect(Math.min(...right)).toBeGreaterThan(60);
    });
});
