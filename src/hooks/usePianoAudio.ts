import { useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

export interface ActiveNote {
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
    });

    const samplerRef = useRef<Tone.Sampler | null>(null);
    const noteTimelineRef = useRef<Map<number, { note: string; type: "start" | "stop"; track: number }[]>>(new Map());
    const activeNotesRef = useRef<Map<string, ActiveNote>>(new Map());
    const lastProcessedTickRef = useRef(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const baseBpmRef = useRef<number>(120);

    /**
     * Helper to recalculate all active notes from tick 0 up to a target tick.
     * Used for seeking or correcting state after a backward jump in time.
     */
    const rebuildActiveNotes = (targetTick: number) => {
        activeNotesRef.current.clear();
        const relevantTicks = Array.from(noteTimelineRef.current.keys())
            .filter(tick => tick <= targetTick)
            .sort((a, b) => a - b);

        for (const tick of relevantTicks) {
            const events = noteTimelineRef.current.get(tick)!;
            events.forEach(event => {
                const key = `${event.note}-${event.track}`;
                if (event.type === 'start') {
                    activeNotesRef.current.set(key, { note: event.note, track: event.track });
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
            const timeline = new Map<number, { note: string, type: 'start' | 'stop', track: number }[]>();
            midi.tracks.forEach((track, trackIndex) => {
                track.notes.forEach(note => {
                    const startTick = note.ticks;
                    const endTick = startTick + note.durationTicks;

                    // Add note start event
                    if (!timeline.has(startTick)) timeline.set(startTick, []);
                    timeline.get(startTick)!.push({ note: note.name, type: 'start', track: trackIndex });

                    // Add note stop event
                    if (!timeline.has(endTick)) timeline.set(endTick, []);
                    timeline.get(endTick)!.push({ note: note.name, type: 'stop', track: trackIndex });
                });
            });
            noteTimelineRef.current = timeline;


            // Loop adjustment? No, user wants linear play.

            setState((prev) => ({
                ...prev,
                isLoaded: true,
                duration: midi.duration,
                midi: midi,
                currentTick: 0,
                currentTime: 0,
                activeNotes: [], // Reset active notes on new song
            }));
        }

        init();

        return () => {
            mounted = false;
            if (part) part.dispose();
            Tone.Transport.cancel();
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
                for (let tick = startTick + 1; tick <= endTick; tick++) {
                    if (noteTimelineRef.current.has(tick)) {
                        notesChanged = true;
                        const events = noteTimelineRef.current.get(tick)!;
                        events.forEach(event => {
                            const key = `${event.note}-${event.track}`;
                            if (event.type === 'start') {
                                activeNotesRef.current.set(key, { note: event.note, track: event.track });
                            } else {
                                activeNotesRef.current.delete(key);
                            }
                        });
                    }
                }
            }


            lastProcessedTickRef.current = currentTick;

            setState(prev => {
                const newActiveNotes = Array.from(activeNotesRef.current.values());
                // Only update state if something has actually changed to prevent re-renders
                if (
                    prev.currentTime === Tone.Transport.seconds &&
                    prev.currentTick === currentTick &&
                    prev.isPlaying === true &&
                    !notesChanged
                ) {
                    return prev;
                }

                return {
                    ...prev,
                    currentTime: Tone.Transport.seconds,
                    currentTick,
                    isPlaying: true,
                    activeNotes: newActiveNotes
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
                 setState(prev => ({...prev, isPlaying: false}));
            }
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [state.isPlaying]);


    // Controls
    const togglePlay = async () => {
        await Tone.start();
        if (Tone.Transport.state === "started") {
            Tone.Transport.pause();
            setState((prev) => ({ ...prev, isPlaying: false }));
        } else {
            Tone.Transport.start();
            setState((prev) => ({ ...prev, isPlaying: true }));
        }
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

    return {
        ...state,
        duration: state.duration / playbackRate,
        togglePlay,
        seek,
        playbackRate,
        setPlaybackRate: changeSpeed,
    };
}
