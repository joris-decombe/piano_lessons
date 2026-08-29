import { test, expect } from '@playwright/test';

/**
 * Reproduces the iOS screen-lock failure in Chromium by forcing the
 * AudioContext to report Safari's non-standard 'interrupted' state, which no
 * desktop browser produces on its own.
 */
const STUB = () => {
    const w = window as unknown as { __interrupted: boolean; __resumeCalls: number };
    w.__interrupted = false;
    w.__resumeCalls = 0;

    // `state` and `resume` live on BaseAudioContext, not AudioContext.
    const proto = BaseAudioContext.prototype;
    const stateDescriptor = Object.getOwnPropertyDescriptor(proto, 'state')!;
    Object.defineProperty(proto, 'state', {
        configurable: true,
        get(this: BaseAudioContext) {
            if (w.__interrupted) return 'interrupted';
            return stateDescriptor.get!.call(this);
        },
    });

    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function (this: AudioContext) {
        w.__resumeCalls += 1;
        return resume.call(this);
    };
};

test.describe('Audio recovery after an iOS interruption', () => {
    test('play still works after the context is interrupted and restored', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.addInitScript(STUB);

        await page.goto('');
        await page.getByTestId('song-twinkle').click();
        await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });

        const playButton = page.getByTestId('play-button');
        await playButton.click();
        await expect(playButton).toHaveAttribute('aria-label', 'Pause');
        await expect.poll(() => page.getByTestId('current-time').innerText()).not.toBe('0:00');

        // The screen locks: Safari parks the context and freezes the transport.
        await page.evaluate(() => { (window as unknown as { __interrupted: boolean }).__interrupted = true; });
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

        // Coming back, the UI must agree that we are not playing — otherwise the
        // next tap pauses an already-frozen transport and looks like a dead button.
        await expect(playButton).toHaveAttribute('aria-label', 'Play');

        // Unlocking: the context comes back, and play works again.
        await page.evaluate(() => { (window as unknown as { __interrupted: boolean }).__interrupted = false; });
        const before = await page.getByTestId('current-time').innerText();
        await playButton.click();
        await expect(playButton).toHaveAttribute('aria-label', 'Pause');
        await expect.poll(() => page.getByTestId('current-time').innerText()).not.toBe(before);

        expect(errors).toEqual([]);
    });

    test('an interrupted context does not wedge the play button', async ({ page }) => {
        await page.addInitScript(STUB);
        // resume() that never settles — the iOS behaviour that used to hang the
        // await in togglePlay and make the button do nothing at all.
        await page.addInitScript(() => {
            AudioContext.prototype.resume = function () { return new Promise<void>(() => {}); };
        });

        await page.goto('');
        await page.getByTestId('song-twinkle').click();
        await expect(page.getByTestId('waterfall-container')).toBeVisible({ timeout: 20000 });
        await page.evaluate(() => { (window as unknown as { __interrupted: boolean }).__interrupted = true; });

        // Must still flip within the resume timeout rather than hanging forever.
        await page.getByTestId('play-button').click();
        await expect(page.getByTestId('play-button')).toHaveAttribute('aria-label', 'Pause', { timeout: 10000 });
    });
});
