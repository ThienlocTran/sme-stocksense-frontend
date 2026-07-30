# ExportReceipt Model - Phiếu xuất nhân viên (Frontend)

## Goal
Hoàn thiện giao diện quản lý phiếu xuất kho cho nhân viên (danh sách, tạo/sửa form) và tích hợp các API tạo/sửa/gửi duyệt/hủy, áp dụng chiến lược Stacked Branches.

## Tasks
### Cụm 4: UI & Integration (Branch: `feature/cluster-4-export-receipt-ui`)
- [ ] Task 1 (T121): Tạo UI màn hình danh sách phiếu xuất của nhân viên. Hiển thị thông tin mã, kho, trạng thái và các action phù hợp với trạng thái (Sửa/Gửi/Hủy). → Verify: Màn hình render danh sách đúng và ẩn/hiện action đúng logic.
- [ ] Task 2 (T122): Tạo form tạo/sửa phiếu xuất. Hỗ trợ chọn kho, thêm sản phẩm chi tiết, validate tồn hiện tại. → Verify: Form render đúng, validate local hoạt động.
- [ ] Task 3 (T123): Tích hợp gọi API lưu nháp, cập nhật, gửi duyệt, hủy. Xử lý thông báo (toast). → Verify: Thao tác UI gọi API thành công và refresh dữ liệu màn hình.

### Cụm 5: E2E Testing (Branch: `feature/cluster-5-export-receipt-testing`)
- [ ] Task 4 (T124): Test luồng end-to-end cho nhân viên kho (tạo nháp -> gửi duyệt cấp 1). → Verify: Flow nhân viên kho hoàn chỉnh, không lỗi UI.

## Done When
- [ ] Màn hình danh sách phiếu xuất hoạt động bình thường.
- [ ] Màn hình chi tiết/thêm mới phiếu xuất cho phép thao tác lưu/gửi duyệt/hủy mà không bị lỗi.
- [ ] Tích hợp mượt mà với Backend API.

## Notes
- Các action (Sửa/Hủy/Gửi duyệt) chỉ xuất hiện khi phiếu ở trạng thái "Nháp" hoặc "Từ chối".
- Giao diện cần tuân thủ design guideline chung của hệ thống.
- Các branch cần được tạo tiếp nối từ nhánh FE chuẩn bị trước đó.
