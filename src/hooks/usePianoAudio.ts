import { useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

export interface PianoAudioState {
    isLoaded: boolean;
    isPlaying: boolean;
    currentTime: number;
    currentTick: number; // Add this
    duration: number;
    midi: Midi | null;
}

export function usePianoAudio(midiUrl: string) {
    const [state, setState] = useState<PianoAudioState>({
        isLoaded: false,
        isPlaying: false,
        currentTime: 0,
        currentTick: 0,
        duration: 0,
        midi: null,
    });

    const samplerRef = useRef<Tone.Sampler | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const baseBpmRef = useRef<number>(120);

    // Initialize Audio & Load MIDI
    useEffect(() => {
        let mounted = true;
        let part: Tone.Part | null = null;

        async function init() {
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

            // 2. Load MIDI
            const response = await fetch(midiUrl);
            const arrayBuffer = await response.arrayBuffer();
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

            const notes: any[] = [];
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

            part = new Tone.Part((time, value: any) => {
                sampler.triggerAttackRelease(
                    value.note,
                    value.duration,
                    time,
                    value.velocity
                );
            }, notes).start(0);

            // Loop adjustment? No, user wants linear play.

            setState((prev) => ({
                ...prev,
                isLoaded: true,
                duration: midi.duration,
                midi: midi,
            }));
        }

        init();

        return () => {
            mounted = false;
            if (part) part.dispose();
            Tone.Transport.cancel();
        };
    }, [midiUrl]);
    // Sync Loop for UI
    useEffect(() => {
        let animationFrame: number;

        const syncLoop = () => {
            // We only update state if playing to avoid excessive re-renders when paused
            if (Tone.Transport.state === "started") {
                setState((prev) => ({
                    ...prev,
                    currentTime: Tone.Transport.seconds,
                    currentTick: Tone.Transport.ticks,
                    isPlaying: true,
                }));
                animationFrame = requestAnimationFrame(syncLoop);
            } else {
                setState((prev) => ({
                    ...prev,
                    isPlaying: false,
                }));
            }
        };

        if (state.isPlaying) {
            syncLoop();
        }

        // We also need to listen for Transport state changes or manual updates? 
        // Actually, just running this when 'isPlaying' changes isn't enough because 
        // isPlaying is set by the loop itself. 
        // Better: External controls toggle Transport, and we have a watcher here.

        // Simplified: Just run loop when Transport is started.
        // However, react state might not update fast enough to *trigger* this effect.
        // Instead, controls should trigger the state update OR the loop checks Transport.state directly.

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
        setState((prev) => ({ ...prev, currentTime: time }));
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
