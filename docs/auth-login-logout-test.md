# Auth Login/Logout Test Checklist

Date: 2026-06-09
Scope: T08 - login/logout verification only.

## Environment

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`
- Frontend API base URL: `VITE_API_BASE_URL=http://localhost:8080`
- Test account: `admin@example.com` / `plainPassword`

## Auth Storage Keys

- `stocksense_access_token`
- `stocksense_token_type`
- `stocksense_expires_in`
- `stocksense_login_at`
- `stocksense_current_user`

## Test Cases

| ID | Test case | Steps/input | Expected result | Actual result | Pass/Fail | Bug notes |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | Correct login | Open `/login`; use `admin@example.com` / `plainPassword`; submit. | Backend returns `200`; response has `accessToken`, `tokenType=Bearer`, `expiresIn`, `employeeId`, `fullName`, `email`, `role`, `status`; frontend stores all auth keys; redirects to `/dashboard`; topbar shows user info if implemented. | Pending manual browser test. | Pending | Requires backend/frontend dev servers and a seeded active admin. |
| AUTH-02 | Wrong password | Open `/login`; use `admin@example.com` / `wrong`; submit. | Backend returns `401`; frontend shows `Email hoặc mật khẩu không đúng.`; no auth token is stored and stale auth is not treated as new login. | Pending manual browser test. | Pending | Clear localStorage before test if validating no stored token. |
| AUTH-03 | Unknown email | Open `/login`; use `unknown@example.com` / `plainPassword`; submit. | Backend returns `401`; frontend shows `Email hoặc mật khẩu không đúng.`; no auth token is stored. | Pending manual browser test. | Pending | Clear localStorage before test. |
| AUTH-04 | Invalid email format | Open `/login`; use `abc` / `plainPassword`; submit. | Backend returns `400`; frontend shows `errors.email` as email field error. | Pending manual browser test. | Pending | Browser native email validation may run before backend depending input state. |
| AUTH-05 | Missing password | Open `/login`; use `admin@example.com` and empty password; submit. | Backend returns `400`; frontend shows `errors.password` as password field error. | Pending manual browser test. | Pending |  |
| AUTH-06 | Missing email | Open `/login`; use empty email and `plainPassword`; submit. | Backend returns `400`; frontend shows `errors.email` as email field error. | Pending manual browser test. | Pending |  |
| AUTH-07 | Locked/inactive account | Temporarily set employee `trang_thai` to `TAM_KHOA` or `NGUNG_HOAT_DONG`; try login; restore `HOAT_DONG`. | Backend returns `403`; frontend shows locked/inactive account message; no token is stored. | Pending manual DB/browser test. | Pending | Do not commit DB seed/status change. Restore account after test. |
| AUTH-08 | Logout | Login successfully; confirm auth keys exist; click `Đăng xuất`. | `clearAuth()` removes all auth keys; redirects to `/login`; topbar no longer shows old user; login again still works. | Pending manual browser test. | Pending |  |
| AUTH-09 | Refresh after login | Login successfully; refresh `/dashboard`. | Current user can still be read from localStorage; UI does not break. | Pending manual browser test. | Pending | No full route guard in current scope. |
| AUTH-10 | Network/server down | Stop backend; try login. | Frontend shows `Không thể kết nối đến máy chủ. Vui lòng thử lại sau.` | Pending manual browser test. | Pending |  |

## Locked Account SQL

Lock:

```sql
UPDATE nhan_vien
SET trang_thai = 'TAM_KHOA'::trang_thai_nhan_vien,
    ngay_cap_nhat = now()
WHERE email = 'admin@example.com';
```

Restore:

```sql
UPDATE nhan_vien
SET trang_thai = 'HOAT_DONG'::trang_thai_nhan_vien,
    ngay_cap_nhat = now()
WHERE email = 'admin@example.com';
```

## Curl Checks

Correct login:

```powershell
curl.exe -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"plainPassword\"}"
```

Wrong password:

```powershell
curl.exe -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"wrong\"}"
```

Invalid email:

```powershell
curl.exe -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"abc\",\"password\":\"plainPassword\"}"
```

Missing password:

```powershell
curl.exe -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\"}"
```

## Validation Log

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Frontend production build | `npm run build` | Pass | Vite production build completed successfully. |
| Backend tests | `mvn clean test "-Dspring.profiles.active=neon"` | Pass | 1 test passed; Flyway validated 2 migrations; Spring context started. |
| Live backend availability | `curl.exe --max-time 5 -s -o NUL -w "%{http_code}" http://localhost:8080/api/auth/login` | Not run live | Returned HTTP code `000`; no backend server was running on `localhost:8080`. |
| Manual browser cases | See `AUTH-01` to `AUTH-10` | Pending | Requires running backend/frontend and a seeded active admin account. |
