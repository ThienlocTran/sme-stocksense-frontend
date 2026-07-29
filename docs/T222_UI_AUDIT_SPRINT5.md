# Sprint 5 UI Audit

## 1. Mục tiêu

- Rà soát toàn bộ UI hiện tại của frontend hệ thống kho.
- Xác định phạm vi redesign hợp lý cho Sprint 5.
- Chốt hướng UI thống nhất để các task sau không phát sinh conflict về trải nghiệm.
- Tạo tài liệu chuẩn để làm căn cứ cho các task UI tiếp theo.

## 2. Hiện trạng UI

### Sidebar

- Điểm mạnh:
  - Cấu trúc menu đã rõ và có thể điều hướng được.
  - Đã có phân quyền cơ bản thông qua permission service.
- Điểm yếu:
  - Menu còn quá dài và chưa phân nhóm rõ theo nghiệp vụ.
  - Trạng thái active chưa đủ nổi bật về mặt trực quan.
  - Mobile layout chưa tối ưu cho thao tác nhanh.
- Kết luận:
  - Cần cải thiện về hierarchy và spacing, nhưng không cần đổi toàn bộ cấu trúc.

### Dashboard

- Điểm mạnh:
  - Có các block thông tin chính và các hành động nhanh.
  - UI có thể hiện được tình trạng vận hành tổng quan.
- Điểm yếu:
  - Các card và section còn khá rời rạc, chưa tạo cảm giác “summary dashboard” rõ ràng.
  - Một số trạng thái loading/error/empty chưa được đồng bộ.
- Kết luận:
  - Cần redesign nhẹ để tăng tính trực quan và nhất quán.

### Inventory

- Điểm mạnh:
  - Có bộ lọc, pagination và bảng dữ liệu đầy đủ.
  - Tương đối dễ dùng cho thao tác tra cứu.
- Điểm yếu:
  - Bảng dữ liệu quá “thô”, nhiều cột và scroll ngang gây khó đọc.
  - Filter và action chưa được nhóm gọn, cảm giác chưa tinh gọn.
  - Mobile experience còn yếu.
- Kết luận:
  - Là màn hình ưu tiên cao để redesign.

### Stock In

- Điểm mạnh:
  - Form và workflow chức năng đã đầy đủ.
  - Có trạng thái alert và validation cơ bản.
- Điểm yếu:
  - Form quá dài, các section chưa được tối ưu cho thao tác nhanh.
  - Khoảng cách và visual hierarchy chưa thật sự rõ.
  - Empty state và action area còn chưa đủ rõ ràng.
- Kết luận:
  - Cần redesign để giảm cognitive load và tăng tốc thao tác.

### Stock Out

- Điểm mạnh:
  - Workflow có cấu trúc logic khá rõ.
  - Có thể dùng chung nhiều pattern với Stock In.
- Điểm yếu:
  - Trình bày vẫn còn “function-first” hơn là “user-first”.
  - Các action và trạng thái cần được làm nổi bật hơn.
- Kết luận:
  - Cần redesign nhẹ, ưu tiên theo hướng thống nhất với Stock In.

### Alerts

- Điểm mạnh:
  - Dữ liệu cảnh báo có thể hiển thị được rõ.
  - Có filter và bảng dữ liệu cơ bản.
- Điểm yếu:
  - Mức độ ưu tiên cảnh báo chưa được làm nổi bật đủ.
  - Table/list hiện tại chưa tốt cho việc scan nhanh.
- Kết luận:
  - Cần redesign nhẹ, ưu tiên cao.

### Profile

- Hiện trạng:
  - Không có màn hình Profile riêng trong frontend hiện tại.
- Kết luận:
  - Không nằm trong scope redesign Sprint 5.

## 3. Component tái sử dụng

Các component hiện tại có thể tiếp tục dùng và nên giữ nguyên cấu trúc logic:

- PageHeader
- DataTable
- EmptyState
- StatusBadge
- SearchFilterBar
- ConfirmDialog

Các component này có giá trị cao về tái sử dụng và nên được cải tiến về style và consistency, nhưng không nên thay đổi logic nghiệp vụ của chúng.

