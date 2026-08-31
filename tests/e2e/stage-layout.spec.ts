import { test, expect, Page } from '@playwright/test';

/**
 * Invariants of the lesson stage, checked at every size the app supports.
 *
 * The stage is a fixed-width layout scaled to fit, and the scale is now bounded
 * by the height as well as the width, which is where these went wrong: a scale
 * smaller than the width ratio left the stage banked against one edge with a
 * black band down the other. These assertions describe what "laid out
 * correctly" means, rather than one symptom of it going wrong.
 */

const SIZES = [
    { name: 'phone portrait', viewport: { width: 390, height: 664 } },
    { name: 'phone landscape', viewport: { width: 750, height: 342 } },
    { name: 'small phone landscape', viewport: { width: 667, height: 300 } },
    { name: 'large phone landscape', viewport: { width: 956, height: 440 } },
    { name: 'tablet landscape', viewport: { width: 1194, height: 790 } },
    { name: 'desktop', viewport: { width: 1280, height: 800 } },
    { name: 'short desktop', viewport: { width: 1440, height: 500 } },
];

interface Layout {
    viewportWidth: number;
    keys: { left: number; right: number } | null;
    waterfall: { left: number; right: number } | null;
    /** Anything painting outside the keyboard's columns */
    strays: string[];
    gapLeft: number;
    gapRight: number;
    pageOverflowX: number;
}

async function readLayout(page: Page): Promise<Layout> {
    return page.evaluate(() => {
        const edges = (el: Element | null) => {
            if (!el) return null;
            const box = el.getBoundingClientRect();
            return { left: Math.round(box.left), right: Math.round(box.right) };
        };
        const keysEl = document.querySelector('[data-testid="keys-container"]');
        const keys = edges(keysEl);
        return {
            viewportWidth: window.innerWidth,
            keys,
            // The waterfall's own painted surface, not its positioning wrapper
            waterfall: edges(
                document.querySelector('[data-testid="waterfall-container"] div[data-playing]'),
            ),
            // Every painted layer belongs in the keyboard's columns. The effects
            // canvas is deliberately wider than the stage — it keeps
            // full-keyboard coordinates and slides left — so without clipping it
            // hangs past the keys as a band down the side of the screen.
            strays: keys
                ? Array.from(
                    document.querySelectorAll(
                        '[data-testid="waterfall-container"] canvas,' +
                        '[data-testid="waterfall-container"] div[data-playing],' +
                        'canvas.absolute',
                    ),
                )
                    .map(el => ({ el, box: el.getBoundingClientRect() }))
                    .filter(({ box }) => box.width > 4 && box.height > 4)
                    .filter(({ box }) => box.left < keys.left - 1 || box.right > keys.right + 1)
                    .map(({ el, box }) =>
                        `${el.tagName}.${String(el.className).slice(0, 30)} ` +
                        `${Math.round(box.left)}..${Math.round(box.right)}`)
                : [],
            gapLeft: keys ? keys.left : -1,
            gapRight: keys ? Math.round(window.innerWidth - keys.right) : -1,
            pageOverflowX:
                document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
    });
}

async function openLesson(page: Page, song = 'Gnossienne No. 1') {
    await page.goto('');
    await page.getByRole('button', { name: song }).click();
    await expect(page.getByTestId('play-button')).toBeVisible();
    await expect(page.getByTestId('lesson-loading')).toBeHidden({ timeout: 30000 });
}

function assertWellLaidOut(layout: Layout, label: string) {
    expect(layout.keys, `${label}: keyboard is on screen`).not.toBeNull();
    const keys = layout.keys!;

    // Centred, at the width it actually occupies once scaled
    expect(
        Math.abs(layout.gapLeft - layout.gapRight),
        `${label}: stage is centred (gaps ${layout.gapLeft} / ${layout.gapRight})`,
    ).toBeLessThanOrEqual(2);

    // On screen and the right way round
    expect(keys.left, `${label}: keyboard starts on screen`).toBeGreaterThanOrEqual(-1);
    expect(keys.right, `${label}: keyboard ends on screen`).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(keys.right - keys.left, `${label}: keyboard has width`).toBeGreaterThan(0);

    // The falling notes must line up with the keys they fall onto — the whole
    // point of the shared stage coordinates
    expect(layout.waterfall, `${label}: waterfall is on screen`).not.toBeNull();
    const waterfall = layout.waterfall!;
    expect(
        Math.abs(waterfall.left - keys.left),
        `${label}: waterfall left edge matches the keyboard (${waterfall.left} vs ${keys.left})`,
    ).toBeLessThanOrEqual(1);
    expect(
        Math.abs(waterfall.right - keys.right),
        `${label}: waterfall right edge matches the keyboard (${waterfall.right} vs ${keys.right})`,
    ).toBeLessThanOrEqual(1);

    expect(
        layout.strays,
        `${label}: no layer paints outside the keys (${keys.left}..${keys.right})`,
    ).toEqual([]);

    expect(layout.pageOverflowX, `${label}: page does not scroll sideways`).toBeLessThanOrEqual(1);
}

test.describe('Stage layout', () => {
    for (const size of SIZES) {
        test(`is centred and aligned at ${size.name}`, async ({ page }) => {
            await page.setViewportSize(size.viewport);
            await openLesson(page);
            assertWellLaidOut(await readLayout(page), size.name);
        });
    }

    test('survives rotating back and forth', async ({ page }) => {
        await page.setViewportSize(SIZES[0].viewport);
        await openLesson(page);
        assertWellLaidOut(await readLayout(page), 'portrait');

        for (const [from, to] of [
            ['landscape', SIZES[1].viewport],
            ['portrait', SIZES[0].viewport],
            ['landscape again', SIZES[1].viewport],
        ] as const) {
            await page.setViewportSize(to);
            await page.waitForTimeout(600);
            assertWellLaidOut(await readLayout(page), `after rotating to ${from}`);
        }
    });

    test('keeps the sheet music inside the viewport too', async ({ page }) => {
        await page.setViewportSize(SIZES[1].viewport);
        await openLesson(page);
        await page.getByTestId('view-mode-button').click();
        await expect(page.getByTestId('pixel-score')).toBeVisible();

        const score = await page.evaluate(() => {
            const canvas = document.querySelector('[data-testid="pixel-score"]')!;
            const box = canvas.getBoundingClientRect();
            return {
                left: Math.round(box.left),
                right: Math.round(box.right),
                viewportWidth: window.innerWidth,
                overflowX:
                    document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
        });
        expect(score.left).toBeGreaterThanOrEqual(-1);
        expect(score.right).toBeLessThanOrEqual(score.viewportWidth + 1);
        expect(score.overflowX).toBeLessThanOrEqual(1);
    });
});
