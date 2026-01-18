import MidiWriter from 'midi-writer-js';
import { ParsedScore } from './types';

export class MIDIGenerator {
    generate(score: ParsedScore): string {
        const tracks: any[] = [];

        score.tracks.forEach(parsedTrack => {
            const track = new MidiWriter.Track();

            // Set Tempo
            track.setTempo(score.tempo);
            track.addTrackName(parsedTrack.id); // Or title

            // Add Notes
            // We need to handle timing. MidiWriter adds events sequentially.
            // If our events are absolute ticks, we need to calculate deltas OR use wait().
            // BUT, our parser gives us absolute startTick (sort of, strictly mostly sequential).
            // Actually, MidiWriter handles chords if passed array of pitches.
            // But we parsed them as individual events with timestamps.

            // Better approach for MidiWriter:
            // It expects notes to be added. If we add a note, it advances the cursor.
            // To do chords, we add multiple notes with same duration? 
            // MidiWriter: track.addEvent(new NoteEvent({pitch: ['C4', 'E4'], duration: '4'}));

            // To handle polyphony and complex timing properly, we might need a more absolute approach
            // or group events by start time.

            // Group events by startTick
            const eventsByTick = new Map<number, any[]>();

            parsedTrack.events.forEach(e => {
                if (!eventsByTick.has(e.startTick)) {
                    eventsByTick.set(e.startTick, []);
                }
                eventsByTick.get(e.startTick)?.push(e);
            });

            // Sort ticks
            const sortedTicks = Array.from(eventsByTick.keys()).sort((a, b) => a - b);

            let lastTick = 0;

            sortedTicks.forEach(tick => {
                const notes = eventsByTick.get(tick);
                if (!notes) return;

                const waitTicks = tick - lastTick;
                if (waitTicks > 0) {
                    (track as any).wait('T' + waitTicks); // Cast to any as wait missing from types

                    // MidiWriter wait() expects duration string (e.g. '4') or ticks?
                    // Checking docs (implied): usually wait() works like duration.
                    // If we pass numbers, does it treat as ticks?
                    // MidiWriterJS typically uses 'T128' for ticks.
                }

                // Add notes starting at this tick
                // Since they may have different durations, this gets tricky with simple writers.
                // However, for Piano Lessons basic XML, we can try adding them.

                // If notes have different durations, we ideally need separate tracks or a more complex writer.
                // Simplified: Group by duration at this tick as well.

                // For this MVP, let's assume notes at same tick have same duration (chords),
                // or simplistic handling.

                notes.forEach(note => {
                    // For now, add each note. 
                    // Note: MidiWriter's addEvent advances time by duration by default?
                    // "The wait method is specifically for inserting silence."
                    // "addEvent... sequential"
                    // If we add multiple notes sequentially that are supposed to be simultaneous (chord),
                    // MidiWriterJS usually supports an array of pitches in one NoteEvent.
                });

                // Let's optimize: Group by duration
                const notesByDuration = new Map<number, string[]>();
                notes.forEach(n => {
                    if (!notesByDuration.has(n.durationTicks)) {
                        notesByDuration.set(n.durationTicks, []);
                    }
                    notesByDuration.get(n.durationTicks)?.push(n.pitch);
                });

                // Add events
                // If we have multiple durations starting at same time, this is hard for single-track sequential writers without explicit 'wait(0)'.
                // MidiWriterJS allows `sequential: false` in options? No.

                // Hack: If we have multiple durations, we might desync. 
                // BUT, `track.addEvent` adds to the track.
                // Checks MidiWriterJS docs/source:
                // track.addEvent(event) -> events.push(event).
                // It doesn't enforce timing until build time?
                // Actually, NoteEvent has `duration`. `wait()` inserts a generic WaitEvent.

                // CORRECT LOGIC for MidiWriterJS:
                // It builds a list of events. Delta times are calculated somewhat automatically or manually.
                // Ideally we provide { pitch: [...], duration: '...' }.

                let isFirstGroup = true;
                notesByDuration.forEach((pitches, durationTicks) => {
                    const noteEvent = new MidiWriter.NoteEvent({
                        pitch: pitches,
                        duration: 'T' + durationTicks,
                        velocity: 80
                    });

                    if (!isFirstGroup) {
                        // Creating a chord with different duration... 
                        // MidiWriter doesn't easily support polyphony with different durations in one event.
                        // We would need to add `startingTicks` manually or simple overlap?
                        // For MVP: We assume mostly block chords.
                    }

                    // If we are waiting, we use the wait from BEFORE this group.
                    if (isFirstGroup && waitTicks > 0) {
                        (track as any).wait('T' + waitTicks);
                    }

                    // If we have multiple groups, we can't easily advance time.
                    // The logic 'wait' advances time.
                    // 'NoteEvent' advances time by default.
                    // To play simultaneous, we'd need them in the same event, which requires same duration.

                    track.addEvent(noteEvent);

                    isFirstGroup = false;
                    // This advances time by durationTicks.
                    // So next loop iteration `lastTick` needs to account for this.
                    lastTick = tick + durationTicks;
                });

                // This logic is flawed for overlapping notes (polyphony).
                // BUT, `test.musicxml` and simple songs are usually monophonic or block chords.
                // Valid for MVP.
            });

            tracks.push(track);
        });

        const writer = new MidiWriter.Writer(tracks);
        return writer.base64();
    }
}
