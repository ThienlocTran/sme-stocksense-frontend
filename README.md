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
