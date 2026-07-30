# T124: Kiểm thử E2E luồng Phiếu Xuất Kho (Full Test Suite)

> **Trạng thái:** Sẵn sàng thực thi  
> **Phạm vi:** Frontend (Vue 3 + Playwright) + Backend API (Spring Boot)  
> **Base URL Frontend:** `http://localhost:5173`  
> **Base URL Backend:** `http://localhost:8080`

---

## 1. Mục tiêu kiểm thử

| Mục tiêu | Mô tả |
|---|---|
| Tính đúng đắn của luồng nghiệp vụ | Toàn bộ flow từ Tạo → Gửi duyệt → Quản lý duyệt → Trừ tồn kho |
| Phân quyền (Authorization) | Đúng Role mới thấy đúng nút thao tác |
| Validate dữ liệu (Client + Server) | Chặn xuất lố tồn kho ở cả 2 tầng UI và API |
| UX/UI Navigation | Back button, Auto-redirect, Filter state persistence |
| Xử lý lỗi (Error Handling) | API 401, 400, 500 — đều hiện thông báo thân thiện |

---

## 2. Chuẩn bị Dữ liệu (Seed Data bắt buộc)

Trước khi chạy bất kỳ Test Case nào, đảm bảo DB có sẵn các bản ghi sau:

| Loại | Dữ liệu cần có | Ghi chú |
|---|---|---|
| Tài khoản Employee | `employee_test@sme.com / password123` | Role: `Nhân viên kho` |
| Tài khoản Manager | `manager_test@sme.com / password123` | Role: `Quản lý kho` |
| Kho hàng | Ít nhất 1 Kho status `ACTIVE` | Ghi nhớ `warehouseId` |
| Sản phẩm + Tồn kho | 1 SP có tồn kho **chính xác = 10** tại kho trên | Số cụ thể để dễ assert |
| Phiếu xuất nháp sẵn | 1 phiếu trạng thái `NHAP` do Employee tạo | Dùng cho test Sửa, Hủy |

> ⚠️ **Lưu ý:** Ghi lại `warehouseId`, `productId`, và `productCode` cụ thể vào biến môi trường test để các kịch bản Playwright tham chiếu chính xác.

---

## 3. Kịch bản Test API (Backend) — Chạy trước khi test UI

### TC-API-01: Tạo phiếu xuất nháp hợp lệ
- **Endpoint:** `POST /api/v1/export-receipts/draft`
- **Auth:** Bearer token của Employee
- **Request Body:**
```json
{
  "warehouseId": 1,
  "note": "Xuất test T124",
  "details": [{ "productId": 101, "quantity": 3, "note": "" }]
}
```
- **Assert:** HTTP 201, response có `id`, `status = "NHAP"`, `code` có tiền tố `PXK-`

### TC-API-02: Tạo phiếu xuất lố tồn kho (phải bị từ chối ở Backend)
- **Endpoint:** `POST /api/v1/export-receipts/draft`
- **Request Body:** `quantity: 999` (lớn hơn tồn kho thực tế = 10)
- **Assert:** HTTP 400 hoặc 422, `message` chứa nội dung lỗi tồn kho

### TC-API-03: Gửi duyệt phiếu (Employee)
- **Endpoint:** `PUT /api/v1/export-receipts/{id}/submit`
- **Điều kiện:** Phiếu đang ở trạng thái `NHAP`
- **Assert:** HTTP 200, `status = "CHO_DUYET_CAP_1"` hoặc `"CHO_DUYET_CAP_2"`

### TC-API-04: Gửi duyệt phiếu đã ở trạng thái không hợp lệ
- **Endpoint:** `PUT /api/v1/export-receipts/{id}/submit`
- **Điều kiện:** Phiếu đang ở trạng thái `HOAN_THANH`
- **Assert:** HTTP 400, message lỗi state machine

### TC-API-05: Hủy phiếu nháp (Employee)
- **Endpoint:** `DELETE /api/v1/export-receipts/{id}/draft`
- **Điều kiện:** Phiếu đang ở trạng thái `NHAP`
- **Assert:** HTTP 200, `status = "HUY"`

