/**
 * Imperative effects engine for canvas rendering.
 * No React dependencies — this is a plain TypeScript class that owns
 * the rAF loop, particle system, bloom canvas, and all drawing routines.
 */

import { ParticleSystem } from "@/lib/particles";
import { getKeyPosition, getTotalKeyboardWidth } from "@/components/piano/geometry";
import { 
    GOD_RAY_WIDTH, 
    GOD_RAY_OPACITY_BASE, 
    GOD_RAY_OPACITY_VARY, 
    BLOOM_BURST_THRESHOLD 
} from "@/lib/vfx-constants";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EffectsNote {
    note: string;
    midi: number;
    color: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ImpactFlash {
    midi: number;
    startTime: number;
    left: number;
    width: number;
    color: string;
}

interface PhosphorTrace {
    midi: number;
    color: string;
    startTime: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHOSPHOR_DURATION = 500; // ms
const PHOSPHOR_COLOR = { r: 34, g: 197, b: 94 }; // Green-500

const IMPACT_FLASH_DURATION = 150; // ms

const DEBRIS_COOLDOWN = 250; // ms

const FRESH_NOTE_WINDOW = 300; // ms — beam boost duration after note-on
const NOTE_ACTIVATION_MAX_AGE = 1000; // ms — clean up old entries

const THEME_ACCENTS: Record<string, string> = {
    cool: "#38bdf8",
    warm: "#f59e0b",
    mono: "#22c55e",
    "8bit": "#e52521",
    "16bit": "#f08030",
    hibit: "#ff6188",
};

const THEME_ATMOSPHERE: Record<string, string> = {
    cool: "#6366f1", // Indigo
    warm: "#f59e0b", // Amber
    mono: "#22c55e", // Green
    "8bit": "#ff3232", // Red
    "16bit": "#f08030", // Orange
    hibit: "#ab9df2", // Lavender
};

const SCANLINE_THEMES = new Set(["8bit", "16bit", "mono"]);

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

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
function shiftHue(
    r: number,
    g: number,
    b: number,
    shift: number,
): { r: number; g: number; b: number } {
    const cos = Math.cos(shift);
    const sin = Math.sin(shift);
    return {
        r: Math.round(
            Math.min(
                255,
                Math.max(
                    0,
                    r * (0.667 + cos * 0.333) +
                        g * (0.333 - cos * 0.333 + sin * 0.577) +
                        b * (0.333 - cos * 0.333 - sin * 0.577),
                ),
            ),
        ),
        g: Math.round(
            Math.min(
                255,
                Math.max(
                    0,
                    r * (0.333 - cos * 0.333 - sin * 0.577) +
                        g * (0.667 + cos * 0.333) +
                        b * (0.333 - cos * 0.333 + sin * 0.577),
                ),
            ),
        ),
        b: Math.round(
            Math.min(
                255,
                Math.max(
                    0,
                    r * (0.333 - cos * 0.333 + sin * 0.577) +
                        g * (0.333 - cos * 0.333 - sin * 0.577) +
                        b * (0.667 + cos * 0.333),
                ),
            ),
        ),
    };
}

// ---------------------------------------------------------------------------
// EffectsEngine
// ---------------------------------------------------------------------------

export class EffectsEngine {
    // --- Public mutable properties (set by React wrapper) ---
    containerHeight = 0;
    impactY = 0;
    theme = "cool";
    isPlaying = false;
    activeNotes: EffectsNote[] = [];
    /** Optional ref from usePianoAudio — when > 0, particles and spores freeze. */
    hitstopRef: { current: number } | null = null;

    // --- Internal state ---
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private bloomCanvas: HTMLCanvasElement;
    private bloomCtx: CanvasRenderingContext2D | null;

    private particles: ParticleSystem;
    private prevNotes = new Set<string>();
    private phosphorTraces: PhosphorTrace[] = [];
    private impactFlashes: ImpactFlash[] = [];
    private lastTime = 0;
    private rafId = 0;
    private running = false;

    private lastDebrisTime = 0;

    /** Map from midi key string to the timestamp when that note was first activated. */
    private noteActivationTimes = new Map<string, number>();

    private totalKeyboardWidth: number;

    // Track bloom canvas dimensions so we only resize when needed
    private lastCanvasW = 0;
    private lastCanvasH = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2d context from canvas");
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;

        this.bloomCanvas = document.createElement("canvas");
        this.bloomCtx = this.bloomCanvas.getContext("2d");

        this.particles = new ParticleSystem();
        this.totalKeyboardWidth = getTotalKeyboardWidth();
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    /** Start the rAF render loop. */
    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTime = 0;
        this.rafId = requestAnimationFrame(this.loop);
    }

    /** Stop the rAF render loop (can be resumed with start). */
    stop(): void {
        if (!this.running) return;
        this.running = false;
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
    }

    /** Reset all transient state (particles, flashes, traces, prev notes). */
    reset(): void {
        this.particles.clear();
        this.prevNotes = new Set();
        this.phosphorTraces = [];
        this.impactFlashes = [];
        this.noteActivationTimes.clear();
        this.lastDebrisTime = 0;
        this.lastTime = 0;
    }

    /** Full teardown — stop loop, reset state, release references. */
    destroy(): void {
        this.stop();
        this.reset();
    }

    // ------------------------------------------------------------------
    // Public API called by React wrapper
    // ------------------------------------------------------------------

    /**
     * Detect new note-on events and emit particles / flashes.
     * The React wrapper should call this whenever activeNotes change.
     */
    emitForNewNotes(notes: EffectsNote[]): void {
        const currentKeys = new Set(notes.map((n) => `${n.midi}`));
        const prevKeys = this.prevNotes;
        const now = performance.now();

        // --- Emit particles + impact flash for new note-ons ---
        for (const n of notes) {
            const key = `${n.midi}`;
            if (!prevKeys.has(key)) {
                const { left, width } = getKeyPosition(n.midi);
                const centerX = left + width / 2;

                // 1. Upward burst (play plane)
                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 14,
                    speed: 100,
                    size: 3,
                    lifetime: 0.7,
                    type: "burst",
                    z: 1.0
                });

                // 2. Depth particles (random foreground sparks)
                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 4,
                    speed: 150,
                    size: 4,
                    lifetime: 0.8,
                    type: "burst",
                    z: 1.5 // Foreground
                });

                // 3. Primary shockwave
                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 1,
                    speed: 0,
                    size: 6,
                    lifetime: 0.35,
                    type: "shockwave",
                });

                // 4. Secondary shockwave (double shockwave enhancement)
                this.particles.emit({
                    x: centerX,
                    y: this.impactY,
                    color: n.color,
                    count: 1,
                    speed: 0,
                    size: 8,
                    lifetime: 0.5,
                    type: "shockwave",
                });

                // Add color-tinted impact flash
                this.impactFlashes.push({
                    midi: n.midi,
                    startTime: now,
                    left,
                    width,
                    color: n.color,
                });

                // Track activation time for fresh-note beam boost
                this.noteActivationTimes.set(key, now);
            }
        }

        // --- Debris for sustained notes (throttled by cooldown) ---
        if (this.isPlaying && now - this.lastDebrisTime >= DEBRIS_COOLDOWN) {
            for (const n of notes) {
                if (Math.random() > 0.8) {
                    const { left, width } = getKeyPosition(n.midi);
                    const centerX = left + width / 2;
                    this.particles.emit({
                        x: centerX + (Math.random() - 0.5) * width,
                        y: this.impactY - 10,
                        color: n.color,
                        count: 1,
                        speed: 35,
                        spread: Math.PI / 4,
                        size: 2,
                        lifetime: 0.5,
                        type: "debris",
                    });
                }
            }
            this.lastDebrisTime = now;
        }

        // --- Prune expired impact flashes ---
        this.impactFlashes = this.impactFlashes.filter(
            (f) => now - f.startTime < IMPACT_FLASH_DURATION,
        );

        // --- Phosphor persistence tracking (Mono theme) ---
        if (this.theme === "mono") {
            for (const prevKey of prevKeys) {
                if (!currentKeys.has(prevKey)) {
                    this.phosphorTraces.push({
                        midi: parseInt(prevKey),
                        color: "#22c55e",
                        startTime: now,
                    });
                }
            }
            this.phosphorTraces = this.phosphorTraces.filter(
                (t) => now - t.startTime < PHOSPHOR_DURATION,
            );
        }

        // --- Clean up old note activation entries ---
        for (const [key, activationTime] of this.noteActivationTimes) {
            if (now - activationTime > NOTE_ACTIVATION_MAX_AGE) {
                this.noteActivationTimes.delete(key);
            }
        }

        this.prevNotes = currentKeys;
    }

    // ------------------------------------------------------------------
    // rAF loop
    // ------------------------------------------------------------------

    private loop = (time: number): void => {
        if (!this.running) return;

        const dt = this.lastTime
            ? Math.min((time - this.lastTime) / 1000, 0.05)
            : 0.016;
        this.lastTime = time;

        const { canvas, ctx } = this;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Ensure bloom canvas matches main canvas
        this.syncBloomCanvas();

        // 1. Atmosphere & Background Effects
        this.drawGodRays(ctx, time);

        // 2. Update and draw core effects
        // During hitstop, freeze particles and spore emission to match the visual freeze
        const inHitstop = this.hitstopRef !== null && this.hitstopRef.current > 0;
        if (this.isPlaying && !inHitstop) {
            this.emitAmbientSpores();
            this.particles.update(dt);
        }
        this.particles.draw(ctx);
        this.drawKeyGlow(ctx, this.activeNotes, time);
        this.drawNoteTrails(ctx, this.activeNotes);
        this.drawLightBeams(ctx, this.activeNotes, time);
        this.drawImpactRail(ctx, this.activeNotes);

        // 2.5. Impact flash
        this.drawImpactFlash(ctx, time);

        // 3. Phosphor persistence (Mono theme)
        if (this.theme === "mono") {
            this.drawPhosphor(ctx, time);
        }

        // 4. Bloom pass — disabled for 8bit
        const is8Bit = this.theme === "8bit";
        if (!is8Bit && this.bloomCtx && (this.activeNotes.length > 0 || this.particles.activeBurstCount > BLOOM_BURST_THRESHOLD)) {
            this.applyBloom(ctx, canvas);
        }

        // 5. Scanlines (after bloom pass)
        if (SCANLINE_THEMES.has(this.theme)) {
            this.drawScanlines(ctx, canvas);
        }

        this.rafId = requestAnimationFrame(this.loop);
    };

    // ------------------------------------------------------------------
    // Bloom canvas management
    // ------------------------------------------------------------------

    private syncBloomCanvas(): void {
        const { canvas } = this;
        if (canvas.width !== this.lastCanvasW || canvas.height !== this.lastCanvasH) {
            const bloomScale = 0.25;
            this.bloomCanvas.width = Math.max(1, Math.round(canvas.width * bloomScale));
            this.bloomCanvas.height = Math.max(1, Math.round(canvas.height * bloomScale));
            this.lastCanvasW = canvas.width;
            this.lastCanvasH = canvas.height;
        }
    }

    private applyBloom(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        const bloomCtx = this.bloomCtx!;
        const bloomCanvas = this.bloomCanvas;

        bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.imageSmoothingEnabled = true;
        bloomCtx.drawImage(canvas, 0, 0, bloomCanvas.width, bloomCanvas.height);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.imageSmoothingEnabled = true;

        const isCool = this.theme === "cool";
        const isHiBit = this.theme === "hibit";

        if (isCool) {
            // Chromatic aberration: offset RGB channels by 1px
            ctx.globalAlpha = 0.35;
            ctx.drawImage(bloomCanvas, -1, 0, canvas.width, canvas.height); // Red-shifted left
            ctx.drawImage(bloomCanvas, 1, 0, canvas.width, canvas.height); // Blue-shifted right
        }

        // Normal bloom composite — HiBit gets stronger bloom
        ctx.globalAlpha = isHiBit ? 0.7 : 0.5;
        ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // Drawing routines
    // ------------------------------------------------------------------

    /** Volumetric light shafts (God Rays) Pierce through dust. */
    private drawGodRays(ctx: CanvasRenderingContext2D, time: number): void {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const atmosphereColor = THEME_ATMOSPHERE[this.theme] || THEME_ATMOSPHERE.cool;
        const parsed = parseColor(atmosphereColor)!;
        const shimmer = 0.5 + 0.5 * Math.sin(time * 0.001);
        
        // Render 3 distinct diagonal rays
        const rayWidth = GOD_RAY_WIDTH;
        const rays = [
            { x: this.totalKeyboardWidth * 0.2, angle: Math.PI * 0.2 },
            { x: this.totalKeyboardWidth * 0.5, angle: Math.PI * 0.15 },
            { x: this.totalKeyboardWidth * 0.8, angle: Math.PI * 0.25 }
        ];

        rays.forEach((ray, i) => {
            const opacity = (GOD_RAY_OPACITY_BASE + GOD_RAY_OPACITY_VARY * Math.sin(time * 0.0007 + i)) * shimmer;
            const grad = ctx.createLinearGradient(ray.x, 0, ray.x + Math.tan(ray.angle) * this.containerHeight, this.containerHeight);
            grad.addColorStop(0, `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0)`);
            grad.addColorStop(0.5, `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${opacity})`);
            grad.addColorStop(1, `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0)`);

            ctx.fillStyle = grad;
            
            ctx.beginPath();
            ctx.moveTo(ray.x - rayWidth/2, 0);
            ctx.lineTo(ray.x + rayWidth/2, 0);
            ctx.lineTo(ray.x + rayWidth/2 + Math.tan(ray.angle) * this.containerHeight, this.containerHeight);
            ctx.lineTo(ray.x - rayWidth/2 + Math.tan(ray.angle) * this.containerHeight, this.containerHeight);
            ctx.fill();
        });

        ctx.restore();
    }

    /** Emit ambient spores (Suspended Particulate Matter). */
    private emitAmbientSpores(): void {
        if (Math.random() > 0.90) { // Increased chance per frame to emit ambient spores
            const atmosphereColor = THEME_ATMOSPHERE[this.theme] || THEME_ATMOSPHERE.cool;
            const x = Math.random() * this.totalKeyboardWidth;
            const y = Math.random() * this.containerHeight;
            const z = Math.random() * 2; // Random depth tier

            this.particles.emit({
                x, y,
                color: atmosphereColor,
                count: 1,
                speed: 10,
                size: z > 1.2 ? 3 : 1,
                lifetime: 2 + Math.random() * 3,
                type: 'spore',
                z
            });
        }
    }

    /** Additive glow with sustained-note pulse and color cycling. */
    private drawKeyGlow(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
        time: number,
    ): void {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const pulse = 0.85 + 0.15 * Math.sin(time * 0.002 * Math.PI * 4);
        const hueShift = time * 0.0001;

        for (const n of notes) {
            let parsed = parseColor(n.color);
            if (!parsed) continue;

            parsed = shiftHue(parsed.r, parsed.g, parsed.b, hueShift);

            const { left, width } = getKeyPosition(n.midi);
            const centerX = left + width / 2;
            const radius = 24;

            const baseAlpha = 0.35 * pulse;
            const midAlpha = 0.12 * pulse;

            const grad = ctx.createRadialGradient(
                centerX,
                this.impactY,
                0,
                centerX,
                this.impactY,
                radius,
            );
            grad.addColorStop(
                0,
                `rgba(${parsed.r},${parsed.g},${parsed.b},${baseAlpha})`,
            );
            grad.addColorStop(
                0.5,
                `rgba(${parsed.r},${parsed.g},${parsed.b},${midAlpha})`,
            );
            grad.addColorStop(
                1,
                `rgba(${parsed.r},${parsed.g},${parsed.b},0)`,
            );

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(centerX - radius),
                Math.round(this.impactY - radius),
                Math.round(radius * 2),
                Math.round(radius * 2),
            );
        }

        ctx.restore();
    }

    /** Short gradient trails above the impact line. */
    private drawNoteTrails(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
    ): void {
        const trailHeight = 5;

        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { left, width } = getKeyPosition(n.midi);

            const grad = ctx.createLinearGradient(
                0,
                this.impactY - trailHeight,
                0,
                this.impactY,
            );
            grad.addColorStop(
                0,
                `rgba(${parsed.r},${parsed.g},${parsed.b},0)`,
            );
            grad.addColorStop(
                1,
                `rgba(${parsed.r},${parsed.g},${parsed.b},0.4)`,
            );

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(left),
                Math.round(this.impactY - trailHeight),
                width,
                trailHeight,
            );
        }
    }

    /**
     * Impact flash — bright rectangle at key position on note-on.
     * Extended to 150ms with quadratic ease-out. Color-tinted: 50% white + 50% note color.
     */
    private drawImpactFlash(ctx: CanvasRenderingContext2D, now: number): void {
        const flashes = this.impactFlashes;
        if (flashes.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const f of flashes) {
            const elapsed = now - f.startTime;
            if (elapsed >= IMPACT_FLASH_DURATION) continue;

            const progress = elapsed / IMPACT_FLASH_DURATION;
            // Quadratic ease-out: 0.6 * (1 - progress)^2
            const alpha = 0.6 * (1 - progress) * (1 - progress);

            // Color-tinted flash: blend 50% white + 50% note color
            const parsed = parseColor(f.color);
            const r = parsed ? Math.round((255 + parsed.r) / 2) : 255;
            const g = parsed ? Math.round((255 + parsed.g) / 2) : 255;
            const b = parsed ? Math.round((255 + parsed.b) / 2) : 255;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fillRect(
                Math.round(f.left),
                Math.round(this.impactY - 6),
                f.width,
                6,
            );
        }

        ctx.restore();
    }

    /** Phosphor persistence afterglow (Mono theme only). */
    private drawPhosphor(ctx: CanvasRenderingContext2D, now: number): void {
        const traces = this.phosphorTraces;
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

            const grad = ctx.createRadialGradient(
                centerX,
                this.impactY,
                0,
                centerX,
                this.impactY,
                radius,
            );
            grad.addColorStop(
                0,
                `rgba(${PHOSPHOR_COLOR.r},${PHOSPHOR_COLOR.g},${PHOSPHOR_COLOR.b},${alpha})`,
            );
            grad.addColorStop(
                1,
                `rgba(${PHOSPHOR_COLOR.r},${PHOSPHOR_COLOR.g},${PHOSPHOR_COLOR.b},0)`,
            );

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(centerX - radius),
                Math.round(this.impactY - radius),
                Math.round(radius * 2),
                Math.round(radius * 2),
            );
        }

        ctx.restore();
    }

    /**
     * Upward light beams for active notes.
     * Fresh notes (within 300ms of activation) get boosted beam height and alpha.
     */
    private drawLightBeams(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
        time: number,
    ): void {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { left, width } = getKeyPosition(n.midi);

            // Compute freshness factor (1.0 at note-on, fading to 0.0 over FRESH_NOTE_WINDOW)
            const key = `${n.midi}`;
            const activationTime = this.noteActivationTimes.get(key);
            let freshness = 0;
            if (activationTime !== undefined) {
                const elapsed = time - activationTime;
                if (elapsed < FRESH_NOTE_WINDOW) {
                    freshness = 1 - elapsed / FRESH_NOTE_WINDOW;
                }
            }

            const beamHeight = 120 + 60 * freshness;
            const beamAlpha = 0.15 + 0.25 * freshness;

            const grad = ctx.createLinearGradient(
                0,
                this.impactY - beamHeight,
                0,
                this.impactY,
            );
            grad.addColorStop(0, "rgba(255, 255, 255, 0)");
            grad.addColorStop(
                1,
                `rgba(${parsed.r},${parsed.g},${parsed.b},${beamAlpha})`,
            );

            ctx.fillStyle = grad;
            ctx.fillRect(
                Math.round(left + 1),
                Math.round(this.impactY - beamHeight),
                width - 2,
                beamHeight,
            );
        }
        ctx.restore();
    }

    /** Segmented impact rail (judgment line) that glows at active notes. */
    private drawImpactRail(
        ctx: CanvasRenderingContext2D,
        notes: EffectsNote[],
    ): void {
        ctx.save();
        const railHeight = 2;
        const y = this.impactY - railHeight; // Flush with the bottom edge

        const themeColor = THEME_ACCENTS[this.theme] || THEME_ACCENTS.cool;
        const parsedTheme = parseColor(themeColor)!;

        // 1. Base Rail (Glassy etched groove following theme color)
        ctx.fillStyle = `rgba(${parsedTheme.r}, ${parsedTheme.g}, ${parsedTheme.b}, 0.15)`;
        ctx.fillRect(0, Math.round(y), this.totalKeyboardWidth, railHeight);

        // Top highlight line (sharp luminous edge)
        ctx.fillStyle = `rgba(${parsedTheme.r}, ${parsedTheme.g}, ${parsedTheme.b}, 0.4)`;
        ctx.fillRect(0, Math.round(y), this.totalKeyboardWidth, 1);

        // 2. Active Segments (Intense glow only under active notes)
        ctx.globalCompositeOperation = "lighter";
        for (const n of notes) {
            const parsed = parseColor(n.color);
            if (!parsed) continue;

            const { left, width } = getKeyPosition(n.midi);

            // Core hot segment (thicker and brighter)
            const grad = ctx.createLinearGradient(0, y, 0, y + railHeight);
            grad.addColorStop(
                0,
                `rgba(${parsed.r},${parsed.g},${parsed.b}, 1)`,
            );
            grad.addColorStop(0.5, "rgba(255, 255, 255, 1)");
            grad.addColorStop(
                1,
                `rgba(${parsed.r},${parsed.g},${parsed.b}, 1)`,
            );

            ctx.fillStyle = grad;
            ctx.fillRect(Math.round(left), Math.round(y), width, railHeight);

            // Subtle vertical bloom (spreads slightly above rail)
            const bloomGrad = ctx.createRadialGradient(
                left + width / 2,
                y + railHeight / 2,
                0,
                left + width / 2,
                y + railHeight / 2,
                width,
            );
            bloomGrad.addColorStop(
                0,
                `rgba(${parsed.r},${parsed.g},${parsed.b}, 0.5)`,
            );
            bloomGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = bloomGrad;
            ctx.fillRect(
                Math.round(left - width / 2),
                Math.round(y - 10),
                width * 2,
                20,
            );
        }
        ctx.restore();
    }

    /** Draw horizontal scanlines for retro themes (after bloom pass). */
    private drawScanlines(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
    ): void {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        for (let y = 0; y < canvas.height; y += 2) {
            ctx.fillRect(0, y, canvas.width, 1);
        }
        ctx.restore();
    }
}
