import { test, expect } from '@playwright/test';

test.describe('Profile Page E2E', () => {
  test('Login and view profile correctly', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('http://localhost:5173/login');
    
    // 2. Fill login form
    await page.fill('input[type="email"]', 'tranthienloc21102005@gmail.com');
    await page.fill('input[type="password"]', '12345678');
    
    // 3. Submit
    await page.click('button[type="submit"]');
    
    // 4. Wait for navigation to dashboard/profile
    await page.waitForURL('**/dashboard'); // or wait for a specific element if redirect varies
    
    // 5. Navigate to profile page (assuming URL is /profile or /users or similar)
    // Let's force navigation to /profile (update this if route is different)
    await page.goto('http://localhost:5173/profile');
    
    // 6. Verify profile elements
    await expect(page.getByText('tranthienloc21102005@gmail.com').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Sửa hồ sơ/i })).toBeVisible();
    
    // 7. Click edit
    await page.getByRole('button', { name: /Sửa hồ sơ/i }).click({ force: true });
    
    // 8. Verify save button appears
    await expect(page.getByRole('button', { name: /Lưu thay đổi/i })).toBeVisible();
    
    console.log('Profile E2E test passed successfully!');
  });
});
