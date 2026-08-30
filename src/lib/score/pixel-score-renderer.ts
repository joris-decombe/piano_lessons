/**
 * Imperative pixel-art score renderer.
 *
 * No React in here — the component owns a canvas and a props sync, this class
 * owns the rAF loop and every pixel, exactly like `EffectsEngine`. That is also
 * what keeps the React Compiler out of a hot drawing path (see CLAUDE.md).
 *
 * The canvas backing store is *small*: it is drawn at one logical pixel per
 * pixel and upscaled by an integer factor with `image-rendering: pixelated`, so
 * every line and glyph is a hard block. Nothing is anti-aliased.
 */

import { Bitmap, DIGITS, DIGITS_BIG, GLYPHS, Glyph } from './glyphs';
import { NotationChord, NotationScore, NoteValue, StaffId } from './notation';

// --- Layout, in logical pixels ---------------------------------------------

/** Distance between two staff lines */
const SPACE = 6;
const HALF = SPACE / 2;
const STAFF_H = SPACE * 4;
/** Gap between the treble bottom line and the bass top line */
const STAFF_GAP = 30;
// Generous margins: piano writing runs far outside the staves on ledger lines,
// and a bass note clipped by the canvas edge is worse than a smaller zoom.
const MARGIN_TOP = 44;
const MARGIN_BOTTOM = 44;
export const CONTENT_HEIGHT = MARGIN_TOP + STAFF_H + STAFF_GAP + STAFF_H + MARGIN_BOTTOM;

/** Fallback space for a quarter note, used when no look-ahead is supplied */
const PX_PER_QUARTER = 30;
/** Guard rails, so a very fast or very slow piece still reads */
const MIN_PX_PER_QUARTER = 18;
const MAX_PX_PER_QUARTER = 90;
/** Where the sounding moment sits, as a fraction of the music area */
const PLAYHEAD_FRACTION = 0.3;

const STEM_LENGTH = SPACE * 3.5;
/** A stem may be shortened to this under a sloping beam, but no further */
const MIN_STEM_LENGTH = SPACE * 1.5;
/** How far a beam may tilt across its group */
const MAX_BEAM_RISE = SPACE * 1.5;
const HEAD_HALF_WIDTH = 3;
const LEDGER_HALF_WIDTH = 6;

/** Bottom staff line: E4 on the treble, G2 on the bass */
const BOTTOM_STEP: Record<StaffId, number> = { 0: 30, 1: 18 };

/** Staff steps the key signature accidentals sit on, in signature order */
const SHARP_STEPS: Record<StaffId, number[]> = {
    0: [38, 35, 39, 36, 33, 37, 34],
    1: [24, 21, 25, 22, 19, 23, 20],
};
const FLAT_STEPS: Record<StaffId, number[]> = {
    0: [34, 37, 33, 36, 32, 35, 31],
    1: [20, 23, 19, 22, 18, 21, 17],
};

/** A chord with its frame geometry worked out */
interface PlacedChord {
    chord: NotationChord;
    baseX: number;
    ys: number[];
    lowestY: number;
    highestY: number;
}

interface BeamLayout {
    stemUp: boolean;
    /** Beam line, in tip-y at the first and last stem */
    y0: number;
    y1: number;
    members: PlacedChord[];
}

export interface ScoreColors {
    /** Right hand / treble */
    right: string;
    /** Left hand / bass */
    left: string;
    unified: string;
    split: boolean;
}

const FALLBACK_COLORS = {
    ink: '#cacad4',
    dim: '#5a5a6a',
    line: '#3a3a4a',
    accent: '#38bdf8',
    bright: '#eaeaf0',
    bg: '#060810',
    panel: '#0c1020',
};

type Palette = typeof FALLBACK_COLORS;

