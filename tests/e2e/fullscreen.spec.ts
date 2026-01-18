import { test, expect } from '@playwright/test';

test.describe('Fullscreen Button', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
        await page.goto('/piano_lessons');
    });

    test('displays fullscreen button after selecting a song', async ({ page }) => {
        // Select the first song to enter lesson view
        await page.getByText('Gnossienne No. 1').click();

        // Wait for the player to load
        await page.waitForTimeout(1000);

        // Check if fullscreen button is visible
        const fullscreenButton = page.getByTestId('fullscreen-button');
        await expect(fullscreenButton).toBeVisible();
    });

    test('fullscreen button has correct accessibility attributes', async ({ page }) => {
        // Select the first song to enter lesson view
        await page.getByText('Gnossienne No. 1').click();

        // Wait for the player to load
        await page.waitForTimeout(1000);

        const fullscreenButton = page.getByTestId('fullscreen-button');

        // Check aria-label exists
        const ariaLabel = await fullscreenButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/fullscreen/i);
    });

    test('fullscreen button is clickable', async ({ page }) => {
        // Select the first song to enter lesson view
        await page.getByText('Gnossienne No. 1').click();

        // Wait for the player to load
        await page.waitForTimeout(1000);

        const fullscreenButton = page.getByTestId('fullscreen-button');

        // Verify button is enabled and clickable
        await expect(fullscreenButton).toBeEnabled();

        // Click the button (note: actual fullscreen may not work in headless mode)
        await fullscreenButton.click();

        // Button should still be visible after click
        await expect(fullscreenButton).toBeVisible();
    });

    test('fullscreen button shows correct icon states', async ({ page }) => {
        // Select the first song to enter lesson view
        await page.getByText('Gnossienne No. 1').click();

        // Wait for the player to load
        await page.waitForTimeout(1000);

        const fullscreenButton = page.getByTestId('fullscreen-button');

        // Button should have an SVG icon
        const svg = fullscreenButton.locator('svg');
        await expect(svg).toBeVisible();

        // SVG should have path elements (the icon)
        const paths = svg.locator('path');
        await expect(paths.first()).toBeVisible();
    });
});
