# SME StockSense Frontend — BUG-08 Fixes

This document details the localization, UX, and copy fixes applied under BUG-08 for the approval module.

## Summary of Changes

### 1. Fix Duplicated Approval Copy
We resolved the duplication where confirming receipt approvals displayed `"Duyệt phiếu phiếu {code}?"` in Vietnamese and `"Approve phiếu {code}?"` in English.
- Created separate confirmation keys for each document type to avoid hardcoded concatenation of `approveLabel` and `" phiếu"`.
- Resolved dynamic strings via a new `getApproveConfirmMessage(receipt)` helper.
  - **VI**: `"Duyệt phiếu FD-PN-1?"`
  - **EN**: `"Approve receipt FD-PN-1?"`

### 2. Known Business-Rule Error Mapping
A central helper function `translateError(msg)` was introduced inside component scopes (`ApprovalsView.vue`, `StockOutApprovalDetail.vue`, `ImportReceiptHistoryModal.vue`) to map backend errors dynamically using vue-i18n.
- **Level-2 Same-Approver Violation**:
  - Raw: `"Nguoi duyet cap 2 phai khac nguoi da duyet cap 1 (nguyen tac 4 mat)."`
  - VI: `"Người duyệt cấp 2 phải khác người đã duyệt cấp 1."`
  - EN: `"The second-level approver must be different from the first-level approver."`
- **Self-Approval Violations**:
  - Raw: `"Nguoi tao phieu khong duoc tu duyet phieu cua chinh minh."`
  - VI/EN: mapped to standard `approvals.messages.creatorCannotApprove`.

### 3. Generic Error Fallback
We resolved the raw English generic error `"System error. Please try again later."` displaying on Vietnamese locales.
- Added `common.systemError` key to both translation catalogs.
- Checked and mapped unexpected HTTP 500 errors to this localized generic system error.

### 4. Locale Consistency
- The approval-history modal `ImportReceiptHistoryModal.vue` was fully refactored to use dynamic translations for all status text, loading indicator, and headers.
- All errors display reactively and update immediately when switching languages in the application.
