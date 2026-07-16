# T122: Form Tạo/Sửa Phiếu Xuất Kho (Export Receipt Form)

## 1. Mục tiêu
- Xây dựng màn hình Form dùng chung cho cả 2 chức năng: **Tạo mới phiếu xuất nháp** và **Chỉnh sửa phiếu xuất nháp**.
- Tách biệt hoàn toàn code với luồng Nhập kho để đảm bảo Clean Code và tuân thủ `project-conventions.md`.

## 2. Đặc tả Logic (Spec đã chốt)

### 2.1. Thông tin chung (Header)
- Form yêu cầu 2 trường thông tin chính ở phần Header:
  - **Kho xuất (Bắt buộc):** Dropdown chọn kho lấy hàng đi.
  - **Ghi chú (Tùy chọn):** Textarea nhập lý do xuất kho (xuất tiêu hao, xuất nội bộ, v.v.).
- Không yêu cầu bắt buộc chọn Khách hàng/Đối tác.

### 2.2. Logic Chọn Sản Phẩm & Validate Tồn Kho (Client-side)
- **Select Sản phẩm:**
  - **Chế độ Tạo mới:** Dropdown chỉ hiển thị sản phẩm đang có Tồn kho > 0 tại Kho xuất đã chọn.
  - **Chế độ Sửa phiếu nháp:** Phải giữ lại các dòng sản phẩm đã chọn trong phiếu, kể cả khi tồn kho của chúng đã về 0 (tránh mất dữ liệu người dùng). Chỉ lọc “> 0” khi thêm mới thêm dòng.
- *(Cần gọi API lấy Inventory theo WarehouseId để biết số tồn kho hiện tại).*
- **Validate Số lượng xuất:**
  - **Client-side (Real-time):** Khi user nhập số lượng xuất, hệ thống kiểm tra ngay lập tức. Nếu `Số lượng xuất > Số lượng tồn kho` -> Lập tức hiển thị viền đỏ và dòng cảnh báo lỗi bên dưới ô input. Vô hiệu hóa nút Lưu.
  - **Server-side (Bắt buộc):** Client-side validate chưa đủ, tồn kho có thể thay đổi giữa lúc load form và lúc bấm Lưu. Backend **bắt buộc phải re-check tồn kho (hoặc sử dụng Optimistic Lock)** trước khi lưu/duyệt để đảm bảo toàn vẹn dữ liệu.

### 2.3. Logic Thay đổi Kho xuất (Warehouse Change)
- Do mỗi kho có số lượng tồn kho khác nhau, việc đổi Kho xuất khi đang tạo/sửa phiếu sẽ làm sai lệch dữ liệu sản phẩm đã chọn.
- **Quy tắc:** Khi user đổi sang một Kho xuất khác, hệ thống sẽ **bật Popup cảnh báo**: *"Việc thay đổi kho sẽ làm xóa trắng danh sách sản phẩm bạn đã chọn bên dưới. Bạn có chắc chắn muốn đổi không?"*
- Nếu bấm OK: Xóa sạch danh sách sản phẩm đã chọn, cập nhật Kho mới.

### 2.4. Luồng Điều Hướng (UX/UI Navigation) - Kế thừa từ T121
- Có nút **"Quay lại" (Back)** ở góc trên để trở về danh sách phiếu xuất.
- Sau khi bấm "Lưu nháp" hoặc "Lưu và Gửi duyệt" thành công, hệ thống hiện Toast thông báo, sau đó **Tự động chuyển hướng (Redirect)** về màn hình Danh sách Phiếu xuất (`/stock-out`).

## 3. Kiến trúc Component
- Tạo file mới: `src/components/ExportReceiptForm.vue`.
- Cập nhật `src/views/StockDocumentCreateView.vue` để gọi `<ExportReceiptForm />` khi `type === 'out'`, hoàn toàn độc lập với `<ImportReceiptForm />`.

## 4. Cấu trúc JSON Request (API)
Gửi payload tạo/sửa lên Backend:
```json
{
  "warehouseId": 1,
  "note": "Xuất vật tư thi công",
  "details": [
    {
      "productId": 101,
      "quantity": 5,
      "note": "Xuất cho công trình A"
    }
  ]
}
```

---
*Vui lòng phản hồi "Chốt Plan" nếu bạn đồng ý với đặc tả trên để tôi tiến hành đập code.*
