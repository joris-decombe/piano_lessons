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
    isPlaying?: boolean;
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

export function Waterfall({ midi, currentTick, isPlaying = false, activeColors, lookAheadTicks = 0, showGrid = true, containerHeight }: WaterfallProps) {

    const totalWidth = getTotalKeyboardWidth();

    const { allNotes, maxDuration } = useMemo(() => {
        if (!midi) return { allNotes: [], maxDuration: 0 };
        const notes: { ticks: number; durationTicks: number; midi: number; name: string; color: string; }[] = [];
        let maxDur = 0;

        const colors = activeColors ?? { 
            split: true, 
            left: "var(--color-note-left)", 
            right: "var(--color-note-right)", 
            unified: "var(--color-note-unified)" 
        };

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

        const active: { id: string; left: number; width: number; bottom: number; height: number; isBlack: boolean; color: string; proximity: number; isActive: boolean; }[] = [];

        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
                // Calculate pixel positions (Snapped to grid)
                const bottomPx = Math.round(((note.ticks - currentTick) / windowSizeTicks) * containerHeight);
                const heightPx = Math.round((note.durationTicks / windowSizeTicks) * containerHeight);

                const { left, width, isBlack } = getKeyPosition(note.midi);

                // Proximity: 0 = far from keyboard, 1 = at keyboard line
                // Based on how close the note's bottom edge is to y=0 (keyboard line)
                const proximity = containerHeight > 0
                    ? Math.max(0, Math.min(1, 1 - bottomPx / containerHeight))
                    : 0;

                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left,
                    width,
                    bottom: bottomPx,
                    height: heightPx,
                    isBlack,
                    color: note.color,
                    proximity,
                    isActive: bottomPx <= 0,
                });
            }
        }
        return active;
    }, [midi, currentTick, allNotes, maxDuration, lookAheadTicks, containerHeight]);

    return (
        <div
            className="absolute inset-0 overflow-hidden pointer-events-none bg-background transition-colors duration-500"
            style={{ width: `${totalWidth}px` }}
            data-playing={isPlaying}
        >
            {/* 1. LAYER 5: SKY/DEEP ATMOSPHERE (Static) */}
            <div className="waterfall-layer-sky" />

            {/* 2. LAYER 4: MACRO-SCALE BACKGROUND (Distant structures, 5% speed) */}
            <div 
                className="waterfall-layer-macro animate-scroll" 
                style={{ 
                    '--scroll-size': '128px',
                    '--scroll-duration': `calc(40s / var(--playback-rate, 1))`
                } as React.CSSProperties} 
            />

            {/* FOG SHEET 1 */}
            <div className="waterfall-fog-1" />

            {/* 3. LAYER 3: MID-GROUND SILHOUETTES (Pipes/Arches simulation, 20% speed) */}
            <div 
                className="waterfall-layer-mid animate-scroll" 
                style={{ 
                    '--scroll-size': '64px',
                    '--scroll-duration': `calc(10s / var(--playback-rate, 1))`
                } as React.CSSProperties} 
            />

            {/* FOG SHEET 2 */}
            <div className="waterfall-fog-2" />

            {/* 4. LAYER 2: THE ACTIVE GRID (Moves with music, 100% speed) */}
            <div 
                className="waterfall-grid-bg animate-scroll z-4" 
                style={{ 
                    '--scroll-size': '32px',
                    '--scroll-duration': `calc(4s / var(--playback-rate, 1))`
                } as React.CSSProperties}
            />

            {/* Octave Guidelines */}
            {showGrid && Array.from({ length: 9 }).map((_, i) => {
                const midiC = 24 + (i * 12);
                if (midiC > 108) return null;
                const { left } = getKeyPosition(midiC);
                return (
                    <div
                        key={`guide-c-${i}`}
                        className="absolute top-0 bottom-0 w-[1px] pointer-events-none z-5"
                        style={{ 
                            left: `${left}px`,
                            backgroundImage: 'linear-gradient(to bottom, var(--color-grid-line, var(--color-border)) 50%, transparent 50%)',
                            backgroundSize: '1px 8px',
                            opacity: 0.25
                        }}
                    />
                );
            })}

            {/* 5. LAYER 1: THE NOTE WATERFALL */}
            <div className="relative w-full h-full z-10">
                {visibleNotes.map(note => (
                    <div
                        key={note.id}
                        className={twMerge(
                            "waterfall-note absolute",
                            note.isBlack ? "z-20 waterfall-note--black" : "z-15",
                        )}
                        data-proximity={note.proximity > 0.85 ? "near" : note.proximity > 0.6 ? "mid" : undefined}
                        data-active={note.isActive ? "" : undefined}
                        style={{
                            left: `${note.left}px`,
                            width: `${note.width}px`,
                            bottom: `${note.bottom}px`,
                            height: `${note.height}px`,
                            '--note-color': note.color,
                            backgroundColor: note.color,
                        } as React.CSSProperties}
                    >
                        {/* Note Capitals for pixel art block feel */}
                        <div className="waterfall-note-cap waterfall-note-cap--top" />
                        <div className="waterfall-note-cap waterfall-note-cap--bottom" />
                    </div>
                ))}
            </div>

            {/* 6. LAYER 0: EXTREME FRONT SILHOUETTES (Foreground Occlusion, 150% speed) */}
            <div 
                className="waterfall-occlusion animate-scroll" 
                style={{ 
                    '--scroll-size': '100%',
                    '--scroll-duration': `calc(1.5s / var(--playback-rate, 1))`
                } as React.CSSProperties} 
            />
        </div>
    );
}
