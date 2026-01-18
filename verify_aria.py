
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_aria_labels():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the app (using the base path configured in next.config.ts)
        try:
            await page.goto("http://localhost:3000/piano_lessons")

            # Wait for content to load
            await page.wait_for_selector("text=Piano Lessons")

            # 1. Verify Play/Pause Button ARIA Label
            # Note: The main page has a "Select a piece" screen first.
            # We need to select a song to get to the controls.

            # Click the first song to start
            await page.click("text=Gnossienne No. 1")

            # Wait for the controls to appear (controls are in the footer)
            await page.wait_for_selector("footer")

            play_button = page.get_by_test_id("play-button")
            await expect(play_button).to_have_attribute("aria-label", "Play")
            print("Verified: Play button has aria-label='Play'")

            # 2. Verify Settings Toggle
            settings_button = page.get_by_label("Settings")
            await expect(settings_button).to_be_visible()
            await expect(settings_button).to_have_attribute("aria-expanded", "false")
            print("Verified: Settings button has aria-label='Settings' and aria-expanded='false'")

            # Open Settings
            await settings_button.click()
            await expect(settings_button).to_have_attribute("aria-expanded", "true")
            print("Verified: Settings button has aria-expanded='true' after click")

            # 3. Verify Song Selection
            song_button = page.get_by_label("Select song")
            await expect(song_button).to_be_visible()
             # Note: Settings popover is open now
            print("Verified: Song selection button has aria-label='Select song'")

            # 4. Verify Speed Control
            speed_input = page.get_by_label("Playback speed")
            await expect(speed_input).to_be_visible()
            print("Verified: Speed input has aria-label='Playback speed'")

            # 5. Verify Seek Input (Might be hidden or visually customized, but should exist in DOM)
            # The seek input is absolutely positioned with opacity 0, so it might not be "visible" to users but accessible to screen readers
            # Playwright's getByLabel should still find it.
            seek_input = page.get_by_label("Seek")
            # We don't check visibility because it has opacity-0 class in the code
            await expect(seek_input).to_have_count(1)
            print("Verified: Seek input has aria-label='Seek'")

            # 6. Verify Color Inputs (when Split Hands is checked - default is seemingly false? Let's check visually)
            # In the code: visualSettings.splitHands defaults to true in page.tsx: const [splitHands, setSplitHands] = useState(true);
            # So color inputs should be visible.

            left_color = page.get_by_label("Left hand color")
            await expect(left_color).to_be_visible()
            print("Verified: Left hand color input has aria-label='Left hand color'")

            right_color = page.get_by_label("Right hand color")
            await expect(right_color).to_be_visible()
            print("Verified: Right hand color input has aria-label='Right hand color'")

            # Take a screenshot for the record (showing settings open)
            await page.screenshot(path="verification_aria.png")
            print("Screenshot taken: verification_aria.png")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="error_state.png")
            raise e
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_aria_labels())
