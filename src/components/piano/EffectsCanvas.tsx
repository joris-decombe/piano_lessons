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
    /** Current theme id for theme-specific effects */
    theme?: string;
    isPlaying?: boolean;
}

/** Parse a CSS color string to extract RGB values for glow rendering. */
function parseColor(color: string): { r: number; g: number; b: number } | null {
    const hex = color.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
        const v = parseInt(hex[1], 16);
        return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
    }
    const rgb = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
        return { r: parseInt(rgb[1]), g: parseInt(rgb[2]), b: parseInt(rgb[3]) };
    }
    return null;
}

/** Shift a color's hue by a small amount for color cycling. */
function shiftHue(r: number, g: number, b: number, shift: number): { r: number; g: number; b: number } {
    // Convert to simple HSL-like rotation via channel mixing
    const cos = Math.cos(shift);
    const sin = Math.sin(shift);
    return {
        r: Math.round(Math.min(255, Math.max(0, r * (0.667 + cos * 0.333) + g * (0.333 - cos * 0.333 + sin * 0.577) + b * (0.333 - cos * 0.333 - sin * 0.577)))),
        g: Math.round(Math.min(255, Math.max(0, r * (0.333 - cos * 0.333 - sin * 0.577) + g * (0.667 + cos * 0.333) + b * (0.333 - cos * 0.333 + sin * 0.577)))),
        b: Math.round(Math.min(255, Math.max(0, r * (0.333 - cos * 0.333 + sin * 0.577) + g * (0.333 - cos * 0.333 - sin * 0.577) + b * (0.667 + cos * 0.333)))),
    };
}

interface ImpactFlash {
    midi: number;
    startTime: number;
    left: number;
    width: number;
}

interface PhosphorTrace {
    midi: number;
    color: string;
    startTime: number;
}

const PHOSPHOR_DURATION = 500; // ms
const PHOSPHOR_COLOR = { r: 34, g: 197, b: 94 }; // Green-500, matches mono accent

