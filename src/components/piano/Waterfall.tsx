"use client";

import { useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { twMerge } from "tailwind-merge";

interface WaterfallProps {
    midi: Midi | null;
    currentTick: number;
    playbackRate?: number;
    activeColors?: {
        split: boolean;
        left: string;
        right: string;
        unified: string;
    };
    lookAheadTicks?: number;
}

export function Waterfall({ midi, currentTick, playbackRate = 1, activeColors, lookAheadTicks = 0 }: WaterfallProps) {

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

        const active: {
            id: string; left: string; width: string; bottom: string; height: string; isBlack: boolean; name: string; color: string;
            isApproaching: boolean; isActive: boolean;
        }[] = [];

        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];

            // If note starts after the window, we can stop
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
                const bottomPct = ((note.ticks - currentTick) / windowSizeTicks) * 100;
                const heightPct = (note.durationTicks / windowSizeTicks) * 100;

                const { left, width, isBlack } = getNotePosition(note.midi);

                const isActive = note.ticks <= currentTick && (note.ticks + note.durationTicks) >= currentTick;

                // Calculate threshold based on lookAheadTicks if available, otherwise fallback (though fallback shouldn't be needed if strictly passed)
                // Fallback logic approximated: 15% window roughly 0.5s at normal speed? 
                // windowSize = 6 beats. at 120bpm = 3s. 15% of 3s = 0.45s. Checks out.
                const approachThreshold = lookAheadTicks > 0
                    ? (lookAheadTicks / windowSizeTicks) * 100
                    : 15 / (playbackRate || 1);

                // Only mark as approaching if:
                // 1. Not currently active (hit line)
                // 2. Within threshold
                let isApproaching = !isActive && bottomPct < approachThreshold && bottomPct > 0;

                if (isApproaching) {
                    const duplicate = active.find(n => n.name === note.name && n.isApproaching);
                    if (duplicate) isApproaching = false;
                }

                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left: `${left}%`,
                    width: `${width}%`,
                    bottom: `${bottomPct}%`,
                    height: `${heightPct}%`,
                    isBlack,
                    name: note.name,
                    color: note.color,
                    isApproaching,
                    isActive
                });
            }
        }

        return active;
    }, [midi, currentTick, allNotes, maxDuration, playbackRate, lookAheadTicks]);


    return (
        <div className="relative h-full w-full overflow-hidden bg-transparent perspective-500">
            {visibleNotes.map(note => (
                <div key={note.id}>
                    {/* Connecting Line (Approaching) */}
                    {note.isApproaching && (
                        <div
                            className="absolute z-0 w-[1px] bg-white/20 transition-opacity duration-200"
                            style={{
                                left: `calc(${note.left} + ${parseFloat(note.width) / 2}%)`,
                                bottom: 0,
                                height: `${note.bottom}`,
                                width: "1px",
                                background: `linear-gradient(to top, ${note.color}00, ${note.color}80)`,
                                opacity: Math.max(0, 1 - (parseFloat(note.bottom) / ((lookAheadTicks > 0 ? (lookAheadTicks / (6 * midi!.header.ppq)) * 100 : 15 / playbackRate))))
                            }}
                        />
                    )}

                    {/* Hit Flash / Punch Effect (Active) */}
                    {note.isActive && (
                        <div
                            key={`${note.id}-flash`}
                            className="absolute z-30"
                            style={{
                                left: note.left,
                                width: note.width,
                                bottom: "0px",
                                height: "30px", // Vertical flash
                                background: `linear-gradient(to top, ${note.color}ff, ${note.color}00)`, // Fade up
                                opacity: 0.8,
                                transformOrigin: "bottom center",
                                animation: "ping 0.4s cubic-bezier(0,0,0.2,1) 1 forwards", // Reuse ping but clamped
                                filter: 'blur(2px)' // Soft glare
                            }}
                        />
                    )}

                    {/* Note Body */}
                    <div
                        className={twMerge(
                            "absolute rounded-sm opacity-90 shadow-sm transition-transform",
                            note.isBlack ? "z-20" : "z-10",
                            note.isActive && "brightness-125"
                        )}
                        style={{
                            left: note.left,
                            width: note.width,
                            bottom: note.bottom,
                            height: note.height,
                            background: `linear-gradient(to top, ${note.color}, ${note.color}80)`,
                            border: `1px solid ${note.color}`,
                            boxShadow: note.isActive ? `0 0 20px ${note.color}, 0 0 10px white` : `0 0 15px ${note.color}80, 0 0 5px ${note.color} inset`,
                            borderRadius: "4px",
                            zIndex: note.isBlack ? 20 : 10,
                        }}
                    >
                    </div>
                </div>
            ))}
        </div>
    );
}