### TC-API-06: Truy cập phiếu của người khác (Security)
- **Endpoint:** `GET /api/v1/export-receipts/{id}` (id của Employee khác)
- **Auth:** Bearer token của Employee không sở hữu phiếu
- **Assert:** HTTP 403 hoặc 404

### TC-API-07: Lấy chi tiết phiếu xuất (T120)
- **Endpoint:** `GET /api/v1/export-receipts/{id}`
- **Assert:** HTTP 200, response có đủ các trường: `id`, `code`, `warehouseName`, `status`, `createdBy`, `createdAt`, `details[]`

---

## 4. Kịch bản Test UI/UX — Playwright E2E

### 4.1. Nhóm A: Màn hình Danh sách (`/stock-out`)

#### TC-UI-A01: Render danh sách và hiển thị đúng cột
1. Đăng nhập với **Employee**
2. Điều hướng đến `/stock-out`
3. **Assert:**
   - Tiêu đề trang hiển thị *"Phiếu xuất của tôi"*
   - Bảng có đủ 5 cột: Mã phiếu, Kho xuất, Ngày tạo, Trạng thái, Thao tác
   - Phiếu trạng thái `NHAP` → Badge màu xám
   - Phiếu trạng thái `CHO_DUYET_CAP_1` → Badge màu vàng/cam
   - Phiếu trạng thái `HOAN_THANH` → Badge màu xanh lá

#### TC-UI-A02: Phân quyền ẩn/hiện nút thao tác theo trạng thái
- Phiếu trạng thái `NHAP` → **Phải có** nút: Sửa, Gửi duyệt, Hủy, Xem
- Phiếu trạng thái `CHO_DUYET_CAP_1` → **Chỉ có** nút: Xem (ẩn 3 nút còn lại)
- Phiếu trạng thái `HOAN_THANH` → **Chỉ có** nút: Xem
- Phiếu trạng thái `TU_CHOI` → **Có** nút: Sửa, Gửi duyệt lại, Xem (không có Hủy)

#### TC-UI-A03: Bộ lọc Trạng thái
1. Chọn Filter "Nháp" → Danh sách chỉ hiện phiếu `NHAP`
2. Xóa Filter → Hiện lại toàn bộ
3. **Assert:** Tổng số phiếu (counter) cập nhật đúng sau mỗi lần filter

#### TC-UI-A04: Phân trang (Pagination)
1. Nếu có > 10 phiếu → nút "Sau" mới active
2. Bấm "Sau" → trang chuyển, dữ liệu load mới
3. **Assert:** "Trang 2/N" hiển thị đúng

#### TC-UI-A05: Hiển thị lý do từ chối
- Phiếu trạng thái `TU_CHOI` có `rejectionReason`
- **Assert:** Xuất hiện dòng text màu đỏ "Lý do từ chối: ..." ngay bên dưới Badge

---

### 4.2. Nhóm B: Màn hình Tạo phiếu (`/stock-out/create`)

#### TC-UI-B01: Validate bắt buộc chọn Kho trước
1. Chưa chọn Kho → Bấm "Thêm dòng"
2. **Assert:** Nút "Thêm dòng" bị disable, có text nhắc nhở "Vui lòng chọn Kho xuất trước"

#### TC-UI-B02: Validate lỗi xuất lố tồn kho (Client-side)
1. Chọn Kho → Thêm sản phẩm (tồn kho thực = 10)
2. Nhập số lượng = **11** (> tồn kho)
3. **Assert:**
   - Ô input có viền màu đỏ (class `has-error`)
   - Hiện dòng text lỗi: "Vượt quá tồn kho (Tồn: 10)"
   - Nút "Lưu nháp" bị **Disabled**

#### TC-UI-B03: Validate trùng lặp sản phẩm
1. Thêm cùng 1 sản phẩm vào 2 dòng khác nhau
2. **Assert:** Dòng lỗi "Sản phẩm này đã được chọn ở dòng khác", nút Lưu Disabled

#### TC-UI-B04: Cảnh báo khi đổi Kho xuất có sản phẩm
1. Chọn Kho A → Thêm sản phẩm
2. Đổi sang Kho B
3. **Assert:** Modal cảnh báo hiện lên *"Việc thay đổi kho sẽ xóa sạch danh sách sản phẩm..."*
4. Bấm "Đồng ý, đổi kho" → Danh sách sản phẩm bị xóa sạch, Kho đổi thành Kho B

