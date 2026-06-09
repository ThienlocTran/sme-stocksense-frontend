# SME StockSense Frontend

Frontend cho du an SME StockSense, duoc xay dung bang Vue 3 va Vite.

## Cong nghe su dung

- Vue 3
- Vite
- Vuetify
- Tailwind CSS
- Pinia
- Vue Router
- Axios
- ApexCharts / Vue3 ApexCharts

## Yeu cau moi truong

- Node.js 20 tro len
- npm

Kiem tra phien ban:

```bash
node -v
npm -v
```

## Cai dat

Di chuyen vao thu muc frontend:

```bash
cd sme-stocksense-frontend
```

Cai dat dependencies:

```bash
npm install
```

## Chay moi truong phat trien

```bash
npm run dev
```

Sau khi chay thanh cong, mo dia chi Vite hien thi tren terminal, thuong la:

```text
http://localhost:5173
```

## Build production

```bash
npm run build
```

Thu muc build se duoc tao tai:

```text
dist/
```

## Xem truoc ban build

```bash
npm run preview
```

## Cau truc thu muc

```text
sme-stocksense-frontend/
|-- public/              # Static assets
|-- src/
|   |-- assets/          # Hinh anh va tai nguyen frontend
|   |-- components/      # Vue components
|   |-- App.vue          # Component goc
|   |-- main.js          # Entry point cua ung dung
|   `-- style.css        # Global styles
|-- index.html
|-- package.json
`-- vite.config.js
```

## Scripts

| Lenh | Mo ta |
| --- | --- |
| `npm run dev` | Chay ung dung o che do development |
| `npm run build` | Build ung dung cho production |
| `npm run preview` | Chay preview tu ban build production |

## Ghi chu phat trien

- Dat cac component dung chung trong `src/components`.
- Dat hinh anh, icon va asset lien quan trong `src/assets` hoac `public`.
- Su dung Axios cho cac request den backend.
- Su dung Pinia neu can quan ly state dung chung giua nhieu man hinh.

---

## Module Đối Tác (Partners) - Frontend UI (Task T51 & T52)

Màn hình quản lý đối tác được phát triển tại route `/partners` với các tính năng sau:
- **Trang chính**: `src/views/PartnerListView.vue`
- **Form Thêm/Sửa đối tác (Task T52)**: `src/components/PartnerForm.vue`
- **Định tuyến (Routing)**: Cấu hình tại `src/router/index.js` (Route: `/partners`)
- **Quản lý trạng thái (State)**: Sử dụng Pinia Store `src/stores/auth.js` để lưu trữ mã token và vai trò người dùng phục vụ cho việc kiểm thử phân quyền UI.
- **Tính năng giao diện & Form (Task T52)**:
  - Nút "Thêm đối tác" mở form đối tác trống.
  - Nút "Chỉnh sửa" (biểu tượng bút chì) mở form đối tác điền sẵn thông tin cũ.
  - Dropdown lựa chọn loại đối tác gồm 3 giá trị hợp lệ: `NHA_CUNG_CAP` (Nhà cung cấp), `KHACH_HANG` (Khách hàng), và `CA_HAI` (Cả hai) theo đúng quy định của Backend.
  - Validate bắt buộc nhập **Tên đối tác** và **Loại đối tác**.
  - Validate định dạng **Email** (chỉ kiểm tra nếu có nhập dữ liệu).
  - Tự động hiển thị thông báo lỗi validate chi tiết dưới mỗi trường input nếu dữ liệu không hợp lệ.
  - Lưu thành công sẽ kích hoạt hiển thị Toast thông báo và tự động tải lại danh sách đối tác.
  - Chức năng tìm kiếm động và bộ lọc đối tác nâng cao (theo loại và trạng thái).
- **Phân quyền giao diện (Security UI)**:
  - Chỉ hiển thị nút "Thêm đối tác" và các thao tác chỉnh sửa, đổi trạng thái cho vai trò `ADMIN` hoặc `MANAGER`.
  - Ẩn hoàn toàn các thành phần thay đổi dữ liệu đối với vai trò thủ kho (`EMPLOYEE`) để chuyển sang chế độ chỉ xem thông tin.
  - Hộp chọn nhanh vai trò kiểm thử trên Header giúp thay đổi phân quyền động dễ dàng.
- **Tích hợp API & Cơ chế tự động fallback**:
  - Giao diện kết nối thực tế tới Backend:
    - `GET http://localhost:8080/api/partners` (Lấy danh sách đối tác).
    - `POST http://localhost:8080/api/partners` (Tạo mới đối tác).
    - `PUT http://localhost:8080/api/partners/{id}` (Cập nhật đối tác / Đổi trạng thái).
  - Tự động map lỗi validate trả về từ máy chủ (`400 Bad Request`) lên trực tiếp giao diện form input.
  - Nếu kết nối tới Backend thất bại, hệ thống tự động fallback sử dụng dữ liệu mô phỏng (`mockPartners`) và thực hiện thêm/sửa/đổi trạng thái giả lập trên bộ nhớ cục bộ để đảm bảo trải nghiệm giao diện xuyên suốt.


