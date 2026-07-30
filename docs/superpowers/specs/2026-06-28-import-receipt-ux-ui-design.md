# Import Receipt UX/UI Design Specification

## 1. Overview
This document specifies the UX/UI logic, edge case handling, and business rule enforcement for the Import Receipt (Phiếu Nhập Kho) module in the Frontend application.

## 2. Core UX/UI Specifications

### 2.1 Over-receipt Handling (Kiểm Hàng)
- **Scenario:** The warehouse staff enters an `actualReceivedQuantity` that is strictly greater than the `expectedQuantity`.
- **UI Behavior:** 
  - The input field must immediately highlight with a Warning color (Orange/Red border).
  - A mandatory "Reason/Note" (`Ghi chú`) field must become highlighted, requiring the user to explain the over-receipt.
  - The system will NOT hard-block the input, but will flag it visually.

### 2.2 Discrepancy Report Layout (Lập Biên Bản Chênh Lệch)
- **Scenario:** The user needs to create a discrepancy report for items that did not match the expected quantity.
- **UI Behavior:**
  - The UI will automatically **FILTER** the item list.
  - It will ONLY display rows where `status == 'CHENH_LECH'`.
  - Fully matched items (`KHOP`) will be hidden to reduce cognitive load.
  - Each displayed row will require the user to input "Lý do" (Reason) and "Hướng xử lý" (Action).

### 2.3 Self-Approval Restriction (Chặn Duyệt Chéo)
- **Scenario:** A user with the `Manager` role views a receipt that they originally created themselves.
- **UI Behavior:**
  - The "Approve / Reject" (Duyệt / Từ chối) action buttons will still be visible to maintain layout consistency.
  - However, the buttons will be visibly **DISABLED** (greyed out).
  - Hovering over the disabled buttons will display a clear Tooltip: *"Bạn không thể tự duyệt phiếu do chính mình tạo"*.

### 2.4 Unsaved Changes Guard (Cảnh báo mất dữ liệu)
- **Scenario:** The user is filling out the "Create Draft" or "Inspect" form and attempts to navigate away (e.g., clicking Back, refreshing the page, or clicking another sidebar menu) without saving.
- **UI Behavior:**
  - The browser/router will intercept the navigation.
  - A Modal/Dialog will appear warning: *"Bạn có dữ liệu chưa lưu, chắc chắn muốn rời đi?"*.
  - The user must explicitly confirm to discard changes.

### 2.5 Empty States & Error Handling
- **Scenario:** The data list is empty, or the API call fails (e.g., 404 Not Found, 400 Bad Request, or Network Error).
- **UI Behavior:**
  - **Empty List:** Show a friendly "Empty State Illustration" with a text explanation (e.g., "Chưa có phiếu nhập nào") and a clear CTA button like "Tạo phiếu mới".
  - **API Error:** Instead of a blank screen or infinite spinner, show a specialized Error Illustration with a clear message and a "Thử lại" (Retry) button. Toast notifications will also be used for transient errors.

## 3. Next Steps
- Implement UI components adhering to this spec (Task T107/T108).
- Ensure Vue components use appropriate state management for Unsaved Changes (e.g., Vue Router `onBeforeRouteLeave`).
