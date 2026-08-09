import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { MusicXMLParser } from '../../src/lib/musicxml/parser';

const TICKS_PER_QUARTER = 128;
const TICKS_PER_MEASURE_3_4 = TICKS_PER_QUARTER * 3;

function parseScore(file: string) {
    const xml = fs.readFileSync(`public/scores/${file}`, 'utf8');
    return new MusicXMLParser().parse(xml);
}

// Staff 1 → right hand, staff 2 → left hand (see Waterfall.tsx / usePianoAudio.ts).
describe('Gymnopédie No. 1 hand assignment', () => {
    const score = parseScore('gymnopedie_1.xml');
    const right = score.tracks.find((t) => t.id === 'P1-staff1')!;
    const left = score.tracks.find((t) => t.id === 'P1-staff2')!;

    it('splits every note across exactly two hands', () => {
        expect(score.tracks).toHaveLength(2);
        expect(right.events.length + left.events.length).toBe(289);
    });

    it('gives the left hand the bass note and the accompaniment chord', () => {
        // Bar 1: G2 bass on beat 1, B3–D4–F#4 chord on beat 2 — both left hand.
        const bar1 = left.events.filter((e) => e.startTick < TICKS_PER_MEASURE_3_4);
        expect(bar1.map((e) => e.pitch).sort()).toEqual(['B3', 'D4', 'F#4', 'G2']);
        expect(right.events.filter((e) => e.startTick < TICKS_PER_MEASURE_3_4)).toHaveLength(0);
    });

    it('keeps the right hand on the melody only, entering at bar 5', () => {
        const firstRight = Math.min(...right.events.map((e) => e.startTick));
        // Bar 5, beat 2.
        expect(firstRight).toBe(4 * TICKS_PER_MEASURE_3_4 + TICKS_PER_QUARTER);
        // The melody never dips below middle C.
        expect(right.events.every((e) => parseInt(e.pitch.slice(-1)) >= 4)).toBe(true);
    });
});
