
import { describe, it, expect } from 'vitest';
import { abcToMidiBuffer } from '../../src/lib/abc-loader';
import { Midi } from '@tonejs/midi';

describe('abcToMidiBuffer', () => {
    it('should convert ABC to valid MIDI buffer', () => {
        const abc = `X:1
T:Scale
M:4/4
K:C
CDEF GABc|`;
        const buffer = abcToMidiBuffer(abc);
        expect(buffer).toBeInstanceOf(Uint8Array);
        expect(buffer.length).toBeGreaterThan(0);

        const midi = new Midi(buffer);
        expect(midi.tracks.length).toBeGreaterThan(0);

        const track = midi.tracks[0];
        // track.notes.forEach(n => {
        //     console.log(`Note: ${n.name}, Time: ${n.time}, Duration: ${n.duration}, Ticks: ${n.ticks}`);
        // });

        // Check for reasonable note count (8 notes in scale)
        // abcjs might add extra tracks or notes?
        expect(track.notes.length).toBeGreaterThanOrEqual(8);
    });

    it('should handle Ode to Joy excerpt', () => {
        const abc = `T: Ode to Joy
M: 4/4
L: 1/4
K: C
E E F G | G F E D | C C D E | E3/2 D/4 D2 |`;
        const buffer = abcToMidiBuffer(abc);
        const midi = new Midi(buffer);
        expect(midi.tracks.length).toBeGreaterThan(0);
    });
});
