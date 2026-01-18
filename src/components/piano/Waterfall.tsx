"use client";

import { useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { twMerge } from "tailwind-merge";

interface WaterfallProps {
    midi: Midi | null;
    currentTick: number; // Add this
    activeColors?: {
        split: boolean;
        left: string;
        right: string;
        unified: string;
    };
}

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function Waterfall({ midi, currentTick, activeColors }: WaterfallProps) {

    const getNotePosition = (midiNote: number) => {
        const whiteKeyWidth = 100 / 52;
        let whiteKeyCount = 0;
        for (let i = 21; i < midiNote; i++) {
            const n = i % 12;
            const isBlack = [1, 3, 6, 8, 10].includes(n);
            if (!isBlack) whiteKeyCount++;
        }

        const n = midiNote % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(n);

        if (!isBlack) {
            return { left: whiteKeyCount * whiteKeyWidth, width: whiteKeyWidth, isBlack: false };
        } else {
            const blackWidth = 1.25;
            return { left: (whiteKeyCount * whiteKeyWidth) - (blackWidth / 2), width: blackWidth, isBlack: true };
        }
    };


    const visibleNotes = useMemo(() => {
        if (!midi) return [];

        const active: { id: string; left: string; width: string; bottom: string; height: string; isBlack: boolean; name: string; color: string }[] = [];
        const PPQ = midi.header.ppq;
        // Calculate window size in ticks. 
        // We want roughly same visual amount of notes.
        // Assuming 120BPM roughly for visual scale? Or dynamic?
        // If we use static 3 seconds * 120bpm * ppq / 60?
        // Actually, let's keep it simple: 
        // 1 Beat = PPQ ticks.
        // 3 seconds at 120bpm = 6 beats = 6 * PPQ.
        // User said "Seeing too much" -> Reduce window.
        // Try 8 beats (2 measures of 4/4) or 6 beats?
        // Let's try 6 beats for a balanced view (similar to Synthesia default zoom).
        const windowSizeTicks = 6 * PPQ; // Was 24 * PPQ before.

        midi.tracks.forEach((track, trackIndex) => {
            // Filter out empty tracks
            if (track.notes.length === 0) return;

            // Filter out Drum Channel (Channel 10 is usually mapped to index 9, or check instrument)
            // Tone.js MIDI puts percussion in `track.instrument.percussion` (boolean) usually, 
            // or checks channel. Let's rely on instrument info if available.
            if (track.instrument.percussion) return;

            // Color Logic
            let noteColor = "#22d3ee"; // Fallback
            if (activeColors) {
                if (activeColors.split) {
                    noteColor = trackIndex === 0 ? activeColors.right : activeColors.left;
                } else {
                    noteColor = activeColors.unified;
                }
            } else {
                const colors = ["#22d3ee", "#fb7185", "#a78bfa", "#facc15"];
                noteColor = colors[trackIndex % colors.length];
            }

            track.notes.forEach(note => {
                // Use TICKS: note.ticks, note.durationTicks
                if (note.ticks + note.durationTicks > currentTick && note.ticks < currentTick + windowSizeTicks) {

                    const bottomPct = ((note.ticks - currentTick) / windowSizeTicks) * 100;
                    const heightPct = (note.durationTicks / windowSizeTicks) * 100;

                    const { left, width, isBlack } = getNotePosition(note.midi);

                    active.push({
                        id: `${note.name}-${note.ticks}`,
                        left: `${left}%`,
                        width: `${width}%`,
                        bottom: `${bottomPct}%`,
                        height: `${heightPct}%`,
                        isBlack,
                        name: note.name,
                        color: noteColor
                    });
                }
            });
        });
        return active;
    }, [midi, currentTick, activeColors]);


    return (
        <div className="relative h-full w-full overflow-hidden bg-transparent">
            {visibleNotes.map(note => (
                <div
                    key={note.id}
                    className={twMerge(
                        "absolute rounded-sm opacity-90 shadow-sm",
                        note.isBlack ? "z-20" : "z-10"
                    )}
                    style={{
                        left: note.left,
                        width: note.width,
                        bottom: note.bottom,
                        height: note.height,
                        backgroundColor: "transparent", // Use gradient instead
                        background: `linear-gradient(to top, ${note.color}, ${note.color}80)`,
                        border: `1px solid ${note.color}`,
                        boxShadow: `0 0 15px ${note.color}80, 0 0 5px ${note.color} inset`,
                        borderRadius: "4px",
                        zIndex: note.isBlack ? 20 : 10,
                    }}
                >
                    {/* Optional: Note label */}
                </div>
            ))}
        </div>
    );
}
