import { test, expect, Page } from '@playwright/test';

/** iPhone 13, minus the Safari chrome Playwright's device profile accounts for */
const PORTRAIT = { width: 390, height: 664 };
const LANDSCAPE = { width: 750, height: 342 };

/** Width of the narrowest white key actually on screen */
async function narrowestWhiteKey(page: Page): Promise<number> {
    return page.evaluate(() => {
        const keys = document.querySelectorAll('[data-testid="keys-container"] [data-note]');
        let narrowest = Infinity;
        for (const key of keys) {
            const note = key.getAttribute('data-note') ?? '';
            if (note.includes('#') || note.includes('b')) continue;
            const width = key.getBoundingClientRect().width;
            if (width > 0) narrowest = Math.min(narrowest, width);
        }
        return narrowest === Infinity ? 0 : narrowest;
    });
}

async function openLesson(page: Page, song = 'Ode to Joy') {
    await page.goto('');
    await page.getByRole('button', { name: song }).click();
    await expect(page.getByTestId('play-button')).toBeVisible();
    await page.waitForTimeout(1200);
}

test.describe('Phone layout', () => {
    test.describe('portrait', () => {
        test.use({ viewport: PORTRAIT });

        test('plays a lesson without asking to be rotated', async ({ page }) => {
            await openLesson(page);

            // Nothing may cover the transport: the app used to wall off portrait
            // entirely, which made the whole lesson unreachable on a phone.
            await page.getByTestId('play-button').click();
            await expect(page.getByTestId('play-button')).toHaveAttribute('aria-label', 'Pause');

            await expect(page.getByTestId('keys-container')).toBeVisible();
            await expect(page.getByTestId('waterfall-container')).toBeVisible();
        });

        test('keeps the keys wide enough to read', async ({ page }) => {
            await openLesson(page);
            // The full 88 keys across 390px would be about 4px each. Cropping to
            // the range the piece plays is what buys this back.
            expect(await narrowestWhiteKey(page)).toBeGreaterThan(10);
        });

        test('shows only the slice of keyboard the piece needs', async ({ page }) => {
            await openLesson(page);
            const notes = await page.evaluate(() =>
                [...document.querySelectorAll('[data-testid="keys-container"] [data-note]')]
                    .map(k => k.getAttribute('data-note')));
            expect(notes.length).toBeGreaterThan(0);
            expect(notes.length).toBeLessThan(88);
            // Ode to Joy lives around the middle of the keyboard
            expect(notes).toContain('C4');
            expect(notes).not.toContain('A0');
        });

        test('fits the controls on screen', async ({ page }) => {
            await openLesson(page);
            const overflow = await page.evaluate(() => {
                const root = document.documentElement;
                const controls = document.querySelector('footer');
                return {
                    page: root.scrollWidth - root.clientWidth,
                    controls: controls
                        ? Math.round(controls.scrollWidth - controls.clientWidth)
                        : 0,
                };
            });
            expect(overflow.page).toBeLessThanOrEqual(1);
            expect(overflow.controls).toBeLessThanOrEqual(1);
        });

        test('draws the sheet music at a readable size', async ({ page }) => {
            await openLesson(page);
            await page.getByTestId('view-mode-button').click();
            const score = page.getByTestId('pixel-score');
            await expect(score).toBeVisible();

            // The staves must not be shrunk by the keyboard's stage transform:
            // one canvas pixel should still be at least two on screen.
            const zoom = await score.evaluate((canvas: HTMLCanvasElement) =>
                canvas.getBoundingClientRect().height / canvas.height);
            expect(zoom).toBeGreaterThanOrEqual(2);
        });
    });

    test.describe('landscape', () => {
        test.use({ viewport: LANDSCAPE });

        test('plays a lesson with room left for the notes to fall', async ({ page }) => {
            await openLesson(page);
            await expect(page.getByTestId('keys-container')).toBeVisible();

            const { keyboard, waterfall } = await page.evaluate(() => {
                const keys = document.querySelector('[data-testid="keys-container"]');
                const fall = document.querySelector('[data-testid="waterfall-container"]');
                return {
                    keyboard: keys ? keys.getBoundingClientRect().height : 0,
                    waterfall: fall ? fall.getBoundingClientRect().height : 0,
                };
            });
            // The keyboard may not swallow a short screen
            expect(keyboard).toBeGreaterThan(0);
            expect(waterfall).toBeGreaterThan(keyboard * 0.8);
        });

        test('keeps the keys wide enough to read', async ({ page }) => {
            await openLesson(page);
            expect(await narrowestWhiteKey(page)).toBeGreaterThan(10);
        });
    });
});
