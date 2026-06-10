# T22 Employee And Role Management Test Report

Date: 2026-06-10
Scope: End-to-end validation for employee and role management. No new feature scope.

## Environment

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`
- Backend profile: `neon`
- Test emails: `codex-test-employee-role@example.com`, `codex-test-employee-role-2@example.com`
- Tokens, passwords, DB URLs, and secrets are intentionally omitted.

## Build And Test Results

| Area | Command/result | Pass/Fail | Notes |
| --- | --- | --- | --- |
| Frontend build | `npm run build` completed successfully. | PASS | Vite build succeeded. |
| Backend tests | `mvnw.cmd clean test -Dspring.profiles.active=neon` completed successfully after setting `JAVA_HOME` to local JDK 21. | PASS | Initial attempt with default Java 17 failed before tests because project requires release 21. |
| Live backend | Patched backend started on localhost `8080` with `neon`. | PASS | Temporary validation server was used because the pre-existing localhost process stopped listening during rebuild. |

## Backend/API Validation

| ID | Test case | Steps/input | Expected result | Actual result | Pass/Fail | Bug notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-01 | Login as admin | `POST /api/auth/login` with provided admin credential. | HTTP 200 and access token. | HTTP 200; token present. | PASS | CORS preflight bug fixed before final run. |
| API-02 | List employees | `GET /api/employees?page=0&size=10`. | HTTP 200, paginated content, no password fields. | HTTP 200; paginated rows returned; response keys exclude password fields. | PASS | Raw text contains the word `Password` only inside existing test data, not as a field. |
| API-03 | Create employee | `POST /api/employees` for `codex-test-employee-role@example.com`. | HTTP 201, `roleCode=EMPLOYEE`, no password fields. | HTTP 201; `roleCode=EMPLOYEE`; no password fields. | PASS |  |
| API-04 | Duplicate email validation | Repeat create for same email and uppercase/spaces variant. | HTTP 400, `errors.email`, not 500. | HTTP 400; JSON body includes `errors.email`. | PASS |  |
| API-05 | Update employee | `PUT /api/employees/{id}` changing full name, phone, role, status. | HTTP 200, updated `roleCode=MANAGER`. | HTTP 200; updated values returned. | PASS |  |
| API-06 | Role code behavior | Update with `ADMIN`, `MANAGER`, `EMPLOYEE`, then invalid role. | Valid role codes accepted; invalid role rejected with HTTP 400. | Valid roles returned HTTP 200; invalid returned HTTP 400. | PASS |  |
| API-07 | Lock employee | `PATCH /api/employees/{id}/lock`. | HTTP 200, `status=TAM_KHOA`. | HTTP 200; `status=TAM_KHOA`. | PASS |  |
| API-08 | Login locked employee | Login with locked codex-test employee. | HTTP 403. | HTTP 403. | PASS |  |
| API-09 | Unlock employee | `PATCH /api/employees/{id}/unlock`. | HTTP 200, `status=HOAT_DONG`. | HTTP 200; `status=HOAT_DONG`. | PASS |  |
| API-10 | Reset password | `PATCH /api/employees/{id}/reset-password`; verify old credential fails and new credential succeeds. | HTTP 200; old login fails; new login succeeds. | Reset HTTP 200; old login HTTP 401; new login HTTP 200. | PASS |  |
| API-11 | Change own password | Login as codex-test employee, call `PATCH /api/auth/change-password`, then cleanup via admin reset. | HTTP 200; old password fails; new password succeeds; cleanup possible. | Change HTTP 200; old login HTTP 401; new login HTTP 200; cleanup HTTP 200. | PASS |  |
| API-12 | Unauthorized behavior | Call protected employee APIs without token. | HTTP 401 JSON. | All checked endpoints returned HTTP 401 JSON. | PASS |  |
| API-13 | Nonexistent employee | `PUT`, `lock`, and `reset-password` for `/api/employees/999999`. | HTTP 404 JSON. | All checked endpoints returned HTTP 404 JSON. | PASS |  |

## Frontend/UI Validation

| ID | Test case | Steps/input | Expected result | Actual result | Pass/Fail | Bug notes |
| --- | --- | --- | --- | --- | --- | --- |
| UI-01 | Login as admin | Open `/login`, submit provided admin credential. | Redirect to authenticated app. | Redirected to `/dashboard`; user/topbar visible. | PASS | Preflight bug fixed before final run. |
| UI-02 | Open employees | Open `/employees`. | Employee page loads. | URL `/employees`; table headers and rows rendered. | PASS |  |
| UI-03 | Employee list renders | Inspect employee table. | Rows show employee fields and actions. | Table showed name, email, phone, role, status, created date, actions. | PASS |  |
| UI-04 | Search by keyword | Search `codex-test`. | Matching employees displayed. | Matching codex-test rows displayed. | PASS |  |
| UI-05 | Filter by status | Select active status. | Active employees displayed. | Rows showed active status. | PASS |  |
| UI-06 | Filter by role | Select employee role. | Employee-role rows displayed. | Rows showed `Nhân viên kho`. | PASS |  |
| UI-07 | Pagination controls | Inspect pagination area. | Controls render; next/previous work if enough data exists. | Controls rendered; only one page of data existed, so next/previous were disabled. | PASS | Not enough rows to exercise page transitions. |
| UI-08 | Create employee | Click `Thêm nhân viên`, create `codex-test-employee-role-2@example.com`. | Success message and new row. | Create succeeded; row became visible. | PASS |  |
| UI-09 | Duplicate email | Try creating same UI email again. | Field-level email error. | UI displayed email duplicate error. | PASS |  |
| UI-10 | Edit employee | Click `Sửa`, update full name, phone, status, role. | Updated row shown. | Updated name and `Quản lý kho` role shown. | PASS |  |
| UI-11 | Role dropdown labels | Inspect create/edit role dropdown. | Shows `Quản trị viên`, `Quản lý kho`, `Nhân viên kho`. | All expected labels present. | PASS |  |
| UI-12 | Reset password modal | Open reset modal and submit matching new password fields. | Success message. | Reset success message displayed. | PASS |  |
| UI-13 | Change personal password modal | Login as codex-test employee and submit change-password modal. | Success message; password can be cleaned up. | Change-password success message displayed; password reset back through admin API after validation. | PASS |  |
| UI-14 | Logout | Click logout. | Returns to login page. | URL `/login`; login form visible. | PASS |  |
| UI-15 | Refresh `/employees` | Refresh page while authenticated. | Layout remains stable. | Table still rendered after refresh. | PASS |  |
| UI-16 | 401 behavior | After logout, navigate to `/employees`. | Redirects to `/login` or clears auth by current convention. | Redirected to `/login`; login form visible. | PASS |  |

## Bug Fixed

| Bug | Root cause | File changed | Before | After |
| --- | --- | --- | --- | --- |
| Browser login showed a connection/server error even when backend was available. | Spring Security did not explicitly permit CORS preflight `OPTIONS` requests, so browser preflight to `/api/auth/login` could be rejected before the actual login call. | `sme-stocksense-backend/src/main/java/com/smartflow/smestocksensebackend/config/SecurityConfig.java` | `OPTIONS /api/auth/login` from frontend origin could return HTTP 401 without usable CORS access. | `OPTIONS /**` is permitted; preflight returns HTTP 200 with CORS headers; UI login succeeds. |

## Cleanup

- `codex-test-employee-role-2@example.com` was reset back to active employee role and stable test password through admin API.
- No JWTs, passwords, DB URLs, secrets, `node_modules`, `dist`, `target`, or generated build files should be committed.

## Remaining Risks

- Pagination next/previous transition was not exercised because the live dataset had only one page.
- Backend test logs reported the live database schema version is newer than the latest migration present in this branch. This was not changed in T22.
- Backend commands require JDK 21; default shell Java was 17 in this workspace.

## Readiness

Employee and role management is ready for the next backlog task after the CORS preflight fix.