# SME StockSense Frontend — BUG-13 Fixes

This document details the navigation, routing, and input validation safety fixes applied under BUG-13 for the inventory adjustments module.

## Summary of Changes

### 1. Base Route Redirection
We resolved the blank page issue when navigating to `/inventory-adjustments` (without an ID) by redirecting it to the parent inventory route `/inventory-counts`.
- **Target File**: `src/router/index.js`
- **Route Added**: `{ path: '/inventory-adjustments', redirect: '/inventory-counts' }`

### 2. Resolution of `routes.undefined`
Since `/inventory-adjustments` (without an ID) was not matching any defined routes, the route meta title was `undefined`. This resulted in the topbar attempting to look up `$t('routes.undefined')`, rendering `routes.undefined` in the UI. 
- With the redirect to `/inventory-counts`, accessing `/inventory-adjustments` automatically resolves to `/inventory-counts`, showing the localized title "Kiểm kê kho" (VI) / "Stock Takes" (EN) correctly without any broken state or empty breadcrumbs.

### 3. Route Guard Access List Alignment
We updated `canAccessRoute` in `src/services/permissionService.js` to explicitly protect `/inventory-adjustments` with the exact same roles as other inventory and stock take pages:
- **Authorized Roles**: `['ADMIN', 'MANAGER', 'EMPLOYEE']`
- **Behavior**: If an unauthorized user attempts to access `/inventory-adjustments`, the router first handles the redirect to `/inventory-counts`, where `canAccessRoute` intercepts and safely redirects unauthorized users to `/dashboard`.

### 4. Input Validation & Error Handling
We introduced robust checking for invalid ID parameters in `InventoryAdjustmentView.vue` (such as `/inventory-adjustments/abc` or `/inventory-adjustments/NaN`):
- Checks if the parameter `id` is a valid positive integer (`isNaN(countId) || countId <= 0`) in the `loadVoucher` hook.
- If the ID is invalid, it throws a localized error (`t('inventoryCountDetail.errorLoadDetail')`), preventing useless requests to `/api/inventory-counts/NaN` and displaying the standard project error card.
- The Back button's navigation targets `/inventory-counts` directly if `countId` is invalid, preventing redirect loops or broken navigation states.
