"use client";

import { useRef, useEffect, useCallback } from "react";
import { ParticleSystem } from "@/lib/particles";
import { getKeyPosition, getTotalKeyboardWidth } from "./geometry";

export interface EffectsNote {
    note: string;
    midi: number;
    color: string;
}

interface EffectsCanvasProps {
    activeNotes: EffectsNote[];
    /** Height of the waterfall container in px */
    containerHeight: number;
}

/** Parse a CSS color string to extract RGB values for glow rendering. */
function parseColor(color: string): { r: number; g: number; b: number } | null {
    // Handle hex
    const hex = color.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
        const v = parseInt(hex[1], 16);
        return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
    }
    // Handle rgb()/rgba()
    const rgb = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
        return { r: parseInt(rgb[1]), g: parseInt(rgb[2]), b: parseInt(rgb[3]) };
    }
    return null;
}

export function EffectsCanvas({
    activeNotes,
    containerHeight,
}: EffectsCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bloomCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef(new ParticleSystem());
    const prevNotesRef = useRef<Set<string>>(new Set());
    const lastTimeRef = useRef(0);
    const rafRef = useRef(0);

    const totalKeyboardWidth = getTotalKeyboardWidth();

    // Impact line = bottom of canvas (top of keyboard)
    const impactY = containerHeight;

    // Detect new note-on events and emit particles
    const emitForNewNotes = useCallback((notes: EffectsNote[]) => {
        const currentKeys = new Set(notes.map(n => `${n.midi}`));
        const prevKeys = prevNotesRef.current;

        for (const n of notes) {
            const key = `${n.midi}`;
            if (!prevKeys.has(key)) {
                const { left, width } = getKeyPosition(n.midi);
                const centerX = left + width / 2;

                particlesRef.current.emit({
                    x: centerX,
                    y: impactY,
                    color: n.color,
                    count: 6,
                    speed: 50,
                    size: 2,
                    lifetime: 0.4,
                });
            }
        }

        prevNotesRef.current = currentKeys;
    }, [impactY]);

    // Draw additive glow at the impact line for each active key
    // Sustained notes pulse via a ~2Hz sine wave on intensity
    const drawKeyGlow = useCallback((ctx: CanvasRenderingContext2D, notes: EffectsNote[], time: number) => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Pulse factor: oscillates 0.7..1.0 at ~2Hz
        const pulse = 0.85 + 0.15 * Math.sin(time * 0.002 * Math.PI * 4);

        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { left, width } = getKeyPosition(n.midi);
            const centerX = left + width / 2;
            const radius = 24;

            const baseAlpha = 0.35 * pulse;
            const midAlpha = 0.12 * pulse;

            const grad = ctx.createRadialGradient(centerX, impactY, 0, centerX, impactY, radius);
            grad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b},${baseAlpha})`);
            grad.addColorStop(0.5, `rgba(${parsed.r},${parsed.g},${parsed.b},${midAlpha})`);
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b},0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(centerX - radius),
                Math.round(impactY - radius),
                Math.round(radius * 2),
                Math.round(radius * 2),
            );
        }

        ctx.restore();
    }, [impactY]);

    // Draw short gradient trails above the impact line for active notes
    const drawNoteTrails = useCallback((ctx: CanvasRenderingContext2D, notes: EffectsNote[]) => {
        const trailHeight = 5;

        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { left, width } = getKeyPosition(n.midi);

            const grad = ctx.createLinearGradient(0, impactY - trailHeight, 0, impactY);
            grad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b},0)`);
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b},0.4)`);

            ctx.fillStyle = grad;
            ctx.fillRect(Math.round(left), Math.round(impactY - trailHeight), width, trailHeight);
        }
    }, [impactY]);

    // Main render loop — independent of React re-renders
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;

        // Create offscreen bloom canvas at quarter resolution
        if (!bloomCanvasRef.current) {
            bloomCanvasRef.current = document.createElement("canvas");
        }
        const bloomCanvas = bloomCanvasRef.current;
        const bloomScale = 0.25;
        bloomCanvas.width = Math.max(1, Math.round(canvas.width * bloomScale));
        bloomCanvas.height = Math.max(1, Math.round(canvas.height * bloomScale));
        const bloomCtx = bloomCanvas.getContext("2d");

        const loop = (time: number) => {
            const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.05) : 0.016;
            lastTimeRef.current = time;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. Draw effects (particles, glow, trails)
            particlesRef.current.update(dt);
            particlesRef.current.draw(ctx);
            drawKeyGlow(ctx, activeNotes, time);
            drawNoteTrails(ctx, activeNotes);

            // 2. Bloom pass: downscale → natural blur → composite back
            if (bloomCtx && activeNotes.length > 0) {
                bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
                // Downscale: bilinear filtering acts as blur
                bloomCtx.imageSmoothingEnabled = true;
                bloomCtx.drawImage(canvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
                // Composite bloom back at full size with additive blending
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = 0.5;
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [activeNotes, drawKeyGlow, drawNoteTrails]);

    // Emit particles on note changes
    useEffect(() => {
        emitForNewNotes(activeNotes);
    }, [activeNotes, emitForNewNotes]);

    // Reset particles when song changes
    useEffect(() => {
        if (containerHeight === 0) {
            particlesRef.current.clear();
            prevNotesRef.current = new Set();
        }
    }, [containerHeight]);

    const canvasW = totalKeyboardWidth;
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
