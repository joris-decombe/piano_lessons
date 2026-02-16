import MidiWriter from 'midi-writer-js';
import { ParsedScore, NoteEvent } from './types';

interface ChordGroup {
    startTick: number;
    durationTicks: number;
    pitches: string[];
    velocity: number;
}

export class MIDIGenerator {
    generate(score: ParsedScore): string {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allTracks: any[] = [];

        score.tracks.forEach(parsedTrack => {
            // 1. Group notes by (startTick, durationTicks) into chord groups
            const groupKey = (e: NoteEvent) => `${e.startTick}:${e.durationTicks}`;
            const groupMap = new Map<string, ChordGroup>();

            parsedTrack.events.forEach(e => {
                const key = groupKey(e);
                if (!groupMap.has(key)) {
                    groupMap.set(key, {
                        startTick: e.startTick,
                        durationTicks: e.durationTicks,
                        pitches: [],
                        velocity: e.velocity || 80,
                    });
                }
                groupMap.get(key)!.pitches.push(e.pitch);
            });

            const groups = Array.from(groupMap.values())
                .sort((a, b) => a.startTick - b.startTick);

            // 2. Allocate chord groups to non-overlapping layers (greedy)
            const layers: ChordGroup[][] = [];
            const layerEndTicks: number[] = [];

            groups.forEach(group => {
                let layerIdx = layerEndTicks.findIndex(
                    endTick => endTick <= group.startTick
                );
                if (layerIdx === -1) {
                    layerIdx = layers.length;
                    layers.push([]);
                    layerEndTicks.push(0);
                }
                layers[layerIdx].push(group);
                layerEndTicks[layerIdx] = group.startTick + group.durationTicks;
            });

            // 3. One MidiWriter track per layer
            layers.forEach((layerGroups, i) => {
                const track = new MidiWriter.Track();
                track.setTempo(score.tempo);
                track.addTrackName(
                    layers.length > 1 ? `${parsedTrack.id}-${i}` : parsedTrack.id
                );

                let cursor = 0;
                layerGroups.forEach(group => {
                    const wait = group.startTick - cursor;
                    const noteEvent = new MidiWriter.NoteEvent({
                        pitch: group.pitches,
                        duration: 'T' + group.durationTicks,
                        wait: wait > 0 ? 'T' + wait : 'T0',
                        velocity: group.velocity,
                    });
                    track.addEvent(noteEvent);
                    cursor = group.startTick + group.durationTicks;
                });

                allTracks.push(track);
            });
        });

        const writer = new MidiWriter.Writer(allTracks);
        return writer.base64();
    }
}
