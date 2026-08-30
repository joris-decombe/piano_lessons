"use client";

import { useEffect, useMemo, useRef } from "react";
import { Midi } from "@tonejs/midi";
import { PixelScoreRenderer, CONTENT_HEIGHT, ScoreColors } from "@/lib/score/pixel-score-renderer";
import { buildNotationScore } from "@/lib/score/notation";
import { FingeringMap } from "@/lib/fingering";

interface PixelScoreProps {
    midi: Midi | null;
    currentTick: number;
    /** Pixel size of the area the staves are drawn into */
    containerWidth: number;
    containerHeight: number;
    colors: ScoreColors;
    /** Shared with the waterfall: how far ahead the view reads */
    lookAheadTicks?: number;
    splitStrategy: 'tracks' | 'point';
    splitPoint: number;
    fingerings?: FingeringMap | null;
    showFingerings?: boolean;
    theme?: string;
}

/** Largest integer zoom the available height can hold */
function pixelZoom(height: number): number {
    if (height <= 0) return 1;
    return Math.max(1, Math.min(6, Math.floor(height / CONTENT_HEIGHT)));
}

export function PixelScore({
    midi,
    currentTick,
    containerWidth,
    containerHeight,
    colors,
    lookAheadTicks = 0,
    splitStrategy,
    splitPoint,
    fingerings = null,
    showFingerings = false,
    theme = "cool",
}: PixelScoreProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<PixelScoreRenderer | null>(null);

    const score = useMemo(() => {
        if (!midi) return null;
        return buildNotationScore(midi, { splitStrategy, splitPoint, fingerings });
    }, [midi, splitStrategy, splitPoint, fingerings]);

    const zoom = pixelZoom(containerHeight);
    const logicalWidth = Math.max(1, Math.ceil(containerWidth / zoom));
    const logicalHeight = Math.max(CONTENT_HEIGHT, Math.ceil(containerHeight / zoom));

    // 1. Own the renderer for the lifetime of the canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const renderer = new PixelScoreRenderer(canvas);
        rendererRef.current = renderer;
        renderer.start();
        return () => {
            renderer.destroy();
            rendererRef.current = null;
        };
    }, []);

    // 2. Push props across (the renderer reads them on its own frames)
    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer) return;
        renderer.score = score;
        renderer.currentTick = currentTick;
        renderer.colors = colors;
        renderer.lookAheadTicks = lookAheadTicks;
        renderer.showFingerings = showFingerings;
        renderer.theme = theme;
    }, [score, currentTick, colors, lookAheadTicks, showFingerings, theme]);

    // 3. A new theme, size or score invalidates the cached palette and the
    //    frame the renderer skips redundant redraws against
    useEffect(() => {
        rendererRef.current?.invalidate();
    }, [theme, logicalWidth, logicalHeight, score]);

    return (
        <canvas
            ref={canvasRef}
            width={logicalWidth}
            height={logicalHeight}
            data-testid="pixel-score"
            className="absolute top-0 left-0"
            style={{
                width: `${logicalWidth * zoom}px`,
                height: `${logicalHeight * zoom}px`,
                imageRendering: "pixelated",
            }}
        />
    );
}
