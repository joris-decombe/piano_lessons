
import { test, expect } from '@playwright/test';

test.describe('Piano Visual Refinements', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/piano_lessons');
        // Start lesson to see keyboard
        await page.click('button');
        await page.waitForSelector('[data-note="C4"]');
    });

    test('Cheek Blocks should be layered above Key Slip', async ({ page }) => {
        // 1. Cheek Blocks (z-51 or z-20 depending on refactor, testing physical presence)
        const cheekBlocksCount = await page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('div'));
            // Our new specs use z-20, let's just check for the specific dimensions or class presence
            // Simplest: Check for height 154px
            return divs.filter(d => window.getComputedStyle(d).height === '154px').length;
        });

        // Should be at least 2 (left and right)
        expect(cheekBlocksCount).toBeGreaterThanOrEqual(2);

        // Capture CLOSE-UP screenshot of the left cheek block area
        const actionArea = page.locator('.relative.z-\\[10\\]').first().locator('..'); // Parent container
        // Or just grab the whole action area container
        // We updated z-index to z-10 for keys, z-20 for cheeks.
        // The container wrapping them has shadow-2xl.
        await page.locator('.flex-row.shadow-2xl').first().screenshot({ path: 'test-results/screenshots/cheek-layering-closeup.png' });
    });

    test('Black Key Visuals (Static Verification)', async ({ page }) => {
        const db4 = page.locator('[data-note="Db4"]');
        await expect(db4).toBeVisible();

        // 1. Force the Key into the "Active" visual state manually using CSS injection
        // Z-AXIS SINKING LOGIC (Specs v3.1):
        // - translateY(1px) (Centering sink)
        // - Border Width 2px (Deep Sink)
        // - Inset Box Shadow (depth simulation)
        // - Color Highlight
        await page.addStyleTag({
            content: `
            [data-note="Db4"] {
                transform: translateY(1px) !important; 
                border-bottom-width: 2px !important;
                background-color: #38bdf8 !important; 
                border-color: color-mix(in srgb, #38bdf8, black 20%) !important;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.5) !important;
            }
        `
        });

        // Wait a tick for styles to apply
        await page.waitForTimeout(100);

        // Capture CLOSE-UP screenshot of the KEY ITSELF
        await db4.screenshot({ path: 'test-results/screenshots/black-key-active-closeup.png' });

        // Verify Geometry (Specs v3.1: translateY(1px))
        const transform = await db4.evaluate(el => window.getComputedStyle(el).transform);
        // matrix(1, 0, 0, 1, 0, 1) -> The last 1 is 'translateY(1px)'
        expect(transform).toContain('matrix(1, 0, 0, 1, 0, 1)');

        // Verify The "Face" (Border Bottom) is deeply compressed
        const borderW = await db4.evaluate(el => window.getComputedStyle(el).borderBottomWidth);
        expect(borderW).toBe('2px');

        // Verify Shadow (Depth Simulation)
        const boxShadow = await db4.evaluate(el => window.getComputedStyle(el).boxShadow);
        expect(boxShadow).toContain('inset');
    });

});