export function EffectsCanvas({
    activeNotes,
    containerHeight,
    theme = "cool",
    isPlaying = false,
}: EffectsCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bloomCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef(new ParticleSystem());
    const prevNotesRef = useRef<Set<string>>(new Set());
    const phosphorTracesRef = useRef<PhosphorTrace[]>([]);
    const impactFlashesRef = useRef<ImpactFlash[]>([]);
    const lastTimeRef = useRef(0);
    const rafRef = useRef(0);

    const totalKeyboardWidth = getTotalKeyboardWidth();
    const impactY = containerHeight;

    const isMono = theme === "mono";
    const isCool = theme === "cool";
    const is8Bit = theme === "8bit";
    const isHiBit = theme === "hibit";

    // Detect new note-on events and emit particles; track note-offs for phosphor
    const emitForNewNotes = useCallback((notes: EffectsNote[]) => {
        const currentKeys = new Set(notes.map(n => `${n.midi}`));
        const prevKeys = prevNotesRef.current;
        const now = performance.now();

        // Emit particles + impact flash for new note-ons
        for (const n of notes) {
            const key = `${n.midi}`;
            if (!prevKeys.has(key)) {
                const { left, width } = getKeyPosition(n.midi);
                const centerX = left + width / 2;

                // 1. Upward burst
                particlesRef.current.emit({
                    x: centerX,
                    y: impactY,
                    color: n.color,
                    count: 10,
                    speed: 80,
                    size: 2,
                    lifetime: 0.6,
                    type: 'burst'
                });

                // 2. Shockwave
                particlesRef.current.emit({
                    x: centerX,
                    y: impactY,
                    color: n.color,
                    count: 1,
                    speed: 0,
                    size: 4,
                    lifetime: 0.3,
                    type: 'shockwave'
                });

                // Add impact flash
                impactFlashesRef.current.push({
                    midi: n.midi,
                    startTime: now,
                    left,
                    width,
                });
            }
        }

        // Emit subtle downward debris for sustained notes (randomly)
        for (const n of notes) {
            if (Math.random() > 0.8) {
                const { left, width } = getKeyPosition(n.midi);
                const centerX = left + width / 2;
                particlesRef.current.emit({
                    x: centerX + (Math.random() - 0.5) * width,
                    y: impactY - 10,
                    color: n.color,
                    count: 1,
                    speed: 30,
                    spread: Math.PI / 4,
                    size: 1,
                    lifetime: 0.4,
                    type: 'debris'
                });
            }
        }

        // Prune expired impact flashes (2 frames ≈ ~33ms)
        impactFlashesRef.current = impactFlashesRef.current.filter(
            f => now - f.startTime < 50
        );

        // Track note-offs for phosphor persistence (Mono theme)
        if (isMono) {
            for (const prevKey of prevKeys) {
                if (!currentKeys.has(prevKey)) {
                    phosphorTracesRef.current.push({
                        midi: parseInt(prevKey),
                        color: "#22c55e",
                        startTime: now,
                    });
                }
            }
            // Prune expired traces
            phosphorTracesRef.current = phosphorTracesRef.current.filter(
                t => now - t.startTime < PHOSPHOR_DURATION
            );
        }

        prevNotesRef.current = currentKeys;
    }, [impactY, isMono]);

    // Draw additive glow with sustained note pulse
    const drawKeyGlow = useCallback((ctx: CanvasRenderingContext2D, notes: EffectsNote[], time: number) => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const pulse = 0.85 + 0.15 * Math.sin(time * 0.002 * Math.PI * 4);
        // Color cycling: slow hue rotation (~0.1 rad/s)
        const hueShift = time * 0.0001;

        for (const n of notes) {
            let parsed = parseColor(n.color);
            if (!parsed) continue;

            // Apply color cycling
            parsed = shiftHue(parsed.r, parsed.g, parsed.b, hueShift);

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

    // Draw short gradient trails above the impact line
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

    // Draw impact flash (bright rectangle at key position on note-on)
    const drawImpactFlash = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
        const flashes = impactFlashesRef.current;
        if (flashes.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const f of flashes) {
            const elapsed = now - f.startTime;
            if (elapsed >= 50) continue;

            // Fade from 0.5 alpha to 0 over ~2 frames
            const alpha = 0.5 * (1 - elapsed / 50);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(
                Math.round(f.left),
                Math.round(impactY - 6),
                f.width,
                6,
            );
        }

        ctx.restore();
    }, [impactY]);

    // Draw phosphor persistence afterglow (Mono theme only)
    const drawPhosphor = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
        const traces = phosphorTracesRef.current;
        if (traces.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const t of traces) {
            const elapsed = now - t.startTime;
            if (elapsed >= PHOSPHOR_DURATION) continue;

            const alpha = 0.3 * (1 - elapsed / PHOSPHOR_DURATION);
            const { left, width } = getKeyPosition(t.midi);
            const centerX = left + width / 2;
            const radius = 20;

            const grad = ctx.createRadialGradient(centerX, impactY, 0, centerX, impactY, radius);
            grad.addColorStop(0, `rgba(${PHOSPHOR_COLOR.r},${PHOSPHOR_COLOR.g},${PHOSPHOR_COLOR.b},${alpha})`);
            grad.addColorStop(1, `rgba(${PHOSPHOR_COLOR.r},${PHOSPHOR_COLOR.g},${PHOSPHOR_COLOR.b},0)`);

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

    // Draw upward light beams for active notes
    const drawLightBeams = useCallback((ctx: CanvasRenderingContext2D, notes: EffectsNote[]) => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { left, width } = getKeyPosition(n.midi);
            const beamHeight = 120;

            const grad = ctx.createLinearGradient(0, impactY - beamHeight, 0, impactY);
            grad.addColorStop(0, "rgba(255, 255, 255, 0)");
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b},0.15)`);

            ctx.fillStyle = grad;
            ctx.fillRect(Math.round(left + 1), Math.round(impactY - beamHeight), width - 2, beamHeight);
        }
        ctx.restore();
    }, [impactY]);

    // Draw a segmented impact rail (judgment line) that glows at active notes
    const drawImpactRail = useCallback((ctx: CanvasRenderingContext2D, notes: EffectsNote[]) => {
        ctx.save();
        const railHeight = 2;
        const y = impactY - railHeight; // Sit exactly on the bottom edge

        // 1. Base Rail (Glassy etched groove)
        // Brighter foundation for visibility on dark backgrounds
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; 
        ctx.fillRect(0, Math.round(y), totalKeyboardWidth, railHeight);
        
        // Top highlight line (sharp luminous edge)
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(0, Math.round(y), totalKeyboardWidth, 1);

        // 2. Active Segments (Intense glow only under active notes)
        ctx.globalCompositeOperation = "lighter";
        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { left, width } = getKeyPosition(n.midi);
            
            // Core hot segment (thicker and brighter)
            const grad = ctx.createLinearGradient(0, y, 0, y + railHeight);
            grad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b}, 1)`);
            grad.addColorStop(0.5, "rgba(255, 255, 255, 1)");
            grad.addColorStop(1, `rgba(${parsed.r},${parsed.g},${parsed.b}, 1)`);

            ctx.fillStyle = grad;
            ctx.fillRect(Math.round(left), Math.round(y), width, railHeight);

            // Subtle vertical bloom (spreads slightly above rail)
            const bloomGrad = ctx.createRadialGradient(
                left + width / 2, y + railHeight / 2, 0,
                left + width / 2, y + railHeight / 2, width
            );
            bloomGrad.addColorStop(0, `rgba(${parsed.r},${parsed.g},${parsed.b}, 0.5)`);
            bloomGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = bloomGrad;
            ctx.fillRect(Math.round(left - width/2), Math.round(y - 10), width * 2, 20);
        }
        ctx.restore();
    }, [impactY, totalKeyboardWidth]);

    // Main render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;

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

            // 1. Update and Draw core effects
            if (isPlaying) {
                particlesRef.current.update(dt);
            }
            particlesRef.current.draw(ctx);
            drawKeyGlow(ctx, activeNotes, time);
            drawNoteTrails(ctx, activeNotes);
            drawLightBeams(ctx, activeNotes);
            drawImpactRail(ctx, activeNotes);

            // 1.5. Impact flash
            drawImpactFlash(ctx, time);

            // 2. Phosphor persistence (Mono theme)
            if (isMono) {
                drawPhosphor(ctx, time);
            }

            // 3. Bloom pass - Disabled for 8bit
            if (!is8Bit && bloomCtx && activeNotes.length > 0) {
                bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
                bloomCtx.imageSmoothingEnabled = true;
                bloomCtx.drawImage(canvas, 0, 0, bloomCanvas.width, bloomCanvas.height);

                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.imageSmoothingEnabled = true;

                if (isCool) {
                    // Chromatic aberration: offset RGB channels by 1px
                    ctx.globalAlpha = 0.35;
                    ctx.drawImage(bloomCanvas, -1, 0, canvas.width, canvas.height); // Red-shifted left
                    ctx.drawImage(bloomCanvas, 1, 0, canvas.width, canvas.height);  // Blue-shifted right
                }

                // Normal bloom composite - HiBit gets stronger bloom
                ctx.globalAlpha = isHiBit ? 0.7 : 0.5;
                ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [activeNotes, drawKeyGlow, drawNoteTrails, drawImpactFlash, drawPhosphor, drawLightBeams, drawImpactRail, isMono, isCool, is8Bit, isHiBit, isPlaying]);

    // Emit particles on note changes
    useEffect(() => {
        if (isPlaying) {
            emitForNewNotes(activeNotes);
        }
    }, [activeNotes, emitForNewNotes, isPlaying]);

    // Reset on song change
    useEffect(() => {
        if (containerHeight === 0) {
            particlesRef.current.clear();
            prevNotesRef.current = new Set();
            phosphorTracesRef.current = [];
            impactFlashesRef.current = [];
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
