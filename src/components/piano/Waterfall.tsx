"use client";

import { useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { twMerge } from "tailwind-merge";
import { getKeyPosition, getRangeMetrics, FULL_RANGE, KeyRange } from "./geometry";
import { getColorByTrack, getHandIndexByTrack } from "@/lib/note-colors";
import { FingeringMap, fingeringKey } from "@/lib/fingering";
import { calculateVisibleNotes, proximityToAttr } from "@/lib/waterfall-logic";

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
    fingerings?: FingeringMap | null;
    showFingerings?: boolean;
    containerHeight: number; // New: Pixel height of the container
    /** Slice of the keyboard on screen; defaults to all 88 keys */
    range?: KeyRange;
}

export function Waterfall({ midi, currentTick, isPlaying = false, activeColors, lookAheadTicks = 0, showGrid = true, fingerings = null, showFingerings = false, containerHeight, range = FULL_RANGE }: WaterfallProps) {

    // Note positions stay in full-keyboard coordinates; the layer is simply
    // shifted so the slice on screen lines up with the keys below it.
    const metrics = getRangeMetrics(range);
    const totalWidth = metrics.width;

    const { allNotes, maxDuration } = useMemo(() => {
        if (!midi) return { allNotes: [], maxDuration: 0 };
        const notes: { ticks: number; durationTicks: number; midi: number; name: string; color: string; finger?: number; }[] = [];
        let maxDur = 0;
        const fingerLookup = showFingerings ? fingerings : null;

        const colors = activeColors ?? { 
            split: true, 
            left: "var(--color-note-left)", 
            right: "var(--color-note-right)", 
            unified: "var(--color-note-unified)" 
        };

        const handIndexByTrack = getHandIndexByTrack(midi.tracks);

        midi.tracks.forEach((track, trackIndex) => {
            if (track.notes.length === 0 || track.instrument.percussion) return;
            const noteColor = getColorByTrack(handIndexByTrack[trackIndex], colors);

            track.notes.forEach(note => {
                if (note.durationTicks > maxDur) maxDur = note.durationTicks;
                notes.push({
                    ticks: note.ticks,
                    durationTicks: note.durationTicks,
                    midi: note.midi,
                    name: note.name,
                    color: noteColor,
                    finger: fingerLookup?.[fingeringKey(track.name, note.ticks, note.midi)],
                });
            });
        });
        return { allNotes: notes.sort((a, b) => a.ticks - b.ticks), maxDuration: maxDur };
    }, [midi, activeColors, fingerings, showFingerings]);

    const visibleNotes = useMemo(() => {
        if (!midi || allNotes.length === 0) return [];

        const PPQ = midi.header.ppq;
        // Use lookAheadTicks if provided, otherwise default to 6 beats
        const windowSizeTicks = (lookAheadTicks && lookAheadTicks > 0) ? lookAheadTicks : 6 * PPQ;

        return calculateVisibleNotes(allNotes, {
            currentTick,
            windowSizeTicks,
            maxDuration,
            containerHeight,
        });
    }, [midi, currentTick, allNotes, maxDuration, lookAheadTicks, containerHeight]);

    return (
        <div
            className="absolute top-0 bottom-0 overflow-hidden pointer-events-none bg-background transition-colors duration-500"
            style={{ width: `${totalWidth}px`, left: 0 }}
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
                if (midiC < metrics.low || midiC > metrics.high) return null;
                const { left } = getKeyPosition(midiC);
                return (
                    <div
                        key={`guide-c-${i}`}
                        className="absolute top-0 bottom-0 w-[1px] pointer-events-none z-5"
                        style={{
                            left: `${left - metrics.offset}px`,
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
                        data-proximity={proximityToAttr(note.proximity)}
                        data-active={note.isActive ? "" : undefined}
                        style={{
                            left: `${note.left - metrics.offset}px`,
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
                        {note.finger !== undefined && (
                            <span className="waterfall-note-finger">{note.finger}</span>
                        )}
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
