/**
 * Pixel-art music glyphs.
 *
 * Every glyph is a 1-bit bitmap on a hand-sized grid, either written out row by
 * row or rasterised from lines and arcs with a 1px pen. Nothing here is
 * anti-aliased — the renderer blits these at an integer zoom, so one pixel in a
 * bitmap is one hard square on screen, which is the whole point.
 */

export interface Bitmap {
    w: number;
    h: number;
    /** Row-major, 1 = ink */
    data: Uint8Array;
}

/** A bitmap plus the point inside it that lands on the musical position */
export interface Glyph {
    bm: Bitmap;
    /** Anchor column — sits on the note's x position */
    ax: number;
    /** Anchor row — sits on the staff position */
    ay: number;
}

export function createBitmap(w: number, h: number): Bitmap {
    return { w, h, data: new Uint8Array(w * h) };
}

function plot(bm: Bitmap, x: number, y: number) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= bm.w || py >= bm.h) return;
    bm.data[py * bm.w + px] = 1;
}

/** Build a bitmap from rows of '#' (ink); every other character is empty */
export function fromRows(rows: string[]): Bitmap {
    const h = rows.length;
    const w = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const bm = createBitmap(w, h);
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            if (row[x] === '#') bm.data[y * w + x] = 1;
        }
    });
    return bm;
}

/** Bresenham, so diagonals stay one pixel thick */
function line(bm: Bitmap, x0: number, y0: number, x1: number, y1: number) {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
        plot(bm, x, y);
        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
    }
}

/**
 * Sampled elliptical arc. Angles are degrees in canvas space (y grows down),
 * so 0 is due right and 90 is straight down.
 */
function arc(bm: Bitmap, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) {
    const span = Math.abs(a1 - a0);
    const steps = Math.max(8, Math.ceil((span / 360) * 2 * Math.PI * Math.max(rx, ry) * 2));
    let px = 0;
    let py = 0;
    for (let i = 0; i <= steps; i++) {
        const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
        const x = cx + rx * Math.cos(a);
        const y = cy + ry * Math.sin(a);
        if (i > 0) line(bm, px, py, x, y);
        px = x;
        py = y;
    }
}

function fillRect(bm: Bitmap, x: number, y: number, w: number, h: number) {
    for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) plot(bm, xx, yy);
    }
}

