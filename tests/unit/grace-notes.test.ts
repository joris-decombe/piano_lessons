import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { MusicXMLParser } from '@/lib/musicxml/parser';

const TICKS_PER_QUARTER = 128;

function scoreWith(noteBody: string) {
    return new MusicXMLParser().parse(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      ${noteBody}
    </measure>
  </part>
</score-partwise>`);
}

const GRACE = (step: string, octave: number) =>
    `<note><grace slash="yes"/><pitch><step>${step}</step><octave>${octave}</octave></pitch><voice>1</voice><type>eighth</type></note>`;
const NOTE = (step: string, octave: number, duration: number) =>
    `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><voice>1</voice><type>quarter</type></note>`;

describe('Grace notes', () => {
    it('steals time from the principal note that follows', () => {
        const events = scoreWith(GRACE('C', 5) + NOTE('B', 4, 2)).tracks[0].events;

        expect(events.map((e) => e.pitch)).toEqual(['C5', 'B4']);
        const [grace, principal] = events;
        // Grace lands on the beat, principal is pushed back by exactly its length.
        expect(grace.startTick).toBe(0);
        expect(grace.durationTicks).toBe(32);
        expect(principal.startTick).toBe(32);
        // Half note (2 divisions of 1) = 256 ticks, less the 32 it gave up.
        expect(principal.durationTicks).toBe(256 - 32);
    });

    it('does not disturb the notes that follow', () => {
        const events = scoreWith(GRACE('C', 5) + NOTE('B', 4, 1) + NOTE('A', 4, 1)).tracks[0].events;
        const last = events.find((e) => e.pitch === 'A4')!;
        // The ornament is absorbed by its own note; the next one starts on the beat.
        expect(last.startTick).toBe(TICKS_PER_QUARTER);
    });

    it('splits the available time across a run of grace notes', () => {
        const events = scoreWith(GRACE('C', 5) + GRACE('D', 5) + NOTE('B', 4, 1)).tracks[0].events;
        expect(events.map((e) => [e.pitch, e.startTick, e.durationTicks])).toEqual([
            ['C5', 0, 32],
            ['D5', 32, 32],
            ['B4', 64, 64],
        ]);
    });

    it('never starves a short principal note', () => {
        // An eighth (64 ticks) can only spare half its length across three graces.
        const events = scoreWith(GRACE('C', 5) + GRACE('D', 5) + GRACE('E', 5) + NOTE('B', 4, 1))
            .tracks[0].events;
        const graces = events.slice(0, 3);
        expect(graces.every((g) => g.durationTicks === 21)).toBe(true);
        expect(events[3].durationTicks).toBeGreaterThan(0);
    });

    it('recovers every ornament in Gnossienne No. 1', () => {
        const xml = fs.readFileSync('public/scores/gnossienne1.xml', 'utf8');
        const score = new MusicXMLParser().parse(xml);
        const total = score.tracks.reduce((n, t) => n + t.events.length, 0);
        // 872 pitched notes in the source, 100 of them grace notes — a third of
        // the melody, which the parser used to drop on the floor.
        expect(total).toBe(872);
    });
});
