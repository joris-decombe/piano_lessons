import MidiWriter from 'midi-writer-js';
import { ParsedScore, NoteEvent } from './types';
import { FingeringMap, fingeringKey, pitchToMidi } from '@/lib/fingering';

interface ChordGroup {
    startTick: number;
    durationTicks: number;
    pitches: string[];
    /** Parallel to `pitches` — undefined where the score gave no fingering */
    fingers: (number | undefined)[];
    velocity: number;
}

export interface GeneratedMidi {
    base64: string;
    /** Empty when the score carries no <fingering> markings */
    fingerings: FingeringMap;
}

export class MIDIGenerator {
    generate(score: ParsedScore): GeneratedMidi {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allTracks: any[] = [];
        const fingerings: FingeringMap = {};

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
                        fingers: [],
                        velocity: e.velocity || 80,
                    });
                }
                groupMap.get(key)!.pitches.push(e.pitch);
                groupMap.get(key)!.fingers.push(e.finger);
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
                const trackName = layers.length > 1 ? `${parsedTrack.id}-${i}` : parsedTrack.id;
                track.setTempo(score.tempo);
                // Metre and key go on the first track only. @tonejs/midi
                // collects these meta events from every track, so repeating
                // them would report one signature change per layer.
                if (allTracks.length === 0) {
                    track.setTimeSignature(score.timeSignature[0], score.timeSignature[1], 24, 8);
                    track.setKeySignature(score.keyFifths, 0);
                }
                track.addTrackName(trackName);

                let cursor = 0;
                layerGroups.forEach(group => {
                    const wait = group.startTick - cursor;
                    group.fingers.forEach((finger, pitchIdx) => {
                        if (finger === undefined) return;
                        const midiNumber = pitchToMidi(group.pitches[pitchIdx]);
                        if (midiNumber === null) return;
                        fingerings[fingeringKey(trackName, group.startTick, midiNumber)] = finger;
                    });
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
        return { base64: writer.base64(), fingerings };
    }
}
