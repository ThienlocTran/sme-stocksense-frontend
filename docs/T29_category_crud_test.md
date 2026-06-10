# T29 Category CRUD Test Report

Date: 2026-06-10
Scope: Category management CRUD validation only. No new feature scope.

## Environment

- Backend: `http://localhost:8080`
- Frontend: `/categories`
- Backend profile: `neon`
- Test category: `DM029` / `Codex Test Danh Mục CRUD`
- Updated test category: `DM029U` / `Codex Test Danh Mục CRUD Updated`
- Tokens, passwords, DB URLs, and secrets are intentionally omitted.

## Build And Test Results

| Area | Command/result | Pass/Fail | Notes |
| --- | --- | --- | --- |
| Frontend diff check | `git diff --check` completed successfully. | PASS | No whitespace errors. |
| Frontend build | `npm run build` completed successfully. | PASS | Vite production build succeeded. |
| Backend tests | `mvnw.cmd clean test -Dspring.profiles.active=neon` completed successfully. | PASS | Ran with local JDK 24 and system PowerShell path; 1 test passed. Flyway reported live schema version 4 is newer than latest versioned migration in repo. |
| Live API validation | Not run. | BLOCKED | No valid admin/manager/employee JWT token or browser session was available. |
| Manual UI validation | Not run. | BLOCKED | No valid frontend session was available; browser automation not required by this task. |

## Backend/API Validation Checklist

| ID | Test case | Steps/input | Expected result | Actual result | Pass/Fail | Bug notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-01 | Auth check | `GET /api/categories` without token. | HTTP 401. | Not run; live category API validation blocked by missing valid token/session. | BLOCKED | No bug confirmed. |
| API-02 | List categories | `GET /api/categories?page=0&size=10` with token. | HTTP 200, paginated response. | Not run; no valid JWT token/session available. | BLOCKED | No bug confirmed. |
| API-03 | Create category | `POST /api/categories` with `DM029`, `Codex Test Danh Mục CRUD`, description, `HOAT_DONG`. | HTTP 201, created DTO, status `HOAT_DONG`. | Not run; no valid JWT token/session available. | BLOCKED | No bug confirmed. |
| API-04 | Duplicate code | POST another category with code `DM029` and different name. | HTTP 400 with `errors.code`. | Not run; create prerequisite blocked. | BLOCKED | No bug confirmed. |
| API-05 | Duplicate name | POST another category with different code and name `Codex Test Danh Mục CRUD`. | HTTP 400 with `errors.name`. | Not run; create prerequisite blocked. | BLOCKED | No bug confirmed. |
| API-06 | Missing required fields | POST with empty `code` and `name`. | HTTP 400 with field errors. | Not run; no valid JWT token/session available. | BLOCKED | No bug confirmed. |
| API-07 | Search/filter after create | `GET /api/categories?keyword=DM029`; then `GET /api/categories?status=HOAT_DONG&keyword=DM029`. | Created category appears. | Not run; create prerequisite blocked. | BLOCKED | No bug confirmed. |
| API-08 | Update category | `PUT /api/categories/{id}` with `DM029U`, updated name/description, `HOAT_DONG`. | HTTP 200 and updated fields. | Not run; create/id prerequisite blocked. | BLOCKED | No bug confirmed. |
| API-09 | Update nonexistent category | `PUT /api/categories/999999`. | HTTP 404. | Not run; no valid JWT token/session available. | BLOCKED | No bug confirmed. |
| API-10 | Update duplicate code/name | Update test category to seeded code/name like `DM001` / `Nguyên liệu` without modifying seeded row. | HTTP 400 field error. | Not run; create/id prerequisite blocked. | BLOCKED | No bug confirmed. |
| API-11 | Disable category | `PATCH /api/categories/{id}/disable`. | HTTP 200 and status `NGUNG_HOAT_DONG`. | Not run; create/id prerequisite blocked. | BLOCKED | No bug confirmed. |
| API-12 | Disable idempotency | PATCH same category again. | HTTP 200 and status remains `NGUNG_HOAT_DONG`. | Not run; disable prerequisite blocked. | BLOCKED | No bug confirmed. |
| API-13 | Disable nonexistent category | `PATCH /api/categories/999999/disable`. | HTTP 404. | Not run; no valid JWT token/session available. | BLOCKED | No bug confirmed. |
| API-14 | Filter disabled category | `GET /api/categories?status=NGUNG_HOAT_DONG&keyword=DM029U`. | Disabled category appears. | Not run; disable prerequisite blocked. | BLOCKED | No bug confirmed. |

