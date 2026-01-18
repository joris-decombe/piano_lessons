import { XMLParser } from 'fast-xml-parser';
import { ParsedScore, ParsedTrack, NoteEvent } from './types';

export class MusicXMLParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
    }

    parse(xmlContent: string): ParsedScore {
        const jsonObj = this.parser.parse(xmlContent);

        // Handle both 'score-partwise' and 'score-timewise' (though partwise is standard)
        const scorePartwise = jsonObj['score-partwise'];
        if (!scorePartwise) {
            throw new Error("Invalid MusicXML: Missing score-partwise element");
        }

        const title = scorePartwise['work']?.['work-title'] || "Untitled";

        // Basic metadata extraction (simplified)
        // TODO: Extract global tempo and time signature from the first measure of the first part if possible
        // Defaulting for now
        let tempo = 120;
        let timeSignature: [number, number] = [4, 4];

        const partList = scorePartwise['part-list']; // Define instruments/parts
        const parts = Array.isArray(scorePartwise['part'])
            ? scorePartwise['part']
            : [scorePartwise['part']];

        const tracks: ParsedTrack[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parts.forEach((part: any, index: number) => {
            const partId = part['@_id'];
            // Find part name from part-list if needed

            const events: NoteEvent[] = [];
            let currentTick = 0;
            let divisions = 24; // Default, usually updated by <divisions> in measure

            const measures = Array.isArray(part['measure'])
                ? part['measure']
                : [part['measure']];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            measures.forEach((measure: any) => {
                // Update properties if attributes exist
                if (measure['attributes']) {
                    const attrs = measure['attributes'];
                    if (attrs['divisions']) {
                        divisions = parseInt(attrs['divisions']);
                    }
                    if (attrs['time']) {
                        // Simplify: take first time signature found
                        timeSignature = [
                            parseInt(attrs['time']['beats']),
                            parseInt(attrs['time']['beat-type'])
                        ];
                    }
                    // Tempo is typically in <direction><sound tempo="x"/> but simplified here
                }

                // Look for tempo in direction
                if (measure['direction']) {
                    const dirs = Array.isArray(measure['direction']) ? measure['direction'] : [measure['direction']];
                    dirs.forEach((d: any) => {
                        if (d['sound'] && d['sound']['@_tempo']) {
                            tempo = parseFloat(d['sound']['@_tempo']);
                        }
                    });
                }


                const notes = measure['note']
                    ? (Array.isArray(measure['note']) ? measure['note'] : [measure['note']])
                    : [];

                // Simple cursor for this measure (chords share start time)
                let measureCursor = 0;

                notes.forEach((note: any) => {
                    // Calculate duration in ticks
                    // MIDI standard is usually 128 ticks per quarter.
                    // MusicXML 'duration' is based on 'divisions' (quarters).
                    // We need to normalize.
                    // Let's normalize everything to 128 ticks per quarter note (PPQ).

                    const xmlDuration = parseInt(note['duration'] || '0');
                    const isRest = note['rest'] !== undefined;
                    const isChord = note['chord'] !== undefined;

                    // Duration in standardized ticks (128 PPQ)
                    // ticks = (xmlDuration / divisions) * 128
                    const durationTicks = Math.round((xmlDuration / divisions) * 128);

                    if (!isChord) {
                        // Advance cursor only if NOT a chord
                        // But wait, if it's the first note of a chord, we DO advance, 
                        // but subsequent chord notes reuse the OLD cursor?
                        // Actually, standard logic:
                        // - Non-chord note: starts at current, advances current by duration
                        // - Chord note: starts at (current - previous_duration), advances (usually same as prev)?
                        // Simplified: Track measure cursor.
                        // But for simplicity in this MVP: 
                        // If chord, use same startTick as previous note.
                        // If not chord, startTick = currentTick.
                    }

                    let startTick = currentTick;
                    if (isChord && events.length > 0) {
                        // Use start tick of previous event
                        startTick = events[events.length - 1].startTick;
                    }

                    if (!isRest) {
                        // Extract Pitch
                        let pitch = "C4";
                        if (note['pitch']) {
                            const step = note['pitch']['step'];
                            const octave = note['pitch']['octave'];
                            const alter = parseInt(note['pitch']['alter'] || '0');

                            let accidental = "";
                            if (alter === 1) accidental = "#";
                            if (alter === -1) accidental = "b"; // midi-writer-js might prefer 'b' or flat handling
                            // Standard notation often uses #. Let's stick to C#4 style.

                            pitch = `${step}${accidental}${octave}`;
                        }

                        events.push({
                            pitch,
                            duration: 'T' + durationTicks, // MIDI Writer specific format for ticks
                            startTick,
                            durationTicks,
                            velocity: 80 // Default
                        });
                    }

                    if (!isChord) {
                        currentTick += durationTicks;
                    }
                });
            });

            tracks.push({
                id: partId,
                events
            });
        });

        return {
            title,
            tempo,
            timeSignature,
            tracks
        };
    }
}
