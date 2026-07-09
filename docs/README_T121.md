# T121: UI Màn hình Danh sách Phiếu xuất (Export Receipt List)

## 1. Mục tiêu
- Xây dựng màn hình danh sách Phiếu xuất kho cho nhân viên kho (Employee) dựa trên API backend.
- Hỗ trợ xem danh sách, lọc, và thực hiện các thao tác (Xem, Sửa, Hủy, Gửi duyệt).
- Tích hợp theo chuẩn UI/UX của hệ thống (giống với Phiếu nhập).

## 2. Đặc tả Logic (Spec đã chốt)

### 2.1. Logic hiển thị Cột Action (Thao tác)
- Nút **Xem chi tiết** (View): Luôn luôn hiển thị cho mọi trạng thái.
- Nút **Sửa / Hủy / Gửi duyệt**: 
  - CHỈ xuất hiện (hoặc cho phép click) khi phiếu xuất ở trạng thái **NHÁP** hoặc **TỪ CHỐI**.
  - Các trạng thái khác (Chờ duyệt, Hoàn thành) sẽ tự động ẩn các nút này.

### 2.2. Logic hiển thị Cột Trạng thái (Status Badge)
Sử dụng component Badge chuẩn với màu sắc như sau:
- **Nháp (NHAP):** Màu Xám
- **Chờ quản lý duyệt (CHO_DUYET_CAP_1, CHO_DUYET_CAP_2):** Màu Cam / Vàng
- **Từ chối (TU_CHOI):** Màu Đỏ
- **Hủy (HUY):** Màu Xám / Đỏ nhạt
- **Hoàn thành (HOAN_THANH):** Màu Xanh lá
- *Nếu bị từ chối, hiển thị thêm Text "Lý do từ chối: ..." ngay bên dưới Badge.*

### 2.3. Logic Xác nhận (Confirm)
- Bất cứ khi nào user bấm nút **Hủy phiếu** hoặc **Gửi duyệt**, hệ thống bắt buộc phải **bật Modal/Dialog xác nhận** ("Bạn có chắc chắn muốn hủy/gửi duyệt phiếu này?").
- Chỉ khi user bấm "OK" trên Modal thì UI mới gọi API xuống Backend.
- Sau khi API trả về, hiển thị Toast (thông báo) Thành công hoặc Thất bại.

### 2.4. Logic Bộ lọc (Filter) và Tìm kiếm
Màn hình sẽ có một thanh Filter Bar bao gồm:
1. **Trạng thái:** Dropdown list (Tất cả, Nháp, Chờ duyệt...).
2. **Kho xuất:** Dropdown list danh sách các kho.
3. **Mã phiếu:** Text input để tìm kiếm theo mã.
4. **Thời gian tạo:** Date picker (Từ ngày - Đến ngày).

### 2.5. Luồng Điều Hướng (UX/UI Navigation)
- **Nút "Quay lại" (Back):** Bắt buộc có ở góc trên cùng (hoặc dạng Breadcrumb) trong các trang Tạo mới (T122), Sửa (T122), và Xem chi tiết (T120).
- **Giữ trạng thái Filter:** Khi bấm "Quay lại" từ trang Chi tiết về trang Danh sách, hệ thống sẽ cố gắng giữ nguyên Bộ lọc và Phân trang hiện tại (nếu thiết kế cho phép, hoặc dùng Vue Router query params để lưu state).
- **Điều hướng liền mạch:** Sau khi thực hiện hành động lớn thành công (Tạo phiếu mới, Gửi duyệt thành công), hệ thống tự động gọi router chuyển hướng (redirect) về lại màn hình Danh sách Phiếu xuất, kèm theo một Toast thông báo để báo hiệu luồng công việc đã hoàn tất.

## 3. Implementation Plan

- **API Integration:** Tạo file `src/services/exportReceiptService.js` chứa các hàm gọi API backend (`listMyReceipts`, `cancelDraft`, `submitForApproval`).
- **UI Component:** Bổ sung code render UI cho `type === 'out'` trong `StockDocumentsView.vue` (hoặc tách file nếu cần thiết để đảm bảo Clean Code). Tái sử dụng `DataTable`, `ConfirmDialog`.
