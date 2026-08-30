import { test, expect, type Page } from '@playwright/test';
import { getKeyPosition } from '../../src/components/piano/geometry';

/**
 * Both Satie scores shipped with the accompaniment chord coloured as the right
 * hand — the Gymnopédie because the engraver put it on the treble staff, the
 * Gnossienne because its MIDI split the chord across two tracks.
 *
 * What makes that visible is pitch, not screen position: the two hands overlap
 * in range (the Gymnopédie melody comes down to F#4, the exact top note of the
 * left-hand chord), so "the right hand is further right" is not true even when
 * the colours are correct. What *is* true is that neither melody ever reaches
 * down into the chord — so a floor on the right hand is the invariant, and it
 * holds for every frame of the piece.
 */

/** Reverse of the keyboard layout: the note block's `left` identifies its key. */
const PITCH_BY_X = new Map<number, number>();
for (let midi = 21; midi <= 108; midi++) {
    PITCH_BY_X.set(getKeyPosition(midi).left, midi);
}

const MIDDLE_C = 60;
const F4 = 65;

interface RenderedNote { color: string; midi: number }

async function sampleWhilePlaying(page: Page, forMs: number): Promise<RenderedNote[]> {
    const seen = new Map<string, RenderedNote>();
    const deadline = Date.now() + forMs;

    do {
        const frame = await page.evaluate(() =>
            [...document.querySelectorAll('.waterfall-note')].map((el) => ({
                color: (el as HTMLElement).style.getPropertyValue('--note-color'),
                x: parseFloat((el as HTMLElement).style.left),
            }))
        );
        for (const note of frame) {
            const midi = PITCH_BY_X.get(note.x);
            expect(midi, `no key at x=${note.x}`).toBeDefined();
            seen.set(`${note.color}:${midi}`, { color: note.color, midi: midi! });
        }
        await page.waitForTimeout(250);
    } while (Date.now() < deadline);

    return [...seen.values()];
}

const rightHand = (notes: RenderedNote[]) => notes.filter((n) => n.color.includes('note-right'));
const leftHand = (notes: RenderedNote[]) => notes.filter((n) => n.color.includes('note-left'));

async function openLesson(page: Page, songId: string) {
    await page.goto('');
    await page.getByTestId(`song-${songId}`).click();
    await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });
}

test.describe('Hand colours', () => {
    test('Gymnopédie starts with the left hand alone and never colours the chord right-handed', async ({ page }) => {
        await openLesson(page, 'gymnopedie_1');

        await page.getByTestId('play-button').click();

        // Bars 1-4 are bass plus accompaniment chord, with no melody yet — the
        // melody does not enter until bar 5, past the look-ahead window here.
        // The chord used to be right-handed, which put colour on screen.
        await expect.poll(() => page.locator('.waterfall-note').count()).toBeGreaterThan(0);
        const opening = await page.evaluate(() =>
            [...document.querySelectorAll('.waterfall-note')]
                .map((el) => (el as HTMLElement).style.getPropertyValue('--note-color'))
        );
        expect(opening.filter((c) => c.includes('note-right'))).toHaveLength(0);

        const notes = await sampleWhilePlaying(page, 14000);

        const right = rightHand(notes);
        const left = leftHand(notes);
        expect(right.length).toBeGreaterThan(0);
        expect(left.length).toBeGreaterThan(0);

        // The melody never dips below middle C. Before the fix the right hand
        // held the chord's A3 and B3.
        expect(Math.min(...right.map((n) => n.midi))).toBeGreaterThanOrEqual(MIDDLE_C);
        // And the left hand is the one carrying the bass.
        expect(Math.min(...left.map((n) => n.midi))).toBeLessThan(48);
    });

    test('Gnossienne keeps the whole accompaniment chord in the left hand', async ({ page }) => {
        await openLesson(page, 'gnossienne1');
        await page.getByTestId('play-button').click();
        const notes = await sampleWhilePlaying(page, 8000);

        const right = rightHand(notes);
        const left = leftHand(notes);
        expect(right.length).toBeGreaterThan(0);
        expect(left.length).toBeGreaterThan(0);

        // Ab3-C4-F4 is one chord and one hand. The old MIDI leaked C4 and F4
        // into the right hand; the melody itself never goes below F4.
        expect(Math.min(...right.map((n) => n.midi))).toBeGreaterThanOrEqual(F4);
        for (const chordTone of [56, 60, 65]) {
            expect(left.map((n) => n.midi)).toContain(chordTone);
        }
    });
});
