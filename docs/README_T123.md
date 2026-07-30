# T123: Màn hình Chi tiết Phiếu Xuất Kho (Export Receipt Detail) & Tích hợp Action

## 1. Mục tiêu
- Xây dựng giao diện xem chi tiết Phiếu xuất kho (Readonly mode).
- Cho phép nhân viên thực hiện các thao tác (Sửa, Hủy, Gửi duyệt) trực tiếp từ bên trong màn hình chi tiết mà không cần quay ra màn hình Danh sách.
- Thiết kế component độc lập, tuân thủ `project-conventions.md` và Taste Skills.

## 2. Đặc tả Logic (Spec đã chốt)

### 2.1. Kiến trúc Component
- Tạo file mới: `src/components/ExportReceiptDetailPanel.vue`.
- Cập nhật `src/views/StockDocumentDetailView.vue` để gọi `<ExportReceiptDetailPanel />` khi `type === 'out'`, hoàn toàn độc lập với luồng Nhập kho (`ImportInspectionPanel.vue`).

### 2.2. Giao diện (UI/UX)
- **Header:** Hiển thị Mã phiếu, Trạng thái (Badge màu theo chuẩn của danh sách), Kho xuất, Ghi chú, Ngày tạo, Người tạo.
- **Danh sách sản phẩm:** Bảng (DataTable) hiển thị Mã SP, Tên SP, ĐVT, Số lượng xuất, Ghi chú. (Không cho phép edit trực tiếp tại đây).
- **Thanh Action (Góc trên):**
  - **Nút "In Phiếu Xuất"**: Luôn hiển thị. Click vào báo Toast "Chức năng In PDF đang được phát triển".
  - **Nút "Sửa"**: Hiển thị nếu trạng thái NHÁP hoặc TỪ CHỐI. (Chuyển hướng sang trang Edit).
  - **Nút "Gửi duyệt" / "Hủy"**: Hiển thị nếu trạng thái NHÁP hoặc TỪ CHỐI (Hủy chỉ cho phép ở NHÁP). Kèm Popup Confirm an toàn.

### 2.3. Logic Reload Data (Sau khi thao tác)
- Khi user thao tác "Gửi duyệt" hoặc "Hủy" ngay trong màn hình chi tiết, hệ thống sẽ:
  1. Hiển thị Toast thông báo thành công/thất bại.
  2. **Tự động gọi lại API `getExportReceiptDetails`** để làm mới dữ liệu của chính màn hình đó (chứ không chuyển hướng văng ra List).
  3. Cập nhật Badge Trạng thái và tự động ẩn các nút action (Sửa/Gửi/Hủy) vì phiếu không còn ở trạng thái cho phép thao tác nữa.

### 2.4. Luồng Điều Hướng (Navigation)
- Phải có nút **Quay lại (Back)** giống Form T122 để user trở về Danh sách Phiếu xuất dễ dàng.
- Kế thừa toàn bộ Micro-animations, Transitions chuẩn Premium từ quy tắc `@design-taste-frontend` được định nghĩa trong Memory.

## 3. Cấu trúc JSON Response (API)
Payload Backend trả về (Tái sử dụng API T120):
```json
{
  "id": 1,
  "code": "PXK-001",
  "warehouseId": 2,
  "warehouseName": "Kho vật liệu",
  "status": "NHAP",
  "note": "Xuất thử nghiệm",
  "rejectionReason": null,
  "createdAt": "2026-05-25T10:00:00",
  "createdBy": "emp01",
  "details": [
    {
      "productId": 101,
      "productCode": "SP01",
      "productName": "Sắt phi 10",
      "unitName": "Cây",
      "quantity": 50,
      "note": ""
    }
  ]
}
```

---
*Vui lòng phản hồi "Chốt Plan" nếu bạn đồng ý với đặc tả trên để tôi tiến hành đập code.*
