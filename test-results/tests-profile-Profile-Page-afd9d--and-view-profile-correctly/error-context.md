# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\profile.spec.js >> Profile Page E2E >> Login and view profile correctly
- Location: tests\profile.spec.js:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Lưu thay đổi/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Lưu thay đổi/i })

```

```yaml
- complementary:
  - link "S SME StockSense Quản lý tồn kho MVP":
    - /url: /dashboard
    - text: S
    - strong: SME StockSense
    - text: Quản lý tồn kho MVP
  - navigation:
    - link "Tổng quan":
      - /url: /dashboard
    - text: Danh mục
    - link "Sản phẩm":
      - /url: /products
    - link "Danh mục":
      - /url: /categories
    - link "Kho hàng":
      - /url: /warehouses
    - text: Quản lý kho
    - link "Tồn kho":
      - /url: /inventory
    - link "Lịch sử giao dịch":
      - /url: /inventory-transactions
    - link "Phiếu nhập kho":
      - /url: /stock-in
    - link "Phiếu xuất kho":
      - /url: /stock-out
    - text: Hệ thống
    - link "Cảnh báo tồn kho":
      - /url: /alerts
    - link "Hồ sơ":
      - /url: /profile
  - strong: Phạm vi hiện tại
  - text: CRUD kho, phiếu nhập/xuất, duyệt phiếu và import theo mẫu.
- banner:
  - strong: Hồ sơ
  - text: Doanh nghiệp SME duy nhất
  - strong: Tran Thien Loc
  - text: Nhân viên kho
  - button "󰝳 Đổi mật khẩu"
  - button "󰍃 Đăng xuất"
- main:
  - main:
    - heading "Hồ sơ cá nhân" [level=1]
    - paragraph: Xem và quản lý thông tin định danh nội bộ.
    - button "Sửa hồ sơ"
    - text: 󰀄
    - button "󰄀"
    - heading "Tran Thien Loc" [level=2]
    - text: Nhân viên kho tranthienloc21102005@gmail.com
    - heading "Thông tin liên lạc" [level=3]
    - text: Họ và tên Tran Thien Loc Số điện thoại —
    - heading "Định danh cá nhân" [level=3]
    - text: Giới tính — Ngày sinh —
    - heading "Trạng thái hệ thống" [level=3]
    - text: Email (Chỉ đọc) tranthienloc21102005@gmail.com Trạng thái (Chỉ đọc) HOAT_DONG
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Profile Page E2E', () => {
  4  |   test('Login and view profile correctly', async ({ page }) => {
  5  |     // 1. Navigate to login
  6  |     await page.goto('http://localhost:5173/login');
  7  |     
  8  |     // 2. Fill login form
  9  |     await page.fill('input[type="email"]', 'tranthienloc21102005@gmail.com');
  10 |     await page.fill('input[type="password"]', '12345678');
  11 |     
  12 |     // 3. Submit
  13 |     await page.click('button[type="submit"]');
  14 |     
  15 |     // 4. Wait for navigation to dashboard/profile
  16 |     await page.waitForURL('**/dashboard'); // or wait for a specific element if redirect varies
  17 |     
  18 |     // 5. Navigate to profile page (assuming URL is /profile or /users or similar)
  19 |     // Let's force navigation to /profile (update this if route is different)
  20 |     await page.goto('http://localhost:5173/profile');
  21 |     
  22 |     // 6. Verify profile elements
  23 |     await expect(page.getByText('tranthienloc21102005@gmail.com').first()).toBeVisible();
  24 |     await expect(page.getByRole('button', { name: /Sửa hồ sơ/i })).toBeVisible();
  25 |     
  26 |     // 7. Click edit
  27 |     await page.getByRole('button', { name: /Sửa hồ sơ/i }).click({ force: true });
  28 |     
  29 |     // 8. Verify save button appears
> 30 |     await expect(page.getByRole('button', { name: /Lưu thay đổi/i })).toBeVisible();
     |                                                                       ^ Error: expect(locator).toBeVisible() failed
  31 |     
  32 |     console.log('Profile E2E test passed successfully!');
  33 |   });
  34 | });
  35 | 
```