"use client";

import { useRef, useEffect } from "react";
import { EffectsEngine, type EffectsNote } from "@/lib/effects-engine";
export type { EffectsNote } from "@/lib/effects-engine";
import { getTotalKeyboardWidth } from "./geometry";

interface EffectsCanvasProps {
    activeNotes: EffectsNote[];
    /** Height of the waterfall container in px */
    containerHeight: number;
    /** Current theme id for theme-specific effects */
    theme?: string;
    isPlaying?: boolean;
}

export function EffectsCanvas({
    activeNotes,
    containerHeight,
    theme = "cool",
    isPlaying = false,
}: EffectsCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<EffectsEngine | null>(null);

    // 1. Initialize engine on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new EffectsEngine(canvas);
        engineRef.current = engine;

        // Sync initial props before first frame to avoid degenerate gradients
        engine.impactY = containerHeight;
        engine.containerHeight = containerHeight;
        engine.theme = theme;
        engine.isPlaying = isPlaying;
        engine.activeNotes = activeNotes;

        engine.start();

        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, []);

    // 2. Sync React props to engine (Safe for React Compiler)
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;

        engine.impactY = containerHeight;
        engine.containerHeight = containerHeight;
        engine.theme = theme;
        engine.isPlaying = isPlaying;
        engine.activeNotes = activeNotes;
    }, [containerHeight, theme, isPlaying, activeNotes]);

    // 3. Trigger note-on effects
    useEffect(() => {
        const engine = engineRef.current;
        if (engine && isPlaying) {
            engine.emitForNewNotes(activeNotes);
        }
    }, [activeNotes, isPlaying]);

    // 4. Handle song/reset
    useEffect(() => {
        if (containerHeight === 0 && engineRef.current) {
            engineRef.current.reset();
        }
    }, [containerHeight]);

    const canvasW = getTotalKeyboardWidth();
    const canvasH = Math.round(containerHeight);

    return (
        <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
                width: `${canvasW}px`,
                height: `${canvasH}px`,
                imageRendering: "pixelated",
            }}
        />
    );
}
