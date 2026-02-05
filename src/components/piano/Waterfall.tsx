"use client";

import { useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { twMerge } from "tailwind-merge";
import { getKeyPosition, getTotalKeyboardWidth } from "./geometry";
import { getColorByTrack } from "@/lib/note-colors";

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

        const colors = activeColors ?? { split: true, left: "#fb7185", right: "#22d3ee", unified: "#fbbf24" };

        midi.tracks.forEach((track, trackIndex) => {
            if (track.notes.length === 0 || track.instrument.percussion) return;
            const noteColor = getColorByTrack(trackIndex, colors);

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
                            backgroundColor: note.color,
                            border: '1px solid rgba(0,0,0,1)',
                            boxShadow: 'var(--shadow-bevel-note)',
                            imageRendering: 'pixelated'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}