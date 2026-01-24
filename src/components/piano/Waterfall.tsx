"use client";

import { useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { twMerge } from "tailwind-merge";
import { getKeyPosition, getTotalKeyboardWidth } from "./geometry";

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
    showGrid?: boolean;
    showPreview?: boolean;
}

export function Waterfall({ midi, currentTick, playbackRate = 1, activeColors, lookAheadTicks = 0, showGrid = true, showPreview = true }: WaterfallProps) {

    // Calculate strict pixel width
    const totalWidth = getTotalKeyboardWidth();

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

            let noteColor = "#22d3ee"; // Default cyan
            if (activeColors) {
                if (activeColors.split) {
                    noteColor = trackIndex === 0 ? activeColors.right : activeColors.left;
                } else {
                    noteColor = activeColors.unified;
                }
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
        let leftIdx = 0;
        let rightIdx = allNotes.length - 1;

        // Binary search for start
        while (leftIdx <= rightIdx) {
            const mid = Math.floor((leftIdx + rightIdx) / 2);
            if (allNotes[mid].ticks < currentTick) {
                leftIdx = mid + 1;
            } else {
                startIdx = mid;
                rightIdx = mid - 1;
            }
        }

        // Backtrack for Overlaps
        let renderStartIdx = startIdx;
        const lookbackTicks = maxDuration;
        while (renderStartIdx > 0 && allNotes[renderStartIdx - 1].ticks > currentTick - lookbackTicks) {
            renderStartIdx--;
        }

        const active: {
            id: string; left: number; width: number; bottom: string; height: string; isBlack: boolean; name: string; color: string;
            isApproaching: boolean; isActive: boolean;
        }[] = [];

        const coveredPitches = new Set<string>();

        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
                const bottomPct = ((note.ticks - currentTick) / windowSizeTicks) * 100;
                const heightPct = (note.durationTicks / windowSizeTicks) * 100;

                // Use shared geometry for pixel precision
                const { left, width, isBlack } = getKeyPosition(note.midi);

                const isActive = note.ticks <= currentTick && (note.ticks + note.durationTicks) >= currentTick;

                const approachThreshold = lookAheadTicks > 0
                    ? (lookAheadTicks / windowSizeTicks) * 100
                    : 15 / (playbackRate || 1);

                let isApproaching = !isActive && bottomPct < approachThreshold && bottomPct > 0;

                if (coveredPitches.has(note.name)) {
                    isApproaching = false;
                }

                if (isActive || isApproaching) {
                    coveredPitches.add(note.name);
                }

                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left,   // Pixels
                    width,  // Pixels
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
        <div
            className="relative h-full overflow-hidden bg-transparent"
            style={{ width: `${totalWidth}px` }} // Force strict width
        >
            {/* Octave Guidelines (Vertical Lines at Cs) */}
            {showGrid && Array.from({ length: 9 }).map((_, i) => {
                const midiC = 24 + (i * 12);
                if (midiC > 108) return null;
                const { left } = getKeyPosition(midiC);
                return (
                    <div
                        key={`guide-c-${i}`}
                        className="absolute top-0 bottom-0 w-[1px] bg-white/5 pointer-events-none z-0"
                        style={{ left: `${left}px` }}
                    />
                );
            })}

            {visibleNotes.map(note => (
                <div key={note.id}>
                    {/* Connecting Line (Approaching) */}
                    {showPreview && note.isApproaching && (
                        <div
                            className="absolute z-0 w-[1px] transition-opacity duration-200"
                            style={{
                                left: `${note.left + (note.width / 2)}px`,
                                bottom: 0,
                                height: `${note.bottom}`,
                                background: `linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.4))`,
                                opacity: Math.max(0, 1 - (parseFloat(note.bottom) / ((lookAheadTicks > 0 ? (lookAheadTicks / (6 * midi!.header.ppq)) * 100 : 15 / playbackRate))))
                            }}
                        />
                    )}

                    {/* Active Hit Flash (Vertical) */}
                    {note.isActive && (
                        <div
                            key={`${note.id}-flash-v`}
                            className="absolute z-30"
                            style={{
                                left: `${note.left}px`,
                                width: `${note.width}px`,
                                bottom: "0px",
                                height: "30px",
                                background: `linear-gradient(to top, ${note.color}cc, ${note.color}00)`,
                                opacity: 1,
                                animation: "ping 0.2s cubic-bezier(0,0,0.2,1) 1 forwards",
                            }}
                        />
                    )}

                    {/* Note Body (Rect) */}
                    <div
                        className={twMerge(
                            "absolute shadow-sm overflow-hidden", // No anti-aliasing needed
                            note.isBlack ? "z-20" : "z-10",
                            note.isActive && "brightness-110"
                        )}
                        style={{
                            left: `${note.left}px`,
                            width: `${note.width}px`,
                            bottom: `calc(${note.bottom} - 4px)`, // Extend down to overlap keys
                            height: `calc(${note.height} + 4px)`, // Maintain top position relative to bottom change? 
                            // If we lower bottom by 4px, we need to increase height by 4px to keep top constant?
                            // Actually, note.bottom is % from bottom. 
                            // Let's just extend height downwards.
                            // If bottom is 0%, we want it to be -4px (pixels).
                            // Mixing % and px in calc is valid.
                            backgroundColor: note.color,
                            opacity: 0.9, // Semi-transparent to see particles behind
                            // Pixel Art Style: 1px Inner Border
                            boxShadow: `inset 0 0 0 1px ${note.color === '#ffffff' ? '#000000' : 'rgba(0,0,0,0.2)'}`,
                            zIndex: note.isBlack ? 20 : 10,
                        }}
                    >
                    </div>
                </div>
            ))}
        </div>
    );
}