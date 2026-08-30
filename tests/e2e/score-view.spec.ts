import { test, expect } from '@playwright/test';

test.describe('Sheet music view', () => {
    test('swaps the waterfall for the score and back', async ({ page }) => {
        await page.goto('');
        await page.getByRole('button', { name: 'Ode to Joy' }).click();
        await expect(page.getByTestId('play-button')).toBeVisible();

        // Starts on the waterfall
        await expect(page.getByTestId('waterfall-container')).toBeVisible();
        await expect(page.getByTestId('pixel-score')).toHaveCount(0);

        await page.getByTestId('view-mode-button').click();

        const score = page.getByTestId('pixel-score');
        await expect(score).toBeVisible();
        // The keyboard stays: the score replaces the falling notes, not the piano
        await expect(page.getByTestId('keys-container')).toBeVisible();

        await page.getByTestId('view-mode-button').click();
        await expect(page.getByTestId('pixel-score')).toHaveCount(0);
    });

    test('draws the staves and keeps drawing as the music plays', async ({ page }) => {
        await page.goto('');
        await page.getByRole('button', { name: 'Ode to Joy' }).click();
        await page.getByTestId('view-mode-button').click();

        const score = page.getByTestId('pixel-score');
        await expect(score).toBeVisible();

        // Something is actually on the canvas — a blank one would pass a
        // visibility check while rendering nothing at all.
        const inkedRows = await score.evaluate((canvas: HTMLCanvasElement) => {
            const ctx = canvas.getContext('2d')!;
            const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const rows = new Set<number>();
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (data[i] + data[i + 1] + data[i + 2] > 120) {
                        rows.add(y);
                        break;
                    }
                }
            }
            return rows.size;
        });
        // Ten staff lines at the very least
        expect(inkedRows).toBeGreaterThanOrEqual(10);

        const snapshot = () => score.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL().length);
        const before = await snapshot();
        await page.getByTestId('play-button').click();
        await page.waitForTimeout(1500);
        const after = await snapshot();
        expect(after).not.toBe(before);
    });

    test('remembers the chosen view for the next song', async ({ page }) => {
        await page.goto('');
        await page.getByRole('button', { name: 'Ode to Joy' }).click();
        await page.getByTestId('view-mode-button').click();
        await expect(page.getByTestId('pixel-score')).toBeVisible();

        await page.getByLabel('Return to Song List').click();
        await page.getByRole('button', { name: 'Minuet in G Major' }).click();
        await expect(page.getByTestId('pixel-score')).toBeVisible();
    });
});
