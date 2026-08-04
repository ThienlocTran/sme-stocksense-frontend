import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Profile Upload E2E', () => {
  test('Upload Avatar and Save Profile', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('http://localhost:5173/login');
    
    // 2. Fill login form
    await page.fill('input[type="email"]', 'tranthienloc21102005@gmail.com');
    await page.fill('input[type="password"]', '12345678');
    
    // 3. Submit
    await page.click('button[type="submit"]');
    
    // 4. Wait for navigation
    await page.waitForURL('**/dashboard'); 
    
    // 5. Navigate to profile page
    await page.goto('http://localhost:5173/profile');
    
    // 6. Verify profile elements
    await expect(page.getByText('tranthienloc21102005@gmail.com').first()).toBeVisible();
    
    // 7. Click edit profile
    await page.getByRole('button', { name: /Sửa hồ sơ/i }).click({ force: true });
    
    // 8. Change phone number to test text edit
    const phoneInput = page.locator('input[type="text"]').last(); // phone is the second text input usually
    // wait, there are two inputs: full name and phone. Let's just use CSS selectors if possible, or skip text edit.
    
    // 9. Upload avatar
    const filePath = 'C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\0671099b-204b-45ce-be0e-ac718f0cd9dc\\test_avatar_1785841140737.png';
    // The input type="file" is hidden
    const fileChooserPromise = page.waitForEvent('filechooser');
    // Click the button that triggers the file input
    await page.locator('button[title="Đổi ảnh đại diện"]').click({ force: true });
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    
    // 10. Wait for the upload to complete by checking if the image url changed or loading indicator disappeared
    // The UI shows a loading spinner (mdi-loading) while uploading, let's wait for it to disappear
    await expect(page.locator('.mdi-loading.mdi-spin')).toBeVisible(); // Spinner appears
    await expect(page.locator('.mdi-loading.mdi-spin')).toBeHidden({ timeout: 15000 }); // Spinner disappears (Cloudinary might take a few seconds)
    
    // 11. Click Save
    await page.getByRole('button', { name: /Lưu thay đổi/i }).click({ force: true });
    
    // 12. Verify edit mode is off (Sửa hồ sơ button appears again)
    await expect(page.getByRole('button', { name: /Sửa hồ sơ/i })).toBeVisible({ timeout: 5000 });
    
    console.log('Profile Avatar Upload and Save E2E test passed successfully!');
  });
});
