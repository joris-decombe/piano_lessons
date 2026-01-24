
import { test, expect } from '@playwright/test';

test.describe('White Key Concurrent Visuals', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/piano_lessons');
        await page.click('button');
        await page.waitForSelector('[data-test-id="keys-container"]', { state: 'attached', timeout: 5000 }).catch(() => { });
        // Fallback if test id attribute differs slightly or update lag
    });

    test('Concurrent White Keys (C4-D4) Separation', async ({ page }) => {
        // Capture the PARENT container using the robust data-testid added to Keyboard.tsx
        // The attribute in Keyboard.tsx was 'data-testid', Playwright's getByTestId uses 'data-testid' by default.
        const keyContainer = page.getByTestId('keys-container');

        // Ensure visibility
        await expect(keyContainer).toBeVisible();

        // Capture the container to show the full context
        await keyContainer.screenshot({ path: 'test-results/screenshots/white-keys-concurrent.png' });
    });

});