## 4. Component cần cải tiến

### Cần cải tiến mạnh

- Sidebar
- Topbar
- Dashboard cards/section layout
- Inventory table/filter layout
- Stock In / Stock Out form layout
- Alerts list presentation
- Empty state và error state đồng bộ hơn

### Cần cải tiến nhẹ

- Badge visual consistency
- Button hierarchy
- Loading states
- Typography scale
- Spacing giữa các section

## 5. Danh sách màn cần redesign

| Màn hình             | Priority | Lý do                                                                 | Task liên quan |
| -------------------- | -------- | --------------------------------------------------------------------- | -------------- |
| Inventory            | P1       | Bảng dữ liệu và filter đang quá nặng, khó scan trên desktop và mobile | T225           |
| Stock In             | P1       | Workflow chính, form dài và chưa tối ưu cho thao tác nhanh            | T226           |
| Stock Out            | P1       | Cần thống nhất với Stock In và làm rõ hành động chính                 | T227           |
| Alerts               | P1       | Cần làm nổi bật mức độ cảnh báo và ưu tiên scan nhanh                 | T228           |
| Dashboard            | P2       | Cần tăng khả năng đọc tổng quan và sự nhất quán giữa các block        | T223           |
| Sidebar / Navigation | P2       | Cần cải thiện hierarchy và trải nghiệm điều hướng                     | T224           |
| Pending Approvals    | P2       | Cần làm rõ trạng thái và hành động chính trên list/detail             | T229           |
| Shared UI components | P2       | Cần chuẩn hóa style chung cho các task UI tiếp theo                   | T230           |

## 6. Danh sách màn KHÔNG redesign

- Login / auth flow
- Profile (không có màn hình riêng)
- Permission logic
- Business workflow logic
- API integration
- Data model và service layer

## 7. Design Rules

### Spacing

- Dùng spacing thống nhất giữa section, card, row và button.
- Khoảng cách giữa title, subtitle, action và content phải rõ ràng.
- Mobile cần có spacing nhỏ hơn nhưng vẫn đủ tách biệt.

### Button hierarchy

- Chỉ có một action chính nổi bật trên mỗi màn hoặc section.
- Secondary action cần có mức độ nổi bật thấp hơn.
- Action nguy hiểm như cancel/delete phải dễ nhận diện nhưng không quá mạnh.

### Typography

- Heading nên có hierarchy rõ: page title, section title, label, helper text.
- Tránh dùng quá nhiều font weight và size khác nhau trong cùng một màn.
- Text quan trọng phải dễ scan.

### Badge

- Badge dùng để biểu thị trạng thái và mức độ ưu tiên.
- Màu sắc phải nhất quán và dễ phân biệt.
- Không dùng quá nhiều màu cho cùng một loại trạng thái.

### Empty state

- Empty state phải có ngữ cảnh rõ ràng theo từng màn.
- Nên có hướng dẫn hành động tiếp theo nếu có thể.

### Loading

- Loading state phải có độ nhất quán giữa list, form và detail.
- Không nên để màn hình trơ hoặc quá lâu mà không có phản hồi.

### Error state

- Error state cần rõ ràng: lỗi tải dữ liệu, lỗi validate, lỗi thao tác.
- Nên có hành động tiếp theo rõ ràng như thử lại hoặc quay lại.

## 8. Scope Sprint 5

### Task được phép chỉnh

- T223
- T224
- T225
- T226
- T227
- T228
- T229
- T230

### Task không được đụng

- Không thay đổi business logic.
- Không sửa API.
- Không đổi permission.
- Không thay đổi workflow nghiệp vụ.
- Không thay đổi logic lưu trữ, tính toán, hay quy trình duyệt.

## 9. Kết luận

Sprint 5 nên tập trung vào redesign UI/UX nhẹ nhưng có hệ thống cho các màn chính của hệ thống kho. Ưu tiên cao là Inventory, Stock In, Stock Out và Alerts. Các task UI trong Sprint 5 có thể dùng tài liệu này làm chuẩn để đảm bảo trải nghiệm thống nhất, không mâu thuẫn với Sprint trước và không vượt quá phạm vi UI/UX.
