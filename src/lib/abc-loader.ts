import abcjs from 'abcjs';

/**
 * Converts an ABC notation string into a MIDI Uint8Array buffer
 * that can be parsed by @tonejs/midi.
 */
export function abcToMidiBuffer(abcString: string): Uint8Array {
    // Generate MIDI binary
    // abcjs.synth.getMidiFile returns an array of Uint8Arrays (one for each tune in the ABC string)
    const midiFiles = abcjs.synth.getMidiFile(abcString, {
        midiOutputType: "binary"
    }) as unknown as Uint8Array[];

    if (!midiFiles || midiFiles.length === 0) {
        // Fallback or error
        console.warn('abcToMidiBuffer: No MIDI generated from ABC string');
        return new Uint8Array(0);
    }

    return new Uint8Array(midiFiles[0]);
}
