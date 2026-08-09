import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { Midi } from '@tonejs/midi';
import { MusicXMLParser } from '../../src/lib/musicxml/parser';
import { MIDIGenerator } from '../../src/lib/musicxml/midi-generator';
import { fingeringKey, pitchToMidi } from '../../src/lib/fingering';

describe('pitchToMidi', () => {
    it('handles naturals, sharps, flats and doubles', () => {
        expect(pitchToMidi('C4')).toBe(60);
        expect(pitchToMidi('A0')).toBe(21);
        expect(pitchToMidi('C8')).toBe(108);
        expect(pitchToMidi('F#5')).toBe(78);
        expect(pitchToMidi('Bb3')).toBe(58);
        expect(pitchToMidi('C##4')).toBe(62);
        expect(pitchToMidi('Ebb2')).toBe(38);
        expect(pitchToMidi('H4')).toBeNull();
    });
});

describe('Fingering extraction', () => {
    const xml = fs.readFileSync('public/scores/nocturne_op9_no2.xml', 'utf8');
    const score = new MusicXMLParser().parse(xml);
    const generated = new MIDIGenerator().generate(score);

    it('reads <notations><technical><fingering> off the parsed notes', () => {
        const fingered = score.tracks.flatMap((t) => t.events).filter((e) => e.finger !== undefined);
        expect(fingered.length).toBeGreaterThan(50);
        expect(fingered.every((e) => e.finger! >= 1 && e.finger! <= 5)).toBe(true);
        // Bar 1 opens on Bb4 with the second finger.
        const first = score.tracks[0].events.find((e) => e.finger !== undefined)!;
        expect(first.pitch).toBe('Bb4');
        expect(first.finger).toBe(2);
    });

    it('produces keys that survive the round-trip through MIDI', () => {
        const raw = Buffer.from(generated.base64, 'base64');
        const midi = new Midi(raw);

        let matched = 0;
        for (const track of midi.tracks) {
            for (const note of track.notes) {
                if (generated.fingerings[fingeringKey(track.name, note.ticks, note.midi)] !== undefined) {
                    matched++;
                }
            }
        }
        // Every emitted fingering must resolve to a note the Waterfall will render.
        expect(matched).toBe(Object.keys(generated.fingerings).length);
        expect(matched).toBeGreaterThan(50);
    });

    it('emits nothing for a score without fingerings', () => {
        const plain = new MusicXMLParser().parse(fs.readFileSync('public/scores/gymnopedie_1.xml', 'utf8'));
        expect(new MIDIGenerator().generate(plain).fingerings).toEqual({});
    });
});