#### TC-UI-B05: Tạo nháp thành công → Auto-redirect
1. Điền đầy đủ hợp lệ → Bấm "Lưu nháp"
2. **Assert:**
   - Toast thành công: "Tạo phiếu xuất nháp thành công!"
   - Sau ~1 giây: URL tự động chuyển về `/stock-out`
   - Phiếu vừa tạo xuất hiện trong danh sách, trạng thái `NHAP`

#### TC-UI-B06: Lưu & Gửi duyệt thành công → Auto-redirect
1. Điền đầy đủ hợp lệ → Bấm "Lưu & Gửi duyệt"
2. **Assert:**
   - Toast thành công, redirect về `/stock-out`
   - Phiếu hiện trong danh sách, trạng thái `CHO_DUYET_CAP_1`

---

### 4.3. Nhóm C: Màn hình Sửa phiếu (`/stock-out/:id/edit`)

#### TC-UI-C01: Load đúng dữ liệu phiếu vào form
1. Vào `/stock-out/{id}/edit` với phiếu `NHAP`
2. **Assert:** Form hiển thị đúng Kho xuất cũ, Ghi chú cũ, danh sách sản phẩm cũ

#### TC-UI-C02: Cập nhật và Lưu thành công
1. Thay đổi số lượng sản phẩm → Bấm "Lưu nháp"
2. **Assert:** Toast thành công, redirect về `/stock-out`
3. Kiểm tra lại phiếu trong danh sách — số lượng đã thay đổi

---

### 4.4. Nhóm D: Màn hình Chi tiết (`/stock-out/:id`)

#### TC-UI-D01: Hiển thị đúng toàn bộ thông tin
1. Vào `/stock-out/{id}` với phiếu `NHAP`
2. **Assert:**
   - Badge Trạng thái đúng màu
   - Thông tin Header: Kho xuất, Người tạo, Ngày tạo đúng
   - Bảng sản phẩm có đủ: Mã SP, Tên SP, ĐVT, SL Xuất

#### TC-UI-D02: Nút Gửi duyệt → Confirm → Reload data tại chỗ
1. Phiếu đang `NHAP` → Click "Gửi duyệt"
2. Modal confirm hiện ra
3. Click "Gửi duyệt" trong modal
4. **Assert:**
   - Toast thành công
   - Badge **đổi màu sang Vàng** (CHO_DUYET_CAP_1) mà **không chuyển trang**
   - Các nút Sửa/Gửi duyệt/Hủy **tự động biến mất**

#### TC-UI-D03: Nút Hủy phiếu → Confirm → Reload data
1. Phiếu đang `NHAP` → Click "Hủy phiếu"
2. Confirm → Click OK
3. **Assert:** Badge đổi sang màu xám `HUY`, tất cả nút thao tác biến mất

#### TC-UI-D04: Nút "In phiếu" (Mockup)
1. Click nút "In phiếu"
2. **Assert:** Toast *"Chức năng In PDF đang được phát triển"* hiện trong 3 giây

#### TC-UI-D05: Phiếu TỪ CHỐI — Hiển thị lý do
1. Vào chi tiết phiếu `TU_CHOI` có `rejectionReason = "Sai số lượng"`
2. **Assert:** Khung cảnh báo đỏ hiện: "Lý do từ chối: Sai số lượng"

---

### 4.5. Nhóm E: UX/UI Navigation

#### TC-UI-E01: Nút Quay lại từ màn hình Tạo
1. Vào `/stock-out/create`
2. Click "Quay lại danh sách"
3. **Assert:** URL trở về `/stock-out`

#### TC-UI-E02: Nút Quay lại từ màn hình Sửa
1. Vào `/stock-out/{id}/edit`
2. Click "Quay lại danh sách"
3. **Assert:** URL trở về `/stock-out`

#### TC-UI-E03: Nút Quay lại từ màn hình Chi tiết
1. Vào `/stock-out/{id}`
2. Click "Quay lại danh sách"
3. **Assert:** URL trở về `/stock-out`

#### TC-UI-E04: Hover effect trên nút Back
1. Di chuột vào nút "Quay lại danh sách"
2. **Assert:** Nút dịch chuyển nhẹ sang trái (CSS `transform: translateX(-2px)`) — kiểm tra computed style

