
import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
    test('should allow starting a lesson, returning home, and starting again', async ({ page }) => {
        // 1. Load Landing Page
        // baseURL is already set to /piano_lessons.
        // using '' ensures we land exactly on the baseURL.
        await page.goto('');
        await expect(page.getByText('Piano Lessons')).toBeVisible({ timeout: 10000 });

        // 2. Start Lesson (First Song)
        await page.getByRole('button', { name: 'Gnossienne No. 1' }).click();

        // Verify Player is active
        await expect(page.getByTestId('keys-container')).toBeVisible(); // Keyboard
        await expect(page.getByTestId('play-button')).toBeVisible();

        // 3. Play audio briefly (optional, to test pause logic)
        await page.getByTestId('play-button').click();
        // Wait a bit
        await page.waitForTimeout(1000);

        // 4. Return to Home
        // The button has aria-label "Return to Song List"
        const backBtn = page.getByLabel('Return to Song List');
        await expect(backBtn).toBeVisible();
        await backBtn.click();

        // Verify back on landing page
        try {
            await expect(page.getByText('Select a piece to begin practicing')).toBeVisible({ timeout: 5000 });
            await expect(page.getByTestId('keys-container')).not.toBeVisible();
        } catch (e) {
            console.log('--- TEST FAILED --- taking screenshot');
            await page.screenshot({ path: 'test-failure.png' });
            throw e;
        }

        // 5. Start Lesson Again (Maybe different song?)
        await page.getByRole('button', { name: 'Twinkle Twinkle Little Star' }).click();

        // Verify Player is active again
        await expect(page.getByTestId('keys-container')).toBeVisible();
        await expect(page.getByTestId('current-song-title')).toHaveText('Twinkle Twinkle Little Star');
    });
});
