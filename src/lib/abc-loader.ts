import abcjs from 'abcjs';

/**
 * Converts an ABC notation string into a MIDI Uint8Array buffer
 * that can be parsed by @tonejs/midi.
 */
export function abcToMidiBuffer(abcString: string): Uint8Array {
    // Generate MIDI binary
    const midiBuffer = abcjs.synth.getMidiFile(abcString, {
        midiOutputType: "binary"
    }) as ArrayLike<number>;

    return new Uint8Array(midiBuffer);
}