#### TC-UI-E05: Hover + Active effect trên nút thao tác
1. Hover vào nút "Gửi duyệt" hoặc "Lưu nháp"
2. **Assert:** Nút nâng lên (`translateY(-1px)`) và xuất hiện `box-shadow`
3. Click giữ chuột → nút về lại vị trí ban đầu (`translateY(0)`)

---

### 4.6. Nhóm F: Luồng Cross-role (Full Flow E2E)

#### TC-UI-F01: Full Flow Employee → Manager → Kiểm tra tồn kho

**Bước 1 — Ghi nhận tồn kho ban đầu:**
- Đăng nhập MANAGER → vào `/inventory` → ghi nhận tồn kho sản phẩm Test = **10**

**Bước 2 — Employee tạo và gửi duyệt:**
1. Đổi sang tài khoản EMPLOYEE (đăng xuất → đăng nhập lại)
2. Tạo phiếu xuất mới: Kho Test, Sản phẩm Test, Số lượng = **3**
3. Bấm "Lưu & Gửi duyệt"
4. **Assert:** Phiếu xuất hiện trên danh sách, trạng thái `CHO_DUYET_CAP_1`

**Bước 3 — Manager duyệt phiếu:**
1. Đổi sang tài khoản MANAGER
2. Vào chi tiết phiếu → Click "Duyệt phiếu" (nếu API Manager có)
3. **Assert:** Trạng thái đổi thành `HOAN_THANH` (màu xanh lá)

**Bước 4 — Kiểm tra tồn kho bị trừ:**
1. Vào `/inventory`
2. **Assert:** Tồn kho sản phẩm Test tại Kho Test = **10 - 3 = 7**

---

### 4.7. Nhóm G: Xử lý lỗi (Error Handling)

#### TC-UI-G01: Session hết hạn — Auto redirect Login
1. Xóa `stocksense_access_token` khỏi localStorage
2. Bấm bất kỳ nút gọi API nào (Tải danh sách, Gửi duyệt...)
3. **Assert:** Trang tự động redirect về `/login`

#### TC-UI-G02: Không tìm thấy phiếu (404)
1. Vào `/stock-out/99999` (ID không tồn tại)
2. **Assert:** Hiển thị thông báo lỗi thân thiện (form-alert-error), không bị trắng trang

#### TC-UI-G03: Mất kết nối mạng
1. Tắt mạng (Playwright: set offline mode)
2. Tải danh sách phiếu xuất
3. **Assert:** Hiện Toast/Alert: *"Không thể kết nối đến máy chủ. Vui lòng thử lại sau."*

---

## 5. Checklist Pass/Fail (Tổng hợp)

| Nhóm | Số TC | Mức độ ưu tiên |
|---|---|---|
| API Backend | 7 TC | 🔴 Critical |
| Danh sách (A) | 5 TC | 🔴 Critical |
| Tạo phiếu (B) | 6 TC | 🔴 Critical |
| Sửa phiếu (C) | 2 TC | 🟡 High |
| Chi tiết (D) | 5 TC | 🔴 Critical |
| Navigation UX (E) | 5 TC | 🟡 High |
| Full Flow E2E (F) | 1 TC | 🔴 Critical |
| Error Handling (G) | 3 TC | 🟡 High |
| **Tổng** | **34 TC** | |

> ✅ **Điều kiện DONE:** Tất cả 🔴 Critical TC đều PASS. Nhóm 🟡 High có thể có tối đa 1 Known Issue với ticket ghi lại.

---

## 6. Implementation Plan

1. **Chạy API Test trước** (TC-API-01 → TC-API-07) bằng Playwright `request` context hoặc Postman Collection.
2. **Chạy UI Test** theo từng nhóm (A → G) dùng Playwright MCP điều khiển trình duyệt.
3. **Viết file kết quả** tổng hợp: `docs/TEST_RESULT_T124.md` ghi rõ Pass/Fail, screenshot lỗi nếu có.
4. Nếu có TC thất bại (Fail): Ghi lại bug, tạo task bugfix và **không đánh dấu T124 DONE** cho đến khi toàn bộ Critical PASS.