/** Mirror top-to-bottom — a down-stem flag is an up-stem flag upside down */
function flipY(bm: Bitmap): Bitmap {
    const out = createBitmap(bm.w, bm.h);
    for (let y = 0; y < bm.h; y++) {
        for (let x = 0; x < bm.w; x++) {
            out.data[(bm.h - 1 - y) * bm.w + x] = bm.data[y * bm.w + x];
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// Clefs — rasterised from arcs, because a G clef needs curves nobody wants to
// type out by hand at this size.
// ---------------------------------------------------------------------------

function buildTrebleClef(): Glyph {
    const bm = createBitmap(13, 42);
    // Loop around the G line; the spine crosses it and the eye marks the line
    arc(bm, 5, 30, 5, 5, 0, 360);
    fillRect(bm, 4, 29, 2, 2);
    line(bm, 9, 5, 8, 35);
    // Hook over the top, terminating short on the left
    arc(bm, 6.5, 5, 3, 4, -10, -190);
    // The flank that swings out of the spine and widens into the loop
    arc(bm, 0, 10, 8, 16, 0, 90);
    // Tail below the staff
    line(bm, 8, 35, 7, 38);
    arc(bm, 4.5, 38, 2.5, 2.5, -20, 150);
    return { bm, ax: 5, ay: 30 };
}

function buildBassClef(): Glyph {
    // Solid comma — an outline this small turns to mush, a silhouette reads
    const bm = fromRows([
        '...####......',
        '..######.....',
        '..######..##.',
        '..#######....',
        '..######..##.',
        '...#####.....',
        '....#####....',
        '......####...',
        '.......####..',
        '.......###...',
        '......###....',
        '.....###.....',
        '....###......',
        '...###.......',
        '..###........',
        '.###.........',
        '###..........',
    ]);
    return { bm, ax: 0, ay: 3 };
}

// ---------------------------------------------------------------------------
// Hand-drawn glyphs
// ---------------------------------------------------------------------------

const NOTEHEAD_FILLED = fromRows([
    '.#####.',
    '#######',
    '#######',
    '#######',
    '.#####.',
]);

const NOTEHEAD_HOLLOW = fromRows([
    '.#####.',
    '##...##',
    '##...##',
    '##...##',
    '.#####.',
]);

const NOTEHEAD_WHOLE = fromRows([
    '.#######.',
    '##.....##',
    '##.....##',
    '##.....##',
    '.#######.',
]);

const SHARP = fromRows([
    '.#.#.',
    '.#.#.',
    '#####',
    '.#.#.',
    '.#.#.',
    '#####',
    '.#.#.',
    '.#.#.',
]);

const FLAT = fromRows([
    '#...',
    '#...',
    '#...',
    '#.#.',
    '##.#',
    '#..#',
    '#.##',
    '##..',
]);

const NATURAL = fromRows([
    '#..#',
    '#..#',
    '####',
    '#..#',
    '####',
    '#..#',
    '#..#',
]);

const FLAG_UP = fromRows([
    '#...',
    '##..',
    '#.#.',
    '#..#',
    '#..#',
    '#..#',
    '#.#.',
    '##..',
    '#...',
]);

const REST_QUARTER = fromRows([
    '.##.',
    '.##.',
    '##..',
    '##..',
    '.##.',
    '..##',
    '.###',
    '##.#',
    '#..#',
    '.###',
    '..##',
]);

const REST_EIGHTH = fromRows([
    '.###',
    '.###',
    '.##.',
    '#.#.',
    '..#.',
    '..#.',
    '.#..',
    '.#..',
]);

const REST_SIXTEENTH = fromRows([
    '.###',
    '.###',
    '##..',
    '.###',
    '.###',
    '##..',
    '.#..',
    '.#..',
    '#...',
]);

/** 3x5 digits — measure numbers, fingerings, and (doubled) time signatures */
const DIGIT_ROWS: string[][] = [
    ['###', '#.#', '#.#', '#.#', '###'],
    ['.#.', '##.', '.#.', '.#.', '###'],
    ['###', '..#', '###', '#..', '###'],
    ['###', '..#', '###', '..#', '###'],
    ['#.#', '#.#', '###', '..#', '..#'],
    ['###', '#..', '###', '..#', '###'],
    ['###', '#..', '###', '#.#', '###'],
    ['###', '..#', '..#', '..#', '..#'],
    ['###', '#.#', '###', '#.#', '###'],
    ['###', '#.#', '###', '..#', '###'],
];

/** Double every pixel — a 2x time-signature digit is still pixel art */
function scale2(bm: Bitmap): Bitmap {
    const out = createBitmap(bm.w * 2, bm.h * 2);
    for (let y = 0; y < bm.h; y++) {
        for (let x = 0; x < bm.w; x++) {
            if (!bm.data[y * bm.w + x]) continue;
            fillRect(out, x * 2, y * 2, 2, 2);
        }
    }
    return out;
}

export const DIGITS: Bitmap[] = DIGIT_ROWS.map(fromRows);
export const DIGITS_BIG: Bitmap[] = DIGITS.map(scale2);

export const GLYPHS = {
    trebleClef: buildTrebleClef(),
    bassClef: buildBassClef(),
    /** Heads anchor on their centre, so they straddle a line or fill a space */
    headFilled: { bm: NOTEHEAD_FILLED, ax: 3, ay: 2 } as Glyph,
    headHollow: { bm: NOTEHEAD_HOLLOW, ax: 3, ay: 2 } as Glyph,
    headWhole: { bm: NOTEHEAD_WHOLE, ax: 4, ay: 2 } as Glyph,
    sharp: { bm: SHARP, ax: 5, ay: 4 } as Glyph,
    flat: { bm: FLAT, ax: 4, ay: 5 } as Glyph,
    natural: { bm: NATURAL, ax: 4, ay: 3 } as Glyph,
    flagUp: { bm: FLAG_UP, ax: 0, ay: 0 } as Glyph,
    flagDown: { bm: flipY(FLAG_UP), ax: 0, ay: FLAG_UP.h - 1 } as Glyph,
    restQuarter: { bm: REST_QUARTER, ax: 2, ay: 5 } as Glyph,
    restEighth: { bm: REST_EIGHTH, ax: 2, ay: 4 } as Glyph,
    restSixteenth: { bm: REST_SIXTEENTH, ax: 2, ay: 4 } as Glyph,
} as const;

export type GlyphName = keyof typeof GLYPHS;