/** Read a CSS custom property off the document, with a fallback for tests */
function readVar(name: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

/** Resolve `var(--x)` wrappers the app passes around for note colours */
function resolveColor(color: string, fallback: string): string {
    const match = /^var\((--[\w-]+)\)$/.exec(color.trim());
    if (match) return readVar(match[1], fallback);
    return color || fallback;
}

/** Stem x for a member of a beamed group */
function beamStemX(layout: BeamLayout, member: PlacedChord): number {
    return layout.stemUp ? member.baseX + HEAD_HALF_WIDTH : member.baseX - HEAD_HALF_WIDTH;
}

/** The beam line's y at a given x */
function beamTipAt(layout: BeamLayout, x: number): number {
    const members = layout.members;
    const first = beamStemX(layout, members[0]);
    const last = beamStemX(layout, members[members.length - 1]);
    if (last === first) return layout.y0;
    const t = (x - first) / (last - first);
    return layout.y0 + (layout.y1 - layout.y0) * t;
}

export class PixelScoreRenderer {
    // --- Props, written by the React wrapper --------------------------------
    score: NotationScore | null = null;
    currentTick = 0;
    colors: ScoreColors = {
        right: 'var(--color-note-right)',
        left: 'var(--color-note-left)',
        unified: 'var(--color-note-unified)',
        split: true,
    };
    showFingerings = false;
    /**
     * Ticks visible ahead of the playhead. Shared with the waterfall, so the
     * "note preview time" setting scrolls both views at one reading speed and
     * doubles as this view's zoom.
     */
    lookAheadTicks = 0;
    /** Bumping this re-reads every CSS variable */
    theme = 'cool';

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private rafId: number | null = null;
    private glyphCache = new Map<string, HTMLCanvasElement>();
    private palette: Palette = { ...FALLBACK_COLORS };
    private paletteTheme = '';
    /** What the last frame was drawn from, so a paused score costs nothing */
    private lastFrame = '';
    private handColors = { right: FALLBACK_COLORS.accent, left: FALLBACK_COLORS.accent, unified: FALLBACK_COLORS.accent };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2D context unavailable');
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;
    }

    start() {
        if (this.rafId !== null) return;
        const loop = () => {
            this.draw();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    destroy() {
        if (this.rafId !== null) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this.glyphCache.clear();
    }

    /** Force a palette re-read — called on theme changes and after a resize */
    invalidate() {
        this.paletteTheme = '';
        this.lastFrame = '';
    }

    // --- Palette ------------------------------------------------------------

    private syncPalette() {
        const signature = `${this.theme}|${this.colors.right}|${this.colors.left}|${this.colors.unified}`;
        if (signature === this.paletteTheme) return;
        this.paletteTheme = signature;
        this.glyphCache.clear();
        this.palette = {
            ink: readVar('--color-text', FALLBACK_COLORS.ink),
            dim: readVar('--color-muted', FALLBACK_COLORS.dim),
            line: readVar('--color-border', FALLBACK_COLORS.line),
            accent: readVar('--color-accent-primary', FALLBACK_COLORS.accent),
            bright: readVar('--color-text-bright', FALLBACK_COLORS.bright),
            bg: readVar('--color-void', FALLBACK_COLORS.bg),
            panel: readVar('--color-bg', FALLBACK_COLORS.panel),
        };
        this.handColors = {
            right: resolveColor(this.colors.right, FALLBACK_COLORS.accent),
            left: resolveColor(this.colors.left, FALLBACK_COLORS.accent),
            unified: resolveColor(this.colors.unified, FALLBACK_COLORS.accent),
        };
    }

    private colorForStaff(staff: StaffId): string {
        if (!this.colors.split) return this.handColors.unified;
        return staff === 0 ? this.handColors.right : this.handColors.left;
    }

    // --- Bitmap blitting ----------------------------------------------------

    /** Bitmaps are cached per colour, so a frame is a few dozen drawImage calls */
    private tinted(id: string, bm: Bitmap, color: string): HTMLCanvasElement {
        const key = `${id}|${color}`;
        const cached = this.glyphCache.get(key);
        if (cached) return cached;

        const off = document.createElement('canvas');
        off.width = bm.w;
        off.height = bm.h;
        const octx = off.getContext('2d');
        if (octx) {
            octx.fillStyle = color;
            for (let y = 0; y < bm.h; y++) {
                let run = 0;
                for (let x = 0; x <= bm.w; x++) {
                    const on = x < bm.w && bm.data[y * bm.w + x] === 1;
                    if (on) {
                        run++;
                    } else if (run > 0) {
                        octx.fillRect(x - run, y, run, 1);
                        run = 0;
                    }
                }
            }
        }
        this.glyphCache.set(key, off);
        return off;
    }

    private blit(id: string, glyph: Glyph, x: number, y: number, color: string) {
        this.ctx.drawImage(this.tinted(id, glyph.bm, color), Math.round(x - glyph.ax), Math.round(y - glyph.ay));
    }

    private blitBitmap(id: string, bm: Bitmap, x: number, y: number, color: string) {
        this.ctx.drawImage(this.tinted(id, bm, color), Math.round(x), Math.round(y));
    }

    private digits(value: number, x: number, y: number, color: string, big = false) {
        const set = big ? DIGITS_BIG : DIGITS;
        const text = String(Math.max(0, Math.floor(value)));
        const width = big ? 8 : 4;
        let cursor = x;
        for (const character of text) {
            const digit = set[character.charCodeAt(0) - 48];
            if (digit) this.blitBitmap(`d${big ? 'B' : ''}${character}`, digit, cursor, y, color);
            cursor += width;
        }
    }

    private digitsWidth(value: number, big = false): number {
        return String(Math.max(0, Math.floor(value))).length * (big ? 8 : 4) - (big ? 2 : 1);
    }

    // --- Geometry -----------------------------------------------------------

    private staffTop(staff: StaffId, height: number): number {
        const top = Math.round((height - CONTENT_HEIGHT) / 2) + MARGIN_TOP;
        return staff === 0 ? top : top + STAFF_H + STAFF_GAP;
    }

    private stepY(step: number, staff: StaffId, height: number): number {
        const bottom = this.staffTop(staff, height) + STAFF_H;
        return bottom - (step - BOTTOM_STEP[staff]) * HALF;
    }

    /** Pixels per tick: the look-ahead window fills the space after the playhead */
    private pxPerTick(score: NotationScore, aheadPx: number): number {
        const raw = this.lookAheadTicks > 0 && aheadPx > 0
            ? aheadPx / this.lookAheadTicks
            : PX_PER_QUARTER / score.ppq;
        const perQuarter = raw * score.ppq;
        if (perQuarter < MIN_PX_PER_QUARTER) return MIN_PX_PER_QUARTER / score.ppq;
        if (perQuarter > MAX_PX_PER_QUARTER) return MAX_PX_PER_QUARTER / score.ppq;
        return raw;
    }

    private headerWidth(): number {
        const fifths = this.score?.fifths ?? 0;
        const accidentalWidth = Math.abs(fifths) * (fifths < 0 ? 4 : 5);
        return 5 + GLYPHS.trebleClef.bm.w + 2 + accidentalWidth + 3 + 8 + 4;
    }

    // --- Frame --------------------------------------------------------------

    private draw() {
        const { ctx, canvas } = this;
        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) return;

        // Nothing moves while the transport is paused, and the score is the
        // whole canvas — redrawing it 60 times a second would be pure heat.
        const frame = [
            this.currentTick, width, height, this.theme, this.showFingerings,
            this.lookAheadTicks, this.colors.split, this.score?.totalTicks ?? -1,
        ].join('|');
        if (frame === this.lastFrame) return;
        this.lastFrame = frame;

        this.syncPalette();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.palette.bg;
        ctx.fillRect(0, 0, width, height);

        const headerW = this.headerWidth();
        const playheadX = headerW + Math.round((width - headerW) * PLAYHEAD_FRACTION);

        this.drawStaffLines(width, height);

        const score = this.score;
        if (score) {
            const pxPerTick = this.pxPerTick(score, width - playheadX);
            const xOf = (tick: number) => playheadX + (tick - this.currentTick) * pxPerTick;
            const fromTick = this.currentTick - (playheadX - headerW) / pxPerTick;
            const toTick = this.currentTick + (width - playheadX) / pxPerTick;

            ctx.save();
            ctx.beginPath();
            ctx.rect(headerW, 0, width - headerW, height);
            ctx.clip();

            this.drawBarlines(score, xOf, fromTick, toTick, height);
            this.drawRests(score, xOf, fromTick, toTick, height);
            this.drawChords(score, xOf, fromTick, toTick, height);

            ctx.restore();
        }

        this.drawPlayhead(playheadX, height);
        this.drawHeader(headerW, height);
    }

    private drawStaffLines(width: number, height: number) {
        const { ctx } = this;
        ctx.fillStyle = this.palette.line;
        for (const staff of [0, 1] as StaffId[]) {
            const top = this.staffTop(staff, height);
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(0, top + i * SPACE, width, 1);
            }
        }
    }

    private drawBarlines(
        score: NotationScore,
        xOf: (tick: number) => number,
        fromTick: number,
        toTick: number,
        height: number,
    ) {
        const { ctx } = this;
        const trebleTop = this.staffTop(0, height);
        const bassBottom = this.staffTop(1, height) + STAFF_H;

        for (const measure of score.measures) {
            if (measure.endTicks < fromTick) continue;
            if (measure.startTicks > toTick) break;
            const x = Math.round(xOf(measure.startTicks));
            ctx.fillStyle = this.palette.dim;
            ctx.fillRect(x, trebleTop, 1, bassBottom - trebleTop + 1);
            // Bar number above the treble staff, every bar — this is a reading
            // aid, not an engraving, and looping by bar is the point.
            this.digits(measure.number, x + 2, trebleTop - 9, this.palette.dim);
        }

        // Final double bar
        const last = score.measures[score.measures.length - 1];
        if (last && last.endTicks >= fromTick && last.endTicks <= toTick) {
            const x = Math.round(xOf(score.totalTicks));
            ctx.fillStyle = this.palette.ink;
            ctx.fillRect(x, trebleTop, 1, bassBottom - trebleTop + 1);
            ctx.fillRect(x + 3, trebleTop, 2, bassBottom - trebleTop + 1);
        }
    }

    private restGlyph(value: NoteValue): Glyph | null {
        if (value.denom >= 16) return GLYPHS.restSixteenth;
        if (value.denom === 8) return GLYPHS.restEighth;
        if (value.denom === 4) return GLYPHS.restQuarter;
        return null; // Whole and half rests are bars hung off a staff line
    }

    private drawRests(
        score: NotationScore,
        xOf: (tick: number) => number,
        fromTick: number,
        toTick: number,
        height: number,
    ) {
        const { ctx } = this;
        for (const rest of score.rests) {
            if (rest.ticks + rest.durationTicks < fromTick) continue;
            if (rest.ticks > toTick) break;
            const x = Math.round(xOf(rest.ticks)) + 4;
            const top = this.staffTop(rest.staff, height);
            const past = rest.ticks + rest.durationTicks <= this.currentTick;
            ctx.globalAlpha = past ? 0.35 : 0.75;

            const glyph = this.restGlyph(rest.value);
            if (glyph) {
                const id = rest.value.denom >= 16 ? 'r16' : rest.value.denom === 8 ? 'r8' : 'r4';
                this.blit(id, glyph, x, top + SPACE * 2, this.palette.ink);
            } else {
                // Whole rest hangs under the second line, half rest sits on the third
                const y = rest.value.denom === 1 ? top + SPACE : top + SPACE * 2;
                ctx.fillStyle = this.palette.ink;
                ctx.fillRect(x - 3, rest.value.denom === 1 ? y : y - 2, 7, 2);
            }
            if (rest.value.dots) {
                ctx.fillStyle = this.palette.ink;
                ctx.fillRect(x + 5, top + SPACE * 2 - 1, 2, 2);
            }
            ctx.globalAlpha = 1;
        }
    }

    private headGlyph(value: NoteValue): { glyph: Glyph; id: string } {
        if (value.denom === 1) return { glyph: GLYPHS.headWhole, id: 'hW' };
        if (value.denom === 2) return { glyph: GLYPHS.headHollow, id: 'hH' };
        return { glyph: GLYPHS.headFilled, id: 'hF' };
    }

    /** Index of the first chord that could still be on screen */
    private firstVisibleChord(chords: NotationChord[], fromTick: number): number {
        let low = 0;
        let high = chords.length - 1;
        let found = chords.length;
        while (low <= high) {
            const mid = (low + high) >> 1;
            if (chords[mid].ticks >= fromTick) {
                found = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        // Walk back over notes that started earlier but are still sounding
        while (found > 0 && chords[found - 1].ticks + chords[found - 1].durationTicks > fromTick) {
            found--;
        }
        return found;
    }

    /** How many beams (or flags) a value carries */
    private beamLevel(denom: number): number {
        if (denom >= 32) return 3;
        if (denom >= 16) return 2;
        if (denom >= 8) return 1;
        return 0;
    }

    private drawChords(
        score: NotationScore,
        xOf: (tick: number) => number,
        fromTick: number,
        toTick: number,
        height: number,
    ) {
        const { ctx } = this;
        const start = this.firstVisibleChord(score.chords, fromTick);

        const placed: PlacedChord[] = [];
        for (let i = start; i < score.chords.length; i++) {
            const chord = score.chords[i];
            if (chord.ticks > toTick) break;
            const ys = chord.notes.map(note => this.stepY(note.step, chord.staff, height));
            placed.push({
                chord,
                baseX: Math.round(xOf(chord.ticks)) + 4 + chord.voice * 3,
                ys,
                lowestY: Math.max(...ys),
                highestY: Math.min(...ys),
            });
        }

        // A beam settles the stem direction and length for its whole group, so
        // lay the visible groups out before drawing any of their stems.
        const beamLayouts = new Map<number, BeamLayout>();
        for (const item of placed) {
            if (item.chord.beam < 0) continue;
            const existing = beamLayouts.get(item.chord.beam);
            if (existing) existing.members.push(item);
            else beamLayouts.set(item.chord.beam, { stemUp: true, y0: 0, y1: 0, members: [item] });
        }
        for (const layout of beamLayouts.values()) {
            this.layOutBeam(layout);
        }

        for (const item of placed) {
            const { chord, baseX, ys, lowestY, highestY } = item;
            const layout = chord.beam >= 0 ? beamLayouts.get(chord.beam) : undefined;
            const stemUp = layout ? layout.stemUp : chord.stemUp;
            const staffColor = this.colorForStaff(chord.staff);
            const sounding = chord.notes.some(
                note => note.noteTicks <= this.currentTick && note.noteEndTicks > this.currentTick,
            );
            const past = chord.ticks + chord.durationTicks <= this.currentTick;
            ctx.globalAlpha = past ? 0.4 : 1;
            const color = sounding ? this.palette.bright : staffColor;

            // Stem and flags, drawn before the heads so the heads sit on top
            if (chord.value.denom >= 2) {
                const stemX = stemUp ? baseX + HEAD_HALF_WIDTH : baseX - HEAD_HALF_WIDTH;
                const tipY = layout
                    ? beamTipAt(layout, stemX)
                    : stemUp ? highestY - STEM_LENGTH : lowestY + STEM_LENGTH;
                const fromY = stemUp ? lowestY : highestY;
                ctx.fillStyle = color;
                ctx.fillRect(stemX, Math.round(Math.min(fromY, tipY)), 1, Math.round(Math.abs(tipY - fromY)));

                // A beamed note's beams are drawn once, for the whole group
                const flags = layout ? 0 : this.beamLevel(chord.value.denom);
                for (let f = 0; f < flags; f++) {
                    const offset = f * 4 * (stemUp ? 1 : -1);
                    if (stemUp) this.blit('flU', GLYPHS.flagUp, stemX, tipY + offset, color);
                    else this.blit('flD', GLYPHS.flagDown, stemX, tipY + offset, color);
                }
            }

            for (let n = 0; n < chord.notes.length; n++) {
                const note = chord.notes[n];
                const y = ys[n];
                const shift = note.shifted ? (stemUp ? HEAD_HALF_WIDTH * 2 : -HEAD_HALF_WIDTH * 2) : 0;
                const x = baseX + shift;
                const noteSounding = note.noteTicks <= this.currentTick && note.noteEndTicks > this.currentTick;
                const noteColor = noteSounding ? this.palette.bright : staffColor;

                this.drawLedgers(note.step, chord.staff, x, height, noteColor);

                if (noteSounding) {
                    ctx.globalAlpha = past ? 0.4 : 0.28;
                    ctx.fillStyle = this.palette.accent;
                    ctx.fillRect(x - 5, y - 4, 11, 9);
                    ctx.globalAlpha = past ? 0.4 : 1;
                }

                const { glyph, id } = this.headGlyph(chord.value);
                this.blit(id, glyph, x, y, noteColor);

                if (note.accidental) {
                    const accGlyph =
                        note.accidental === 'sharp' ? GLYPHS.sharp
                            : note.accidental === 'flat' ? GLYPHS.flat
                                : GLYPHS.natural;
                    this.blit(note.accidental[0], accGlyph, x - HEAD_HALF_WIDTH - 2, y, noteColor);
                }

                if (chord.value.dots) {
                    ctx.fillStyle = noteColor;
                    // Dots never sit on a line; nudge up into the space above
                    const onLine = (note.step - BOTTOM_STEP[chord.staff]) % 2 === 0;
                    ctx.fillRect(x + HEAD_HALF_WIDTH + 2, y - (onLine ? HALF : 0) - 1, 2, 2);
                }

                if (this.showFingerings && note.finger !== undefined) {
                    // Beside its own head, not above the chord: a fingering
                    // parked at the stem tip belongs to no note in particular.
                    const fingerY = chord.staff === 0 ? y - 9 : y + 5;
                    this.digits(note.finger, x - 1, fingerY, this.palette.accent);
                }
            }

            if (chord.tiedToNext) {
                this.drawTie(
                    baseX + HEAD_HALF_WIDTH,
                    Math.round(xOf(chord.ticks + chord.durationTicks)) + 4 - HEAD_HALF_WIDTH,
                    stemUp ? lowestY + 4 : highestY - 4,
                    !stemUp,
                    color,
                );
            }

            ctx.globalAlpha = 1;
        }

        for (const layout of beamLayouts.values()) {
            this.drawBeam(layout);
        }
    }

    /**
     * Work out where a group's beam sits. A flat beam through notes an octave
     * apart draws a box, so the line follows the notes — tilted, capped, and
     * then pushed clear so no stem in the group ends up shorter than a minimum.
     */
    private layOutBeam(layout: BeamLayout) {
        const members = layout.members;
        const up = members.filter(m => m.chord.stemUp).length * 2 >= members.length;
        layout.stemUp = up;

        const ideal = members.map(m => (up ? m.highestY - STEM_LENGTH : m.lowestY + STEM_LENGTH));
        let y0 = ideal[0];
        let y1 = ideal[ideal.length - 1];

        const rise = y1 - y0;
        if (Math.abs(rise) > MAX_BEAM_RISE) {
            const middle = (y0 + y1) / 2;
            const half = (MAX_BEAM_RISE / 2) * Math.sign(rise);
            y0 = middle - half;
            y1 = middle + half;
        }

        // Shift the whole line until every stem clears the minimum
        let shift = 0;
        members.forEach((member, index) => {
            const t = members.length > 1 ? index / (members.length - 1) : 0;
            const lineY = y0 + (y1 - y0) * t;
            if (up) shift = Math.min(shift, member.highestY - MIN_STEM_LENGTH - lineY);
            else shift = Math.max(shift, member.lowestY + MIN_STEM_LENGTH - lineY);
        });
        layout.y0 = y0 + shift;
        layout.y1 = y1 + shift;
    }

    /** Beams for one group: a full bar, plus shorter bars for 16ths and faster */
    private drawBeam(layout: BeamLayout) {
        const { ctx } = this;
        const members = layout.members;
        if (members.length < 2) return;
        const past = members.every(
            m => m.chord.ticks + m.chord.durationTicks <= this.currentTick,
        );
        ctx.globalAlpha = past ? 0.4 : 1;
        ctx.fillStyle = this.colorForStaff(members[0].chord.staff);

        const maxLevel = Math.max(...members.map(m => this.beamLevel(m.chord.value.denom)));
        for (let level = 1; level <= maxLevel; level++) {
            const offset = layout.stemUp ? (level - 1) * 4 : -(level - 1) * 4 - 2;
            let runStart = -1;
            for (let i = 0; i <= members.length; i++) {
                const inRun = i < members.length && this.beamLevel(members[i].chord.value.denom) >= level;
                if (inRun && runStart === -1) runStart = i;
                if (!inRun && runStart !== -1) {
                    const first = beamStemX(layout, members[runStart]);
                    const last = beamStemX(layout, members[i - 1]);
                    // A lone note at this level gets a stub, not a full bar
                    const lone = i - 1 === runStart;
                    const x0 = lone && runStart > 0 ? last - 4 : first;
                    const x1 = lone && runStart === 0 ? first + 4 : last;
                    this.drawBeamBar(layout, Math.min(x0, x1), Math.max(x0, x1), offset);
                    runStart = -1;
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    /** One sloping bar, stair-stepped a column at a time so it stays pixel art */
    private drawBeamBar(layout: BeamLayout, x0: number, x1: number, offset: number) {
        for (let x = x0; x <= x1; x++) {
            this.ctx.fillRect(x, Math.round(beamTipAt(layout, x) + offset), 1, 2);
        }
    }

    private drawLedgers(step: number, staff: StaffId, x: number, height: number, color: string) {
        const { ctx } = this;
        const bottom = BOTTOM_STEP[staff];
        const top = bottom + 8;
        ctx.fillStyle = color;
        if (step < bottom - 1) {
            for (let s = bottom - 2; s >= step; s -= 2) {
                ctx.fillRect(x - LEDGER_HALF_WIDTH, this.stepY(s, staff, height), LEDGER_HALF_WIDTH * 2 + 1, 1);
            }
        } else if (step > top + 1) {
            for (let s = top + 2; s <= step; s += 2) {
                ctx.fillRect(x - LEDGER_HALF_WIDTH, this.stepY(s, staff, height), LEDGER_HALF_WIDTH * 2 + 1, 1);
            }
        }
    }

    /** A shallow parabola of single pixels — a tie that reads at this size */
    private drawTie(x1: number, x2: number, y: number, above: boolean, color: string) {
        const { ctx } = this;
        const span = x2 - x1;
        if (span <= 2) return;
        ctx.fillStyle = color;
        const rise = Math.min(4, Math.max(2, Math.round(span / 8)));
        for (let x = 0; x <= span; x++) {
            const t = (x / span) * 2 - 1;
            const dy = Math.round((1 - t * t) * rise);
            ctx.fillRect(x1 + x, y + (above ? -dy : dy), 1, 1);
        }
    }

    private drawPlayhead(x: number, height: number) {
        const { ctx } = this;
        const top = this.staffTop(0, height) - 12;
        const bottom = this.staffTop(1, height) + STAFF_H + 12;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = this.palette.accent;
        ctx.fillRect(x, top, 1, bottom - top);
        // Chunky arrow head, so the playhead reads as an object and not a seam
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(x - 3 + i, top - 4 + i, 7 - i * 2, 1);
        }
        ctx.globalAlpha = 1;
    }

    private drawHeader(headerW: number, height: number) {
        const { ctx } = this;
        const score = this.score;
        const trebleTop = this.staffTop(0, height);
        const bassTop = this.staffTop(1, height);
        const bassBottom = bassTop + STAFF_H;

        // Opaque, so the music scrolls away behind the clefs rather than
        // through them — but painted in the page's own black, not a slab.
        ctx.fillStyle = this.palette.bg;
        ctx.fillRect(0, 0, headerW, height);
        ctx.fillStyle = this.palette.line;
        ctx.fillRect(headerW, trebleTop - 10, 1, bassBottom - trebleTop + 21);

        // Staff lines continue through the header
        for (const staff of [0, 1] as StaffId[]) {
            const top = this.staffTop(staff, height);
            for (let i = 0; i < 5; i++) ctx.fillRect(0, top + i * SPACE, headerW, 1);
        }

        // Bracket joining the two staves
        ctx.fillStyle = this.palette.ink;
        ctx.fillRect(1, trebleTop, 2, bassBottom - trebleTop + 1);
        ctx.fillRect(1, trebleTop, 5, 2);
        ctx.fillRect(1, bassBottom - 1, 5, 2);

        let cursor = 5;
        this.blit('clefG', GLYPHS.trebleClef, cursor + GLYPHS.trebleClef.ax, this.stepY(32, 0, height), this.palette.ink);
        this.blit('clefF', GLYPHS.bassClef, cursor, this.stepY(24, 1, height), this.palette.ink);
        cursor += GLYPHS.trebleClef.bm.w + 2;

        const fifths = score?.fifths ?? 0;
        if (fifths !== 0) {
            const sharps = fifths > 0;
            const count = Math.abs(fifths);
            const width = sharps ? 5 : 4;
            for (const staff of [0, 1] as StaffId[]) {
                const steps = sharps ? SHARP_STEPS[staff] : FLAT_STEPS[staff];
                for (let i = 0; i < count && i < 7; i++) {
                    const y = this.stepY(steps[i], staff, height);
                    if (sharps) this.blit('s', GLYPHS.sharp, cursor + i * width + 2, y, this.palette.ink);
                    else this.blit('f', GLYPHS.flat, cursor + i * width + 2, y, this.palette.ink);
                }
            }
            cursor += count * width + 3;
        }

        const timeSignature = score?.measures[0]?.timeSignature ?? [4, 4];
        for (const staff of [0, 1] as StaffId[]) {
            const top = this.staffTop(staff, height);
            const numeratorX = cursor + Math.max(0, (8 - this.digitsWidth(timeSignature[0], true)) / 2);
            const denominatorX = cursor + Math.max(0, (8 - this.digitsWidth(timeSignature[1], true)) / 2);
            this.digits(timeSignature[0], numeratorX, top + 1, this.palette.ink, true);
            this.digits(timeSignature[1], denominatorX, top + SPACE * 2 + 1, this.palette.ink, true);
        }
    }
}
