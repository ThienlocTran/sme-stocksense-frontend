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

- Dat cac component dung chung trong `src/components`.
- Dat hinh anh, icon va asset lien quan trong `src/assets` hoac `public`.
- Su dung Axios cho cac request den backend.
- Su dung Pinia neu can quan ly state dung chung giua nhieu man hinh.

---

## Module Đối Tác (Partners) - Frontend UI (Task T51)

Màn hình quản lý đối tác được phát triển tại route `/partners` với các tính năng sau:
- **Trang chính**: `src/views/PartnerListView.vue`
- **Định tuyến (Routing)**: Cấu hình tại `src/router/index.js` (Route: `/partners`)
- **Quản lý trạng thái (State)**: Sử dụng Pinia Store `src/stores/auth.js` để lưu trữ mã token và vai trò người dùng phục vụ cho việc kiểm thử phân quyền UI.
- **Tính năng giao diện**:
  - Tìm kiếm động bằng ô nhập từ khóa (mã đối tác, tên, SĐT, v.v.).
  - Bộ lọc động theo loại đối tác (`NHA_CUNG_CAP`, `KHACH_HANG`, `CA_HAI`) và trạng thái (`HOAT_DONG`, `NGUNG_HOAT_DONG`).
  - Nút Xóa bộ lọc (`Reset Filters`).
  - Hộp thoại (Dialog) thông báo khi thao tác thêm/sửa đối tác được click (vì các tính năng này thuộc Task T52 tiếp theo).
- **Phân quyền giao diện (Security UI)**:
  - Chỉ hiển thị nút "Thêm đối tác" và cột "Thao tác" (chỉnh sửa, khóa/mở khóa) cho vai trò `ADMIN` hoặc `MANAGER`.
  - Tự động ẩn hoàn toàn các thành phần này đối với vai trò thủ kho (`EMPLOYEE`).
  - Tích hợp công cụ chuyển đổi vai trò test trực tiếp trên top header để nhà phát triển và người kiểm thử dễ dàng xác thực giao diện.
- **Tích hợp API & Cơ chế tự động fallback**:
  - Khi khởi chạy, màn hình sẽ gọi API thật qua Axios: `GET http://localhost:8080/api/partners`.
  - Nếu kết nối tới Backend thất bại (hoặc chưa đăng nhập/chưa có token), hệ thống sẽ hiển thị một banner thông báo màu vàng cảnh báo đang hoạt động ở chế độ mô phỏng, và tự động chuyển sang sử dụng bộ dữ liệu mock cục bộ (`mockPartners`) để đảm bảo trải nghiệm giao diện vẫn hoạt động mượt mà.

