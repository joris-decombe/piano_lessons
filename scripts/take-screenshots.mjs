#!/usr/bin/env node
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const baseURL = 'http://localhost:3000/';
const screenshotDir = path.join('.github', 'screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('📸 Taking screenshots for Piano Lessons...\n');

    // 1. Landing Page
    console.log('1/3 Landing page...');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(screenshotDir, '01-landing.png'),
      fullPage: true
    });

    // 2. Player View (Idle)
    console.log('2/3 Player view (Idle)...');
    // Click on the first song card
    await page.click('text="Gnossienne No. 1"');
    
    // Wait for the player to load (look for the keyboard or canvas)
    // The keyboard container has a class that likely contains "Keyboard" or just look for the footer controls
    await page.waitForSelector('footer'); 
    await page.waitForTimeout(1000); // Give canvas a moment to init

    await page.screenshot({
      path: path.join(screenshotDir, '02-player-idle.png'),
      fullPage: true
    });

    // 3. Player View (Active)
    console.log('3/3 Player view (Active)...');
    // Click the Play button. It's the first button in the footer.
    // We can be more specific: button inside footer that is not the song selector
    const playButton = page.locator('footer button').first();
    await playButton.click();

    // Wait for some notes to fall and keys to light up
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: path.join(screenshotDir, '03-player-active.png'),
      fullPage: true
    });

    console.log(`\n✅ Screenshots saved to ${screenshotDir}`);

  } catch (error) {
    console.error('❌ Error taking screenshots:', error);
    // If we fail, try to take a debug screenshot
    try {
        await page.screenshot({ path: 'error-screenshot.png' });
        console.log('Saved error-screenshot.png');
    } catch (e) {}
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
