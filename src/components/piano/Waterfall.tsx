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
        const windowSizeTicks = 6 * PPQ;
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

        const active: { id: string; left: number; width: number; bottom: string; height: string; isBlack: boolean; color: string; }[] = [];

        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
                const bottomPct = ((note.ticks - currentTick) / windowSizeTicks) * 100;
                const heightPct = (note.durationTicks / windowSizeTicks) * 100;

                const { left, width, isBlack } = getKeyPosition(note.midi);

                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left,
                    width,
                    bottom: `${bottomPct}%`,
                    height: `${heightPct}%`,
                    isBlack,
                    color: note.color,
                });
            }
        }
        return active;
    }, [midi, currentTick, allNotes, maxDuration]);

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
                        className="absolute top-0 bottom-0 w-[1px] bg-white/5 pointer-events-none z-0"
                        style={{ left: `${left}px` }}
                    />
                );
            })}

            <div className="relative w-full h-full">
                {visibleNotes.map(note => (
                    <div 
                        key={note.id}
                        className={twMerge(
                            "absolute shadow-sm",
                            note.isBlack ? "z-15" : "z-10"
                        )}
                        style={{
                            left: `${note.left}px`,
                            width: `${note.width}px`,
                            bottom: note.bottom,
                            height: note.height,
                            // High transparency to reveal background/reflections
                            background: `linear-gradient(to bottom, ${note.color} 0%, color-mix(in srgb, ${note.color}, black 20%) 100%)`,
                            opacity: 0.6,
                            boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.2)`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}