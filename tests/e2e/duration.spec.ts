import { test, expect } from '@playwright/test';

test.describe('Duration Component', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
        await page.goto('http://localhost:3000/piano_lessons');
    });

    test('displays duration correctly for initial song', async ({ page }) => {
        // Select the first song to enter lesson view
        await page.getByText('Gnossienne No. 1').click();

        const startTime = page.getByTestId('current-time');
        await expect(startTime).toBeVisible();
        await expect(startTime).toHaveText('0:00');

        const endTime = page.getByTestId('duration');
        await expect(endTime).toBeVisible();
        await expect(endTime).toHaveText(/^\d+:\d{2}$/);
    });

    test('updates current time when playing', async ({ page }) => {
        // Select the first song to enter lesson view
        await page.getByText('Gnossienne No. 1').click();

        const playButton = page.getByTestId('play-button');
        await playButton.click();

        // Wait for a few seconds
        await page.waitForTimeout(3000);

        const startTime = page.getByTestId('current-time');

        const timeText = await startTime.innerText();
        console.log('Current time after 3s:', timeText);
        expect(timeText).not.toBe('0:00');
        expect(timeText).toMatch(/^\d+:\d{2}$/);
    });
});
