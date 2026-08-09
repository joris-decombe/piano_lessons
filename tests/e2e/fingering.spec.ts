import { test, expect } from '@playwright/test';

test.describe('Finger numbers', () => {
    test('renders fingerings for a score that has them, and hides the toggle for one that does not', async ({ page }) => {
        await page.goto('');

        // The Nocturne is the one bundled score with <fingering> markings.
        await page.getByTestId('song-nocturne_op9_no2').click();
        await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });

        await page.getByTestId('play-button').click();
        await expect(page.locator('.waterfall-note-finger').first()).toBeVisible({ timeout: 10000 });
        await page.getByTestId('play-button').click();

        // Digits are 1–5 and sit inside a note block.
        const digits = await page.locator('.waterfall-note-finger').allTextContents();
        expect(digits.length).toBeGreaterThan(0);
        for (const d of digits) {
            expect(['1', '2', '3', '4', '5']).toContain(d);
        }
        await expect(page.locator('.waterfall-note').filter({ hasText: digits[0] }).first()).toBeVisible();

        await page.getByRole('button', { name: /settings/i }).first().click();
        await expect(page.getByText('Finger Numbers')).toBeVisible();

        // Gymnopédie has no fingerings, so the setting is not offered.
        await page.goto('');
        await page.getByTestId('song-gymnopedie_1').click();
        await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });
        await page.getByRole('button', { name: /settings/i }).first().click();
        await expect(page.getByText('Show Grid')).toBeVisible();
        await expect(page.getByText('Finger Numbers')).toHaveCount(0);
    });
});
