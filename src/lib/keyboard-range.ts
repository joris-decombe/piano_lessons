/**
 * Choosing how much of the keyboard to show.
 *
 * The stage is drawn for all 88 keys at 24px per white key and then scaled to
 * fit the viewport, which is fine on a desktop and hopeless on a phone: 390px
 * of portrait leaves a white key 4px wide. Since a piece only ever uses part of
 * the keyboard — the bundled library spans 22 to 41 white keys, against 52 for
 * the full board — narrow screens show the slice the piece actually plays, and
 * everything else about the layout stays as it was.
 */

import { calculateKeyboardScale } from '@/lib/audio-logic';
import {
    FULL_RANGE,
    HIGHEST_KEY,
    KeyRange,
    LOWEST_KEY,
    getRangeMetrics,
    getTotalKeyboardWidth,
    snapRangeToWhiteKeys,
} from '@/components/piano/geometry';

/** Width of a white key in stage pixels */
const WHITE_KEY_WIDTH = 24;

/**
 * Below this on-screen width a white key stops reading as a key. Full-keyboard
 * layouts stay untouched above it, so desktops and tablets never change.
 */
const MIN_WHITE_KEY_PX = 16;

/** Breathing room either side of the stage, matching `BASE_PIANO_WIDTH` */
export const STAGE_PADDING = 48;

/** A couple of semitones of air, so the outermost notes aren't flush to the edge */
const RANGE_PADDING = 2;

/** Keyboard height in stage pixels, matching `--spacing-key-h` */
export const KEYBOARD_HEIGHT_PX = 150;

/**
 * Most of the screen a keyboard may take. A phone in landscape is barely 340px
 * tall; left to the width alone the keys would fill half of it and leave the
 * falling notes nowhere to fall.
 */
const MAX_KEYBOARD_FRACTION = 0.45;

export interface SourceNoteRange {
    tracks: { notes: { midi: number }[] }[];
}

/** The lowest and highest note a song actually plays, or null if it has none */
export function getSongRange(midi: SourceNoteRange | null): KeyRange | null {
    if (!midi) return null;
    let low = Infinity;
    let high = -Infinity;
    for (const track of midi.tracks) {
        for (const note of track.notes) {
            if (note.midi < low) low = note.midi;
            if (note.midi > high) high = note.midi;
        }
    }
    if (!isFinite(low) || !isFinite(high)) return null;
    return { low, high };
}

/** Scale the stage would run at, given its width and the space available */
export function stageScale(stageWidth: number, availableWidth: number): number {
    if (availableWidth <= 0 || stageWidth <= 0) return 1;
    return calculateKeyboardScale(availableWidth, stageWidth);
}

/**
 * How much of the keyboard to show: as much as fits at a legible size, centred
 * on what the piece plays.
 *
 * The piece's own range is the floor — a note is never off screen — but it is
 * only the floor. Twinkle uses about an octave, and cropping to exactly that
 * left a thirteen-key island adrift on a screen with room for the whole board,
 * which tells a beginner nothing about where their hands are. So the range
 * grows outwards from the piece until the keys would drop below a readable
 * width, or the whole keyboard is on screen.
 */
export function chooseKeyRange(song: KeyRange | null, availableWidth: number): KeyRange {
    if (availableWidth <= 0 || !song) return FULL_RANGE;

    const fullStageWidth = getTotalKeyboardWidth() + STAGE_PADDING;
    // The widest stage that still draws a white key at the readable minimum
    const budget = (availableWidth * WHITE_KEY_WIDTH) / MIN_WHITE_KEY_PX;
    if (budget >= fullStageWidth) return FULL_RANGE;

    let { low, high } = snapRangeToWhiteKeys({
        low: song.low - RANGE_PADDING,
        high: song.high + RANGE_PADDING,
    });
    const fits = (l: number, h: number) =>
        getRangeMetrics({ low: l, high: h }).width + STAGE_PADDING <= budget;

    // Grow a key at a time, alternating sides, so the piece stays centred
    for (let guard = 0; guard < 128; guard++) {
        let grew = false;
        if (low > LOWEST_KEY && fits(low - 1, high)) {
            low--;
            grew = true;
        }
        if (high < HIGHEST_KEY && fits(low, high + 1)) {
            high++;
            grew = true;
        }
        if (!grew) break;
    }
    return snapRangeToWhiteKeys({ low, high });
}

/** True when the view is showing less than the whole keyboard */
export function isCropped(range: KeyRange): boolean {
    return range.low > LOWEST_KEY || range.high < HIGHEST_KEY;
}

/** Everything the lesson layout needs to place a stage for a range */
export function getStageLayout(
    range: KeyRange,
    availableWidth: number,
    availableHeight = 0,
) {
    const metrics = getRangeMetrics(range);
    const stageWidth = metrics.width + STAGE_PADDING;
    const byWidth = stageScale(stageWidth, availableWidth);
    const byHeight = availableHeight > 0
        ? Math.min(1, (availableHeight * MAX_KEYBOARD_FRACTION) / KEYBOARD_HEIGHT_PX)
        : 1;
    return {
        ...metrics,
        stageWidth,
        scale: Math.min(byWidth, byHeight),
    };
}
