#!/usr/bin/env node
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const baseURL = 'http://localhost:3000/piano_lessons/';
const screenshotDir = path.join('.github', 'screenshots');

const THEMES = ['8bit', '16bit', 'hibit', 'cool', 'warm', 'mono'];

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function hideDevTools(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, #next-dev-toolbar, #__next-build-watcher { display: none !important; visibility: hidden !important; }
      div[data-nextjs-toast="true"] { display: none !important; }
      div[class*="Toast_toast"] { display: none !important; }
    `
  });
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('piano_lessons_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.waitForTimeout(400); // Wait for transition
}

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('📸 Taking screenshots for Piano Lessons...\n');

    // Take theme screenshots on landing page
    console.log('Taking theme screenshots on landing page...');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await hideDevTools(page);

    for (const theme of THEMES) {
      console.log(`  - ${theme} theme...`);
      await setTheme(page, theme);
      await page.screenshot({
        path: path.join(screenshotDir, `theme-${theme}.png`)
      });
    }

    // Player view with default theme (cool)
    console.log('\nTaking player screenshots...');
    await setTheme(page, 'cool');

    // Click on the first song card
    await page.click('text="Gnossienne No. 1"');
    await page.waitForSelector('footer');
    await page.waitForTimeout(3000);
    await hideDevTools(page);

    await page.screenshot({
      path: path.join(screenshotDir, 'player-idle.png')
    });

    // Play for a bit
    await page.click('[data-testid="play-button"]');
    await page.waitForTimeout(4000);
    await hideDevTools(page);

    await page.screenshot({
      path: path.join(screenshotDir, 'player-active.png')
    });

    console.log(`\n✅ Screenshots saved to ${screenshotDir}`);

  } catch (error) {
    console.error('❌ Error taking screenshots:', error);
    try {
      await page.screenshot({ path: 'error-screenshot.png' });
      console.log('Saved error-screenshot.png');
    } catch { }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
