import { getKeyPosition } from "@/components/piano/geometry";

/**
 * The pure part of the waterfall render pass, extracted so it can be tested and
 * benchmarked against the code that actually runs. It used to live inline in
 * Waterfall.tsx, with the tests keeping their own transcription of it — which
 * meant they passed whatever the component did.
 */

export interface SourceNote {
    ticks: number;
    durationTicks: number;
    midi: number;
    name: string;
    color: string;
    finger?: number;
}

export interface RenderNote {
    id: string;
    left: number;
    width: number;
    bottom: number;
    height: number;
    isBlack: boolean;
    color: string;
    proximity: number;
    isActive: boolean;
    finger?: number;
}

/** Below this pixel height a note block is too short to hold a legible digit. */
export const MIN_HEIGHT_FOR_FINGER = 16;

const PROXIMITY_NEAR = 0.85;
const PROXIMITY_MID = 0.6;

/**
 * Index of the first note that could still be on screen.
 *
 * Binary search finds the first note starting at or after `currentTick`, then we
 * walk back over notes that started earlier but are long enough to still be
 * sounding — a whole note held under the current position must keep rendering.
 */
export function findRenderStartIndex(
    allNotes: SourceNote[],
    currentTick: number,
    maxDuration: number
): number {
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
    return renderStartIdx;
}

/** How close a note's leading edge is to the keyboard: 0 = far, 1 = touching. */
export function computeProximity(bottomPx: number, containerHeight: number): number {
    if (containerHeight <= 0) return 0;
    return Math.max(0, Math.min(1, 1 - bottomPx / containerHeight));
}

/** The `data-proximity` attribute driving the glow tiers in CSS. */
export function proximityToAttr(proximity: number): "near" | "mid" | undefined {
    if (proximity > PROXIMITY_NEAR) return "near";
    if (proximity > PROXIMITY_MID) return "mid";
    return undefined;
}

/**
 * Every note that overlaps the visible window, positioned in pixels.
 * Notes are assumed sorted by `ticks`.
 */
export function calculateVisibleNotes(
    allNotes: SourceNote[],
    options: {
        currentTick: number;
        windowSizeTicks: number;
        maxDuration: number;
        containerHeight: number;
    }
): RenderNote[] {
    const { currentTick, windowSizeTicks, maxDuration, containerHeight } = options;
    if (allNotes.length === 0) return [];

    const endTime = currentTick + windowSizeTicks;
    const renderStartIdx = findRenderStartIndex(allNotes, currentTick, maxDuration);
    const active: RenderNote[] = [];

    for (let i = renderStartIdx; i < allNotes.length; i++) {
        const note = allNotes[i];
        if (note.ticks > endTime) break;
        if (note.ticks + note.durationTicks <= currentTick) continue;

        // Pixel positions, snapped to the grid.
        const bottomPx = Math.round(((note.ticks - currentTick) / windowSizeTicks) * containerHeight);
        const heightPx = Math.round((note.durationTicks / windowSizeTicks) * containerHeight);
        const { left, width, isBlack } = getKeyPosition(note.midi);

        active.push({
            id: `${note.name}-${note.ticks}-${i}`,
            left,
            width,
            bottom: bottomPx,
            height: heightPx,
            isBlack,
            color: note.color,
            proximity: computeProximity(bottomPx, containerHeight),
            isActive: bottomPx <= 0,
            finger: heightPx >= MIN_HEIGHT_FOR_FINGER ? note.finger : undefined,
        });
    }
    return active;
}
