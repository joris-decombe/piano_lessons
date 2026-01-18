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


    const { allNotes, maxDuration } = useMemo(() => {
        if (!midi) return { allNotes: [], maxDuration: 0 };

        const notes: {
            ticks: number;
            durationTicks: number;
            midi: number;
            name: string;
            color: string;
        }[] = [];
        let maxDur = 0;

        midi.tracks.forEach((track, trackIndex) => {
            if (track.notes.length === 0) return;
            if (track.instrument.percussion) return;

            let noteColor = "#22d3ee";
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
                if (note.durationTicks > maxDur) maxDur = note.durationTicks;
                notes.push({
                    ticks: note.ticks,
                    durationTicks: note.durationTicks,
                    midi: note.midi,
                    name: note.name,
                    color: noteColor,
                });
            });
        });

        // Sort by start tick
        return { allNotes: notes.sort((a, b) => a.ticks - b.ticks), maxDuration: maxDur };
    }, [midi, activeColors]);

    const visibleNotes = useMemo(() => {
        if (!midi || allNotes.length === 0) return [];

        const PPQ = midi.header.ppq;
        const windowSizeTicks = 6 * PPQ;
        const endTime = currentTick + windowSizeTicks;

        let startIdx = 0;
        let left = 0;
        let right = allNotes.length - 1;

        // Find first note that starts >= currentTick
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (allNotes[mid].ticks < currentTick) {
                left = mid + 1;
            } else {
                startIdx = mid;
                right = mid - 1;
            }
        }

        // Backtrack to find notes that started before currentTick but overlap
        // We look back by maxDuration to ensure we catch all potential overlaps
        let renderStartIdx = startIdx;
        const lookbackTicks = maxDuration;

        // Optimization: Don't scan blindly, use binary search?
        // No, simple backtrack is okay if we don't go back too far.
        // But if maxDuration is huge (e.g. whole song), this degrades to linear scan from beginning in worst case?
        // Yes, if there is one huge note at the beginning.
        // Ideally we'd use an Interval Tree.
        // But for typical piano music, extremely long notes are rare.
        // A better heuristic might be to stop backtracking if we see a gap > maxDuration?
        // Or simply: check notes backward from startIdx. Stop when note.ticks < currentTick - maxDuration.
        // Since notes are sorted by start time, if note[i].ticks < currentTick - maxDuration,
        // then note[i] started too early to possibly overlap (since its duration <= maxDuration).

        while (renderStartIdx > 0 && allNotes[renderStartIdx - 1].ticks > currentTick - lookbackTicks) {
             renderStartIdx--;
        }

        const active: { id: string; left: string; width: string; bottom: string; height: string; isBlack: boolean; name: string; color: string }[] = [];

        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];

            // If note starts after the window, we can stop
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
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
                        color: note.color
                    });
            }
        }

        return active;
    }, [midi, currentTick, allNotes, maxDuration]);


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
