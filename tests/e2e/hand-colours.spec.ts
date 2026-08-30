import { test, expect, type Page } from '@playwright/test';

/**
 * Both Satie scores shipped with the accompaniment chord coloured as the right
 * hand — the Gymnopédie because the engraver put it on the treble staff, the
 * Gnossienne because its MIDI split the chord across two tracks. Neither is
 * playable that way: the right hand also has the melody above it.
 *
 * These assertions are positional because that is what makes the bug visible.
 * The chord sits below the melody, so if any of it is coloured right-handed,
 * right-hand notes stop being strictly to the right of left-hand ones.
 */

interface RenderedNote { color: string; x: number }

async function notesOnScreen(page: Page): Promise<RenderedNote[]> {
    return page.evaluate(() =>
        [...document.querySelectorAll('.waterfall-note')].map((el) => ({
            color: (el as HTMLElement).style.getPropertyValue('--note-color'),
            x: parseFloat((el as HTMLElement).style.left),
        }))
    );
}

const leftHand = (notes: RenderedNote[]) => notes.filter((n) => n.color.includes('note-left'));
const rightHand = (notes: RenderedNote[]) => notes.filter((n) => n.color.includes('note-right'));

async function openAndPlay(page: Page, songId: string, forMs: number) {
    await page.goto('');
    await page.getByTestId(`song-${songId}`).click();
    await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('play-button').click();
    await page.waitForTimeout(forMs);
    await page.getByTestId('play-button').click(); // freeze the frame we assert on
}

test.describe('Hand colours', () => {
    test('Gymnopédie opens with the left hand alone, then the melody enters above it', async ({ page }) => {
        await openAndPlay(page, 'gymnopedie_1', 800);

        // Bars 1-4 are bass plus accompaniment chord — all left hand. The chord
        // used to be right-handed here, which is what made this look wrong.
        const opening = await notesOnScreen(page);
        expect(opening.length).toBeGreaterThan(0);
        expect(rightHand(opening)).toHaveLength(0);

        // By bar 5 the melody has entered, and it sits above everything the
        // left hand is playing.
        await page.getByTestId('play-button').click();
        await page.waitForTimeout(11000);
        await page.getByTestId('play-button').click();

        const later = await notesOnScreen(page);
        const left = leftHand(later);
        const right = rightHand(later);
        expect(left.length).toBeGreaterThan(0);
        expect(right.length).toBeGreaterThan(0);
        expect(Math.min(...right.map((n) => n.x))).toBeGreaterThan(Math.max(...left.map((n) => n.x)));
    });

    test('Gnossienne keeps the whole accompaniment chord below the melody', async ({ page }) => {
        await openAndPlay(page, 'gnossienne1', 800);

        const notes = await notesOnScreen(page);
        const left = leftHand(notes);
        const right = rightHand(notes);
        expect(left.length).toBeGreaterThan(0);
        expect(right.length).toBeGreaterThan(0);

        // The old MIDI put two of the chord's three notes in the right hand,
        // which placed right-hand notes well inside the left hand's range.
        expect(Math.min(...right.map((n) => n.x))).toBeGreaterThan(Math.max(...left.map((n) => n.x)));
        // The left hand carries bass plus chord, so it is the busier of the two.
        expect(left.length).toBeGreaterThan(right.length);
    });
});
