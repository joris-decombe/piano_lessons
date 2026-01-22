import { test, expect } from '@playwright/test';

test.describe('Security Controls', () => {
    test('blocks files larger than 5MB', async ({ page }) => {
        await page.goto('/piano_lessons');

        // Prepare to handle the alert
        let dialogMessage = '';
        page.once('dialog', dialog => {
            dialogMessage = dialog.message();
            dialog.dismiss();
        });

        // Create a large buffer (5MB + 1 byte)
        const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);

        // Locate the file input
        const fileInput = page.locator('input[type="file"]');

        // Attempt upload
        await fileInput.setInputFiles({
            name: 'large_malicious.xml',
            mimeType: 'text/xml',
            buffer: largeBuffer
        });

        // Wait for event handling
        await page.waitForTimeout(500);

        // Verify alert was triggered
        expect(dialogMessage).toBe('File is too large. Maximum size is 5MB.');

        // Verify the song was NOT added
        await expect(page.getByText('large_malicious')).not.toBeVisible();
    });
});