## Frontend/UI Validation Checklist

| ID | Test case | Steps/input | Expected result | Actual result | Pass/Fail | Bug notes |
| --- | --- | --- | --- | --- | --- | --- |
| UI-01 | Login as admin/manager | Login through current auth UI. | Authenticated session. | Not run; no valid credential/session provided. | BLOCKED | No bug confirmed. |
| UI-02 | Open category list | Open `/categories`. | Category page loads. | Not run live; source route exists from T27. | BLOCKED | No bug confirmed. |
| UI-03 | Category list renders | View table on `/categories`. | Rows render with category fields. | Not run live; build coverage only. | BLOCKED | No bug confirmed. |
| UI-04 | Search by keyword | Enter keyword and submit search. | Query uses `keyword`; matching rows render. | Not run live; source uses `getCategories(filters)`. | BLOCKED | No bug confirmed. |
| UI-05 | Status filter | Select status filter. | Query uses `status`; matching rows render. | Not run live; source uses status filter. | BLOCKED | No bug confirmed. |
| UI-06 | Pagination | Use page size/previous/next controls. | Page/size controls work without layout break. | Not run live; source pagination retained from T27. | BLOCKED | No bug confirmed. |
| UI-07 | Open create form | Click `Thêm danh mục`. | Modal opens. | Not run live; source modal added in T28. | BLOCKED | No bug confirmed. |
| UI-08 | Create `DM029` | Submit create form with T29 data. | Category created and list refreshed. | Not run; no valid session available. | BLOCKED | No bug confirmed. |
| UI-09 | Duplicate code error | Submit duplicate `DM029`. | `errors.code` shown under code field. | Not run; backend prerequisite blocked. | BLOCKED | No bug confirmed. |
| UI-10 | Duplicate name error | Submit duplicate name. | `errors.name` shown under name field. | Not run; backend prerequisite blocked. | BLOCKED | No bug confirmed. |
| UI-11 | Open edit form | Click `Sửa` on a row. | Modal opens with existing data. | Not run live; source enables `Sửa` from T28. | BLOCKED | No bug confirmed. |
| UI-12 | Update category | Change code/name/description/status and save. | Row refreshes with updated data. | Not run; no valid session available. | BLOCKED | No bug confirmed. |
| UI-13 | Empty required fields | Submit empty code/name. | Field errors shown. | Not run live; source validates required code/name/status. | BLOCKED | No bug confirmed. |
| UI-14 | Disable UI | Check disable action. | If wired, disable works; otherwise document placeholder. | Disable button remains disabled placeholder in T28. | PASS | Matches T28/T29 scope note. |
| UI-15 | Refresh `/categories` | Refresh authenticated page. | Layout remains stable. | Not run; no valid session available. | BLOCKED | No bug confirmed. |
| UI-16 | 401 behavior | Expired/no token on category calls. | Redirects to `/login` or shows auth error by convention. | Not run live; service clears auth on 401 and page redirects in source. | BLOCKED | No bug confirmed. |

## Bugs Found Or Fixed

No category bug was confirmed in live validation. No code changes were made for T29.

## Remaining Risks

- Full live CRUD validation is blocked until a valid admin/manager token or browser session is available.
- Frontend UI behavior was not manually exercised in a browser because this task did not require browser automation and no valid session was available.
- Backend test logs still show Neon schema version 4 is newer than this branch's latest versioned migration; no migration changes were made.

## Readiness

Category module source compiles and the frontend production build passes. Live CRUD readiness remains pending credential-backed validation.
