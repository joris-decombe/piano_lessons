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
    containerHeight: number; // New: Pixel height of the container
}

export function Waterfall({ midi, currentTick, activeColors, lookAheadTicks = 0, showGrid = true, containerHeight }: WaterfallProps) {

    const totalWidth = getTotalKeyboardWidth();

    const { allNotes, maxDuration } = useMemo(() => {
        if (!midi) return { allNotes: [], maxDuration: 0 };
        const notes: { ticks: number; durationTicks: number; midi: number; name: string; color: string; }[] = [];
        let maxDur = 0;

        midi.tracks.forEach((track, trackIndex) => {
            if (track.notes.length === 0 || track.instrument.percussion) return;
            let noteColor = trackIndex === 0 ? activeColors?.right || "#22d3ee" : activeColors?.left || "#fb7185";
            if (activeColors && !activeColors.split) noteColor = activeColors.unified;

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
        return { allNotes: notes.sort((a, b) => a.ticks - b.ticks), maxDuration: maxDur };
    }, [midi, activeColors]);

    const visibleNotes = useMemo(() => {
        if (!midi || allNotes.length === 0) return [];

        const PPQ = midi.header.ppq;
        // Use lookAheadTicks if provided, otherwise default to 6 beats
        const windowSizeTicks = (lookAheadTicks && lookAheadTicks > 0) ? lookAheadTicks : 6 * PPQ;
        const endTime = currentTick + windowSizeTicks;

        let startIdx = 0;
        let leftIdx = 0;
        let rightIdx = allNotes.length - 1;

        while (leftIdx <= rightIdx) {
            const mid = Math.floor((leftIdx + rightIdx) / 2);
            if (allNotes[mid].ticks < currentTick) {
                leftIdx = mid + 1;
            } else {
                startIdx = mid;
                rightIdx = mid - 1;
            }
        }

        let renderStartIdx = startIdx;
        while (renderStartIdx > 0 && allNotes[renderStartIdx - 1].ticks > currentTick - maxDuration) {
            renderStartIdx--;
        }

        const active: { id: string; left: number; width: number; bottom: number; height: number; isBlack: boolean; color: string; }[] = [];

        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
                // Calculate pixel positions (Snapped to grid)
                const bottomPx = Math.round(((note.ticks - currentTick) / windowSizeTicks) * containerHeight);
                const heightPx = Math.round((note.durationTicks / windowSizeTicks) * containerHeight);

                const { left, width, isBlack } = getKeyPosition(note.midi);

                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left,
                    width,
                    bottom: bottomPx,
                    height: heightPx,
                    isBlack,
                    color: note.color,
                });
            }
        }
        return active;
    }, [midi, currentTick, allNotes, maxDuration, lookAheadTicks, containerHeight]);

    return (
        <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${totalWidth}px` }}
        >
            {/* Octave Guidelines */}
            {showGrid && Array.from({ length: 9 }).map((_, i) => {
                const midiC = 24 + (i * 12);
                if (midiC > 108) return null;
                const { left } = getKeyPosition(midiC);
                return (
                    <div
                        key={`guide-c-${i}`}
                        className="absolute top-0 bottom-0 w-[1px] pointer-events-none z-0"
                        style={{ 
                            left: `${left}px`,
                            backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 50%, transparent 50%)',
                            backgroundSize: '1px 4px'
                        }}
                    />
                );
            })}

            <div className="relative w-full h-full">
                {visibleNotes.map(note => (
                    <div 
                        key={note.id}
                        className={twMerge(
                            "absolute",
                            note.isBlack ? "z-15" : "z-10"
                        )}
                        style={{
                            left: `${note.left}px`,
                            width: `${note.width}px`,
                            bottom: `${note.bottom}px`,
                            height: `${note.height}px`,
                            // Pixel Art: High-Contrast "Tetris" Block Style
                            backgroundColor: note.color,
                            // 1. Crisp Outer Border
                            border: '1px solid rgba(0,0,0,1)',
                            // 2. Multi-layered Nested Bevel (16-bit style)
                            boxShadow: `
                                inset 1px 1px 0 0 rgba(255, 255, 255, 0.9), 
                                inset 2px 2px 0 0 rgba(255, 255, 255, 0.4),
                                inset -1px -1px 0 0 rgba(0, 0, 0, 0.6),
                                inset -2px -2px 0 0 rgba(0, 0, 0, 0.3)
                            `,
                            // Ensure crisp edges
                            imageRendering: 'pixelated'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}