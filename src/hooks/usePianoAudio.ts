import { useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

export interface ActiveNote {
    note: string;
    track: number;
    velocity: number;
}

export interface PreviewNote {
    note: string;
    track: number;
}

export interface PianoAudioState {
    isLoaded: boolean;
    isPlaying: boolean;
    currentTime: number;
    currentTick: number; // Add this
    duration: number;
    midi: Midi | null;
    activeNotes: ActiveNote[];
    previewNotes: PreviewNote[];
    isLooping: boolean;
    loopStartTick: number;
    loopEndTick: number;
}

interface NoteEvent {
    time: number | string;
    note: string;
    duration: number;
    velocity: number;
}

export interface SongSource {
    url?: string;
    abc?: string;
    type: 'midi' | 'abc';
}

export function usePianoAudio(source: SongSource) {
    const [state, setState] = useState<PianoAudioState>({
        isLoaded: false,
        isPlaying: false,
        currentTime: 0,
        currentTick: 0,
        duration: 0,
        midi: null,
        activeNotes: [],
        previewNotes: [],
        isLooping: false,
        loopStartTick: 0,
        loopEndTick: 0,
    });

    const samplerRef = useRef<Tone.Sampler | null>(null);
    const noteTimelineRef = useRef<Map<number, { note: string; type: "start" | "stop"; track: number; velocity: number }[]>>(new Map());
    const timelineKeysRef = useRef<number[]>([]); // Cache sorted keys
    const activeNotesRef = useRef<Map<string, ActiveNote>>(new Map());
    const lastProcessedTickRef = useRef(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const baseBpmRef = useRef<number>(120);
    // Ref to hold mutable loop state for the animation loop
    const loopStateRef = useRef({ isLooping: false, loopStartTick: 0, loopEndTick: 0 });

    /**
     * Helper to recalculate all active notes from tick 0 up to a target tick.
     * Used for seeking or correcting state after a backward jump in time.
     */
    const rebuildActiveNotes = (targetTick: number) => {
        activeNotesRef.current.clear();

        // Use cached sorted keys for performance (Binary Search + Slice)
        const keys = timelineKeysRef.current;
        let low = 0, high = keys.length - 1;
        let count = 0;

        // Find index of last key <= targetTick
        while (low <= high) {
            const mid = (low + high) >>> 1;
            if (keys[mid] <= targetTick) {
                count = mid + 1;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        // Iterate only relevant keys
        for (let i = 0; i < count; i++) {
            const tick = keys[i];
            const events = noteTimelineRef.current.get(tick)!;
            events.forEach(event => {
                const key = `${event.note}-${event.track}`;
                if (event.type === 'start') {
                    activeNotesRef.current.set(key, { note: event.note, track: event.track, velocity: event.velocity });
                } else {
                    activeNotesRef.current.delete(key);
                }
            });
        }
        return Array.from(activeNotesRef.current.values());
    };

    // Initialize Audio & Load MIDI
    useEffect(() => {
        let mounted = true;
        let part: Tone.Part | null = null;

        async function init() {
            if (!source) return;

            // 1. Setup Sampler
            const sampler = new Tone.Sampler({
                urls: {
                    A0: "A0.mp3",
                    C1: "C1.mp3",
                    "D#1": "Ds1.mp3",
                    "F#1": "Fs1.mp3",
                    A1: "A1.mp3",
                    C2: "C2.mp3",
                    "D#2": "Ds2.mp3",
                    "F#2": "Fs2.mp3",
                    A2: "A2.mp3",
                    C3: "C3.mp3",
                    "D#3": "Ds3.mp3",
                    "F#3": "Fs3.mp3",
                    A3: "A3.mp3",
                    C4: "C4.mp3",
                    "D#4": "Ds4.mp3",
                    "F#4": "Fs4.mp3",
                    A4: "A4.mp3",
                    C5: "C5.mp3",
                    "D#5": "Ds5.mp3",
                    "F#5": "Fs5.mp3",
                    A5: "A5.mp3",
                    C6: "C6.mp3",
                    "D#6": "Ds6.mp3",
                    "F#6": "Fs6.mp3",
                    A6: "A6.mp3",
                    C7: "C7.mp3",
                    "D#7": "Ds7.mp3",
                    "F#7": "Fs7.mp3",
                    A7: "A7.mp3",
                    C8: "C8.mp3",
                },
                release: 1,
                baseUrl: "https://tonejs.github.io/audio/salamander/",
            }).toDestination();

            await Tone.loaded();
            samplerRef.current = sampler;

            // 2. Load MIDI or Parse ABC
            let arrayBuffer: ArrayBuffer | Uint8Array;

            if (source.type === 'abc' && source.abc) {
                const { abcToMidiBuffer } = await import('@/lib/abc-loader');
                arrayBuffer = abcToMidiBuffer(source.abc);
            } else if (source.type === 'midi' && source.url) {
                const response = await fetch(source.url);
                arrayBuffer = await response.arrayBuffer();
            } else {
                console.error("Invalid source", source);
                return;
            }

            const midi = new Midi(arrayBuffer);

            if (!mounted) return;

            // 3. Schedule Notes using Tone.Part & Ticks
            Tone.Transport.cancel();

            // Set PPQ from MIDI to match tick resolution
            Tone.Transport.PPQ = midi.header.ppq || 480;

            // Get initial BPM from MIDI or default
            const initialBpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 60;
            baseBpmRef.current = initialBpm;
            Tone.Transport.bpm.value = initialBpm;

            const notes: NoteEvent[] = [];
            midi.tracks.forEach((track) => {
                track.notes.forEach((note) => {
                    notes.push({
                        time: `${note.ticks}i`,
                        note: note.name,
                        duration: note.duration,
                        velocity: note.velocity,
                    });
                });
            });

            // Debug logs removed

            part = new Tone.Part((time, value: NoteEvent) => {
                sampler.triggerAttackRelease(
                    value.note,
                    value.duration,
                    time,
                    value.velocity
                );
            }, notes).start(0);

            // 4. Pre-compute Note Timeline for efficient active note lookup
            const timeline = new Map<number, { note: string, type: 'start' | 'stop', track: number, velocity: number }[]>();
            midi.tracks.forEach((track, trackIndex) => {
                track.notes.forEach(note => {
                    const startTick = note.ticks;
                    const endTick = startTick + note.durationTicks;

                    // Add note start event
                    if (!timeline.has(startTick)) timeline.set(startTick, []);
                    timeline.get(startTick)!.push({ note: note.name, type: 'start', track: trackIndex, velocity: note.velocity });

                    // Add note stop event
                    if (!timeline.has(endTick)) timeline.set(endTick, []);
                    timeline.get(endTick)!.push({ note: note.name, type: 'stop', track: trackIndex, velocity: 0 });
                });
            });
            noteTimelineRef.current = timeline;

            // Cache sorted keys for seek optimization
            timelineKeysRef.current = Array.from(timeline.keys()).sort((a, b) => a - b);


            // Loop adjustment? No, user wants linear play.

            setState((prev) => ({
                ...prev,
                isLoaded: true,
                duration: midi.duration,
                midi: midi,
                currentTick: 0,
                currentTime: 0,
                activeNotes: [], // Reset active notes on new song
                isLooping: false,
                loopStartTick: 0,
                loopEndTick: 0
            }));
            // Sync ref
            loopStateRef.current = { isLooping: false, loopStartTick: 0, loopEndTick: 0 };
        }

        init();

        return () => {
            mounted = false;
            if (part) part.dispose();
            Tone.Transport.stop();
            Tone.Transport.cancel();
            Tone.Transport.seconds = 0;
            Tone.Transport.ticks = 0;
        };
    }, [source]);
    // Sync Loop for UI
    useEffect(() => {
        let animationFrame: number;

        const syncLoop = () => {
            if (Tone.Transport.state !== "started") {
                setState(prev => ({ ...prev, isPlaying: false }));
                return;
            }

            const currentTick = Math.floor(Tone.Transport.ticks);
            const lastProcessedTick = lastProcessedTickRef.current;
            let notesChanged = false;

            // Determine direction for tick processing
            const startTick = Math.min(lastProcessedTick, currentTick);
            const endTick = Math.max(lastProcessedTick, currentTick);

            // Backwards seek: reset state
            if (currentTick < lastProcessedTick) {
                rebuildActiveNotes(currentTick);
                notesChanged = true; // Force state update
            } else { // Process ticks forward
                // When starting from tick 0, we need to include it in processing
                // Otherwise we skip it by starting at startTick + 1
                const firstTick = (lastProcessedTick === 0 && currentTick >= 0) ? 0 : startTick + 1;
                for (let tick = firstTick; tick <= endTick; tick++) {
                    if (noteTimelineRef.current.has(tick)) {
                        notesChanged = true;
                        const events = noteTimelineRef.current.get(tick)!;
                        events.forEach(event => {
                            const key = `${event.note}-${event.track}`;
                            if (event.type === 'start') {
                                activeNotesRef.current.set(key, { note: event.note, track: event.track, velocity: event.velocity });
                            } else {
                                activeNotesRef.current.delete(key);
                            }
                        });
                    }
                }
            }


            lastProcessedTickRef.current = currentTick;

            // Looping Logic (TICKS BASED)
            const { isLooping, loopStartTick, loopEndTick } = loopStateRef.current;
            // Guard against invalid loop or infinite seek loops
            // Guard against invalid loop or infinite seek loops
            // Use 48 ticks buffer (approx 1/10th beat at 480PPQ)
            if (isLooping && loopEndTick > loopStartTick + 48 && currentTick >= loopEndTick) {
                console.log(`[Loop] Looping back to tick ${loopStartTick}`);

                // Seek by TICKS
                Tone.Transport.ticks = loopStartTick;

                // Update internal state immediately for next frame
                lastProcessedTickRef.current = loopStartTick;
                rebuildActiveNotes(loopStartTick);

                return; // next frame will sync UI
            }

            // Calculate Preview Notes
            // Lookahead time scales with playback rate: slower speed = longer lookahead (earlier warning)
            // Base lookahead: 0.5s? Let's try adaptive.
            // If Rate is 0.5, we want to see 1s into future?
            // If Rate is 2.0, we want to see 0.25s into future?
            // Actually, constant *distance* on screen means constant *time* if scrolling speed is constant?
            // But waterfall speed depends on playback rate.
            // So we want a fixed *time* window relative to the user's reaction time?
            // "slowing down the song increases the preview duration" -> Yes, 1s at 0.5x is 2s of "real time".

            // Let's use a base lookahead of 400ms.
            // At 1.0x, it's 400ms.
            // At 0.5x, it's 800ms of song time? Or user meant "earlier relative to playback"?
            // User said: "slowing down the song increases the preview duration"
            // So if base is 500ms.
            // Rate 0.5 -> Preview 1000ms.

            const baseLookAhead = 0.5; // seconds
            const adjustedLookAhead = baseLookAhead * (1 / (playbackRate || 1));
            const lookAheadTicks = Tone.Time(adjustedLookAhead).toTicks();
            const previewEndOfWindow = currentTick + lookAheadTicks;

            const previewNotes: PreviewNote[] = [];
            // Naive iteration for preview (optimization possible but map is sparse-ish)
            // Better: iterate only relevant ticks. But map keys are not sorted in structure, only if we explicitly sort keys.
            // We can't easily query range on Map.
            // But we have `midi.tracks` structure.
            // Let's iterate midi tracks -> notes using binary search or the sorted `allNotes` if we had it.
            // Accessing `state.midi` here might be stale or slow?
            // Actually, `noteTimelineRef` is just events.
            // Let's just iterate `noteTimelineRef`? No, too slow.

            // We can rely on proper binary search if we had a sorted event list.
            // Let's stick to what we need. Use the MIDI object if available?
            if (state.midi) {
                // This is running in loop, so keep it light.
                // Binary search for note starts in [currentTick, previewEndOfWindow]?
                // `state.midi` structure is track -> notes (sorted by default? yes usually).
                // Let's assume sorted.

                state.midi.tracks.forEach((track, trackIndex) => {
                    // Find first note > currentTick
                    // We can simple loop from last known index? 
                    // But we don't track indices per track.
                    // A simple find here is O(N) but N is small per track usually? No, can be large.
                    // Binary search is better.

                    // Optimization: Use a cached "next note index" per track?
                    // Managing that ref is complex with seeking.

                    // Let's just do a quick scan on visible window since we don't have indexes.
                    // Or, just implement binary search helper.

                    let low = 0, high = track.notes.length - 1;
                    let startIdx = -1;

                    while (low <= high) {
                        const mid = Math.floor((low + high) / 2);
                        if (track.notes[mid].ticks > currentTick) {
                            startIdx = mid;
                            high = mid - 1;
                        } else {
                            low = mid + 1;
                        }
                    }

                    if (startIdx !== -1) {
                        for (let i = startIdx; i < track.notes.length; i++) {
                            const note = track.notes[i];
                            if (note.ticks > previewEndOfWindow) break;
                            previewNotes.push({ note: note.name, track: trackIndex });
                        }
                    }
                });
            }

            setState(prev => {
                const newActiveNotes = Array.from(activeNotesRef.current.values());

                // Deep comparison for preview notes to avoid render
                const previewChanged =
                    prev.previewNotes.length !== previewNotes.length ||
                    !prev.previewNotes.every((n, i) => n.note === previewNotes[i].note && n.track === previewNotes[i].track);

                // Only update state if something has actually changed to prevent re-renders
                if (
                    prev.currentTime === Tone.Transport.seconds &&
                    prev.currentTick === currentTick &&
                    prev.isPlaying === true &&
                    !notesChanged &&
                    !previewChanged
                ) {
                    return prev;
                }

                return {
                    ...prev,
                    currentTime: Tone.Transport.seconds,
                    currentTick,
                    isPlaying: true,
                    activeNotes: newActiveNotes,
                    previewNotes
                };
            });

            animationFrame = requestAnimationFrame(syncLoop);
        };

        if (state.isPlaying) {
            // Reset last tick on play to avoid large jumps
            lastProcessedTickRef.current = Math.floor(Tone.Transport.ticks);
            animationFrame = requestAnimationFrame(syncLoop);
        } else {
            // Ensure isPlaying is false when transport is not started
            if (Tone.Transport.state !== 'started') {
                setState(prev => ({ ...prev, isPlaying: false }));
            }
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [state.isPlaying]);


    // Controls
    const togglePlay = async () => {
        try {
            await Tone.start();

            // Explicitly resume context if suspended (iOS fix)
            if (Tone.context.state === 'suspended') {
                await Tone.context.resume();
            }

            if (Tone.Transport.state === "started") {
                Tone.Transport.pause();
                setState((prev) => ({ ...prev, isPlaying: false }));
            } else {
                Tone.Transport.start();
                setState((prev) => ({ ...prev, isPlaying: true }));
            }
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    };

    const stop = () => {
        if (Tone.Transport.state === "started") {
            Tone.Transport.stop();
        }
        // Force reset transport time to 0
        Tone.Transport.seconds = 0;

        // Also reset internal state
        lastProcessedTickRef.current = 0;
        rebuildActiveNotes(0);

        setState((prev) => ({
            ...prev,
            isPlaying: false,
            currentTime: 0,
            currentTick: 0,
            activeNotes: [],
            isLooping: false,
            loopStartTick: 0,
            loopEndTick: 0
        }));
        loopStateRef.current = { isLooping: false, loopStartTick: 0, loopEndTick: 0 };
    };

    const seek = (time: number) => {
        Tone.Transport.seconds = time;
        // Use Tone's internal tick calculation which respects the tempo map
        const newTick = Tone.Transport.ticks;
        lastProcessedTickRef.current = newTick;

        const newActiveNotes = rebuildActiveNotes(newTick);

        setState(prev => ({
            ...prev,
            currentTime: time,
            currentTick: newTick,
            activeNotes: newActiveNotes
        }));
    };

    const changeSpeed = (rate: number) => {
        setPlaybackRate(rate);
        Tone.Transport.bpm.value = baseBpmRef.current * rate;
    };

    const toggleLoop = () => {
        setState(prev => {
            const newLooping = !prev.isLooping;
            let start = prev.loopStartTick;
            let end = prev.loopEndTick;

            if (newLooping && start === 0 && end === 0) {
                // Default to whole song (in ticks)
                if (prev.midi) {
                    // midi.durationTicks might not be exposed directly by @tonejs/midi?
                    // Actually it is. But let's verify. 
                    // If not, we can calculate from duration * speed? No.
                    // Midi object has tracks[0].durationTicks usually.
                    // Safe fallback: Tone.Transport.toTicks(prev.duration) (but prev.duration is unscaled seconds)
                    // Tone.Transport.toTicks uses CURRENT BPM. If BPM is different from initial, this might be wrong for absolute duration?
                    // BUT midi.duration is constant. Ticks are constant.
                    // Best to set end = max tick found? or just leave as is.
                    // Let's use Tone helper if available, or just a large number? No.
                    // Let's assume midi is loaded.
                    end = Math.max(...prev.midi.tracks.map(t => t.notes.length > 0 ? t.notes[t.notes.length - 1].ticks + t.notes[t.notes.length - 1].durationTicks : 0), 0);
                }
            }

            return { ...prev, isLooping: newLooping, loopStartTick: start, loopEndTick: end };
        });
    };

    const setLoop = (start: number, end: number) => {
        // UI sends Seconds. Convert to Ticks.
        const startTick = Tone.Time(start).toTicks();
        const endTick = Tone.Time(end).toTicks();
        setState(prev => ({ ...prev, loopStartTick: startTick, loopEndTick: endTick }));
    };

    // Keep Loop Ref in Sync with State
    useEffect(() => {
        loopStateRef.current = {
            isLooping: state.isLooping,
            loopStartTick: state.loopStartTick,
            loopEndTick: state.loopEndTick
        };
    }, [state.isLooping, state.loopStartTick, state.loopEndTick]);

    return {
        ...state,
        duration: state.duration / playbackRate,
        togglePlay,
        stop,
        seek,
        playbackRate,
        setPlaybackRate: changeSpeed,
        toggleLoop,
        setLoop,
        // Expose Seconds for UI compatibility
        loopStart: typeof window !== 'undefined' ? Tone.Time(state.loopStartTick, "i").toSeconds() : 0,
        loopEnd: typeof window !== 'undefined' ? Tone.Time(state.loopEndTick, "i").toSeconds() : 0
    };
}
