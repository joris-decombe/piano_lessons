import { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import { validatePlaybackRate } from "@/lib/audio-logic";

export interface ActiveNote {
    note: string;
    track: number;
    velocity: number;
    /** 
     * Timestamp (in ticks) when this note started. 
     * Used by EffectsEngine to distinguish separate attacks of the same pitch. 
     */
    startTick: number;
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
    rawTicks: number; // For sorting
}

export interface SongSource {
    url?: string;
    abc?: string;
    type: 'midi' | 'abc' | 'musicxml';
}

export interface PianoAudioSettings {
    lookAheadTime?: number;
    initialPlaybackRate?: number;
    initialTick?: number;
}

export function usePianoAudio(source: SongSource, settings: PianoAudioSettings = {}) {
    const { lookAheadTime = 1.5, initialPlaybackRate, initialTick } = settings;
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
    const handIndexRef = useRef<number[]>([]); // MIDI track → hand index
    const activeNotesRef = useRef<Map<string, ActiveNote>>(new Map());
    const lastProcessedTickRef = useRef(0);
    const [playbackRate, setPlaybackRate] = useState(initialPlaybackRate ?? 1);
    const playbackRateRef = useRef(initialPlaybackRate ?? 1);
    const initialTickRef = useRef(initialTick ?? 0);
    const baseBpmRef = useRef<number>(120);

    // Keep ref in sync
    useEffect(() => {
        playbackRateRef.current = playbackRate;
    }, [playbackRate]);
    // Ref to hold mutable loop state for the animation loop
    const loopStateRef = useRef({ isLooping: false, loopStartTick: 0, loopEndTick: 0 });
    const lastPreviewNotesRef = useRef<PreviewNote[]>([]);

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
                const key = `${event.note} -${event.track} `;
                if (event.type === 'start') {
                    activeNotesRef.current.set(key, {
                        note: event.note,
                        track: event.track,
                        velocity: event.velocity,
                        startTick: tick
                    });
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
        let sampler: Tone.Sampler | null = null;

        async function init() {
            if (!source) return;

            // 1. Setup Sampler
            sampler = new Tone.Sampler({
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
                baseUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? '/piano_lessons'}/salamander/`,
            }).toDestination();

            await Tone.loaded();
            if (!mounted) {
                sampler.dispose();
                return;
            }
            samplerRef.current = sampler;

            // 2. Load MIDI or Parse ABC
            let arrayBuffer: ArrayBuffer | Uint8Array;

            if (source.type === 'abc' && source.abc) {
                const { abcToMidiBuffer } = await import('@/lib/abc-loader');
                arrayBuffer = abcToMidiBuffer(source.abc);
            } else if (source.type === 'musicxml' && source.url) {
                const response = await fetch(source.url);
                if (!response.ok) {
                    console.error(`Failed to fetch MusicXML: ${response.status} ${response.statusText}`);
                    return;
                }
                const text = await response.text();
                const { MusicXMLParser } = await import('@/lib/musicxml/parser');
                const { MIDIGenerator } = await import('@/lib/musicxml/midi-generator');
                try {
                    const parser = new MusicXMLParser();
                    const score = parser.parse(text);
                    const generator = new MIDIGenerator();
                    const midiBase64 = generator.generate(score);

                    // Convert base64 to Uint8Array
                    const binaryString = atob(midiBase64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    arrayBuffer = bytes;
                } catch (e) {
                    console.error('Failed to parse MusicXML:', e);
                    return;
                }
            } else if (source.type === 'midi' && source.url) {
                const response = await fetch(source.url);
                arrayBuffer = await response.arrayBuffer();
            } else {
                console.error("Invalid source", source);
                return;
            }

            const midi = new Midi(arrayBuffer);

            if (!mounted) {
                sampler.dispose();
                return;
            }

            // 3. Schedule Notes using Tone.Part & Ticks
            // Ensure transport is stopped before modifying PPQ
            Tone.Transport.stop();
            Tone.Transport.cancel();

            // Set PPQ from MIDI to match tick resolution
            Tone.Transport.PPQ = midi.header.ppq || 480;

            // Get initial BPM from MIDI or default
            const initialBpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
            baseBpmRef.current = initialBpm;
            // Apply current playback rate to the initial BPM
            Tone.Transport.bpm.value = initialBpm * playbackRateRef.current;

            const notes: NoteEvent[] = [];
            midi.tracks.forEach((track) => {
                track.notes.forEach((note) => {
                    notes.push({
                        time: `${note.ticks}i`, // No space!
                        note: note.name,
                        duration: Math.max(0, note.duration),
                        velocity: note.velocity,
                        rawTicks: note.ticks
                    });
                });
            });

            // Sort notes by ticks to ensure Tone.Part plays them correctly
            notes.sort((a, b) => a.rawTicks - b.rawTicks);

            part = new Tone.Part((time, value: NoteEvent) => {
                try {
                    if (!value.duration || value.duration <= 0) {
                        return;
                    }
                    samplerRef.current?.triggerAttackRelease(
                        value.note,
                        Math.max(0.001, value.duration),
                        Math.max(0, time),
                        value.velocity
                    );
                } catch (e) {
                    console.error("Part callback error:", e);
                }
            }, notes).start(0);

            // 4. Pre-compute Note Timeline for efficient active note lookup
            // Map MIDI track indices to hand indices (staff-aware for MusicXML)
            const handIndex = midi.tracks.map((t, i) => {
                const m = t.name.match(/-staff(\d+)/);
                return m ? parseInt(m[1]) - 1 : i;
            });
            const timeline = new Map<number, { note: string, type: 'start' | 'stop', track: number, velocity: number }[]>();
            midi.tracks.forEach((track, trackIndex) => {
                const hand = handIndex[trackIndex];
                track.notes.forEach(note => {
                    const startTick = note.ticks;
                    const endTick = startTick + note.durationTicks;

                    // Add note start event
                    if (!timeline.has(startTick)) timeline.set(startTick, []);
                    timeline.get(startTick)!.push({ note: note.name, type: 'start', track: hand, velocity: note.velocity });

                    // Add note stop event
                    if (!timeline.has(endTick)) timeline.set(endTick, []);
                    timeline.get(endTick)!.push({ note: note.name, type: 'stop', track: hand, velocity: 0 });
                });
            });
            noteTimelineRef.current = timeline;
            handIndexRef.current = handIndex;

            // Cache sorted keys for seek optimization
            timelineKeysRef.current = Array.from(timeline.keys()).sort((a, b) => a - b);


            // Restore saved position if provided
            const restoreTick = initialTickRef.current;
            if (restoreTick > 0) {
                Tone.Transport.ticks = restoreTick;
                lastProcessedTickRef.current = restoreTick;
            }

            const restoredNotes = restoreTick > 0 ? rebuildActiveNotes(restoreTick) : [];

            setState((prev) => ({
                ...prev,
                isLoaded: true,
                duration: midi.duration,
                midi: midi,
                currentTick: restoreTick,
                currentTime: restoreTick > 0 ? restoreTick / ((midi.header.ppq || 480) * (initialBpm / 60)) : 0,
                activeNotes: restoredNotes,
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
            if (part) {
                part.stop();
                part.dispose();
            }
            if (sampler) {
                sampler.releaseAll();
                sampler.dispose();
            }
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
            try {
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
                                const key = `${event.note} -${event.track} `;
                                if (event.type === 'start') {
                                    activeNotesRef.current.set(key, {
                                        note: event.note,
                                        track: event.track,
                                        velocity: event.velocity,
                                        startTick: tick
                                    });
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
                // Use 48 ticks buffer (approx 1/10th beat at 480PPQ)
                if (isLooping && loopEndTick > loopStartTick + 48 && currentTick >= loopEndTick) {
                    // Seek by TICKS
                    Tone.Transport.ticks = loopStartTick;

                    // Update internal state immediately for next frame
                    lastProcessedTickRef.current = loopStartTick;
                    rebuildActiveNotes(loopStartTick);

                    // Force UI update on loop point
                    // We need to ensure state reflects the jump
                    setState(prev => ({
                        ...prev,
                        currentTime: Tone.Transport.seconds,
                        currentTick: loopStartTick,
                        activeNotes: Array.from(activeNotesRef.current.values())
                    }));

                    animationFrame = requestAnimationFrame(syncLoop);
                    return;
                }

                // Calculate BPM-invariant time (Song Position)
                const ppq = Tone.Transport.PPQ;
                const baseBpm = baseBpmRef.current;
                const songTime = currentTick / (ppq * (baseBpm / 60));

                // Calculate Preview Notes only if we've moved significantly (every ~10 ticks)
                // This reduces computation while keeping the waterfall smooth
                const lastPreview = lastPreviewNotesRef.current;
                let previewNotes = lastPreview;
                let previewChanged = false;

                // Only recalculate preview notes every ~10 ticks or when notes changed
                const shouldRecalcPreview = notesChanged || Math.abs(currentTick - lastProcessedTick) > 10 || lastPreview.length === 0;

                if (shouldRecalcPreview && state.midi) {
                    const baseLookAhead = lookAheadTime;
                    const adjustedLookAhead = Math.max(0, baseLookAhead * (1 / (playbackRate || 1)));
                    const lookAheadTicks = Tone.Time(adjustedLookAhead).toTicks();
                    const previewEndOfWindow = currentTick + lookAheadTicks;

                    const newPreviewNotes: PreviewNote[] = [];

                    state.midi.tracks.forEach((track, trackIndex) => {
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
                                newPreviewNotes.push({ note: note.name, track: handIndexRef.current[trackIndex] ?? trackIndex });
                            }
                        }
                    });

                    // Check if preview actually changed
                    previewChanged =
                        lastPreview.length !== newPreviewNotes.length ||
                        !lastPreview.every((n, i) => n.note === newPreviewNotes[i]?.note && n.track === newPreviewNotes[i]?.track);

                    if (previewChanged) {
                        previewNotes = newPreviewNotes;
                        lastPreviewNotesRef.current = newPreviewNotes;
                    }
                }

                // Only update state if something has actually changed to prevent re-renders
                setState(prev => {
                    if (
                        Math.abs(prev.currentTime - songTime) < 0.01 &&
                        prev.currentTick === currentTick &&
                        prev.isPlaying === true &&
                        !notesChanged &&
                        !previewChanged
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        currentTime: songTime,
                        currentTick,
                        isPlaying: true,
                        activeNotes: notesChanged ? Array.from(activeNotesRef.current.values()) : prev.activeNotes,
                        previewNotes: previewChanged ? previewNotes : prev.previewNotes
                    };
                });

                animationFrame = requestAnimationFrame(syncLoop);
            } catch (error) {
                console.error("Error in syncLoop:", error);
                // Attempt to recover
                animationFrame = requestAnimationFrame(syncLoop);
            }
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
    }, [state.isPlaying, playbackRate, state.midi, lookAheadTime]);


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


    const seek = (time: number) => {
        Tone.Transport.seconds = Math.max(0, time);
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
        const validatedRate = validatePlaybackRate(rate);
        setPlaybackRate(validatedRate);
        Tone.Transport.bpm.value = baseBpmRef.current * validatedRate;
    };

    const toggleLoop = () => {
        setState(prev => {
            const newLooping = !prev.isLooping;
            const start = prev.loopStartTick;
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
        // UI sends Seconds. Convert to Ticks. Clamp to avoid floating point negatives.
        const startTick = Tone.Time(Math.max(0, start)).toTicks();
        const endTick = Tone.Time(Math.max(0, end)).toTicks();
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

    // Calculate current lookahead in ticks for UI visualization
    const currentLookAheadTicks = useMemo(() => {
        if (typeof window === 'undefined') return 0;
        const adjusted = Math.max(0, (lookAheadTime || 0) * (1 / (playbackRate || 1)));
        return Tone.Time(adjusted).toTicks();
    }, [lookAheadTime, playbackRate]);

    return {
        ...state,
        playbackRate,
        setPlaybackRate: changeSpeed,
        togglePlay,
        seek,
        currentTime: Tone.Transport.seconds,
        duration: state.duration, // Revert to state.duration for safety
        toggleLoop,
        setLoop,
        loopStart: typeof window !== 'undefined' ? Tone.Time(state.loopStartTick, "i").toSeconds() : 0,
        loopEnd: typeof window !== 'undefined' ? Tone.Time(state.loopEndTick, "i").toSeconds() : 0,
        lookAheadTicks: currentLookAheadTicks,
    };
}
