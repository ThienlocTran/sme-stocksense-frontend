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

## Module Kho Hàng (Warehouses)

### 1. Thông tin màn hình & Route
- **Route**: `/warehouses`
- **Màn hình**: [WarehousesView.vue](file:///d:/DATN_FE/src/views/WarehousesView.vue) - Hiển thị danh sách kho hàng và tích hợp Modal Form Thêm/Sửa kho hàng.
- **Service API**: [warehouseService.js](file:///d:/DATN_FE/src/services/warehouseService.js) - Xử lý gọi API đến backend:
  - `getWarehouses()`: `GET /api/warehouses` - Tải danh sách kho hàng.
  - `createWarehouse()`: `POST /api/warehouses` - Tạo kho hàng mới (yêu cầu mã kho, tên kho, địa chỉ, trạng thái).
  - `updateWarehouse()`: `PUT /api/warehouses/{id}` - Cập nhật thông tin kho (tên kho, địa chỉ, trạng thái).
- **Tùy chọn trạng thái**: [warehouseOptions.js](file:///d:/DATN_FE/src/constants/warehouseOptions.js) - Định nghĩa hằng số và nhãn cho trạng thái kho hàng.

### 2. Biểu mẫu Thêm/Sửa Kho Hàng (Forms & Validation)
- **Thêm kho hàng mới**:
  - Mã kho (`maKho`): Bắt buộc nhập, không trùng lặp, độ dài tối đa 50 ký tự.
  - Tên kho (`tenKho`): Bắt buộc nhập, độ dài tối đa 150 ký tự.
  - Địa chỉ (`diaChi`): Tùy chọn, tối đa 255 ký tự.
  - Trạng thái (`trangThai`): Mặc định là `HOAT_DONG`.
- **Chỉnh sửa kho hàng**:
  - **Khóa chỉnh sửa Mã kho (`maKho`)** để giữ tính toàn vẹn của dữ liệu và lịch sử các giao dịch nhập xuất tồn kho đã phát sinh.
  - Cho phép cập nhật: Tên kho (bắt buộc), Địa chỉ, Trạng thái (bắt buộc).

### 3. Phân quyền truy cập (Security UI)
- **Xem danh sách**: Admin/IT, Quản lý kho, Nhân viên kho đều được xem.
- **Thao tác quản trị** (Thêm kho, Sửa, Ngừng hoạt động): Chỉ có **Admin/IT** và **Quản lý kho** được phép thực hiện (nút thao tác sẽ bị vô hiệu hóa đối với Nhân viên kho).

### 3. Quy tắc nghiệp vụ (Business Rules)
- **Không xóa vật lý kho**: Bảo toàn dữ liệu lịch sử nhập/xuất/tồn kho. Thay vào đó, đổi trạng thái sang `NGUNG_HOAT_DONG`.
- **Mã kho không cho trùng**: Mỗi kho hàng phải có một mã định danh duy nhất.
- **Không cho sửa mã kho**: Để tránh ảnh hưởng đến tính toàn vẹn của dữ liệu chứng từ nhập/xuất/tồn kho đã phát sinh.

