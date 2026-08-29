import { test, expect } from '@playwright/test';

/**
 * The Wake Lock API is driven by the OS in a real browser, so the sentinel is
 * stubbed here. What is under test is our side of the contract: when we ask,
 * and whether we ask again after iOS takes the lock away.
 */
const STUB = () => {
    const w = window as unknown as {
        __wakeLockRequests: number;
        __releaseWakeLock: () => void;
    };
    w.__wakeLockRequests = 0;
    let current: { dispatchEvent(e: Event): boolean } | null = null;

    w.__releaseWakeLock = () => {
        const sentinel = current;
        current = null;
        sentinel?.dispatchEvent(new Event('release'));
    };

    Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: {
            request: async () => {
                w.__wakeLockRequests += 1;
                const sentinel = new EventTarget() as EventTarget & {
                    released: boolean;
                    release(): Promise<void>;
                };
                sentinel.released = false;
                sentinel.release = async () => { sentinel.released = true; };
                current = sentinel;
                return sentinel;
            },
        },
    });
};

test.describe('Screen wake lock', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(STUB);
    });

    const requests = (page: import('@playwright/test').Page) =>
        page.evaluate(() => (window as unknown as { __wakeLockRequests: number }).__wakeLockRequests);

    // React StrictMode remounts effects in dev, so counts are compared as
    // deltas rather than absolutes.
    test('is held for the whole lesson, not only while playing', async ({ page }) => {
        await page.goto('');
        expect(await requests(page)).toBe(0);

        // Entering the lesson is enough — no need to press play.
        await page.getByTestId('song-twinkle').click();
        await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });
        await expect.poll(() => requests(page)).toBeGreaterThan(0);

        // Pausing must not drop it: practising means stopping to work a passage.
        const held = await requests(page);
        await page.getByTestId('play-button').click();
        await page.waitForTimeout(300);
        await page.getByTestId('play-button').click();
        await page.waitForTimeout(300);
        expect(await requests(page)).toBe(held);
    });

    test('re-acquires after the system takes the lock away', async ({ page }) => {
        await page.goto('');
        await page.getByTestId('song-twinkle').click();
        await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });
        await expect.poll(() => requests(page)).toBeGreaterThan(0);
        const held = await requests(page);

        // Nothing to do while the lock is still held.
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.waitForTimeout(200);
        expect(await requests(page)).toBe(held);

        // What iOS does on a screen lock: releases the sentinel behind our back.
        await page.evaluate(() => (window as unknown as { __releaseWakeLock: () => void }).__releaseWakeLock());
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await expect.poll(() => requests(page)).toBe(held + 1);
    });

    test('releases the lock on leaving the lesson', async ({ page }) => {
        await page.goto('');
        await page.getByTestId('song-twinkle').click();
        await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });
        await expect.poll(() => requests(page)).toBeGreaterThan(0);

        await page.getByLabel('Return to Song List').click();
        await expect(page.getByText('Select a piece to begin practicing')).toBeVisible();
        const held = await requests(page);

        // Back on the landing page nothing re-requests it.
        await page.evaluate(() => (window as unknown as { __releaseWakeLock: () => void }).__releaseWakeLock());
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.waitForTimeout(300);
        expect(await requests(page)).toBe(held);
    });
});
