# 🚚 Trang Hòa Limousine - Hệ Thống Quản Lý Vận Tải

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.7-FFCA28?style=flat&logo=firebase)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat&logo=vite)
![Tests](https://img.shields.io/badge/Tests-32%20passed-success?style=flat)

Hệ thống quản lý hàng hóa vận chuyển cho **Trang Hòa Limousine**, số hóa quy trình gửi nhận hàng giữa các trạm **Hà Tĩnh (HT)**, **Phan Anh (PA)**, **Sài Gòn (SG)**.

<!-- TODO: Thêm screenshot/demo GIF khi có -->
<!-- ![Demo Screenshot](public/img/demo-screenshot.png) -->

---

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd TrangHoaMgmt

# 2. Cài đặt dependencies
npm install
cd functions && npm install && cd ..

# 3. Cấu hình Firebase (tạo file .env)
cp .env.example .env
# Điền Firebase config từ Firebase Console

# 4. Chạy development server
npm run dev
# → App chạy tại http://localhost:3000
```

---

## ✨ Tính năng chính

| Chức năng | Mô tả |
|-----------|-------|
| 📦 **Quản lý đơn hàng** | Tạo, sửa, xóa phiếu gửi hàng với mã đơn tự động (VD1234) |
| 📊 **Dashboard** | Thống kê KPI: tổng đơn, doanh thu, cước chưa thu, biểu đồ theo trạm |
| 👥 **Quản lý nhân viên** | Admin cấp/xóa tài khoản qua Cloud Functions |
| 🔐 **Bảo mật RBAC** | Phân quyền 3 cấp: STAFF, MANAGER, ADMIN |
| 💰 **Theo dõi cước phí** | Trạng thái "Đã thu" / "Chưa thu" + danh sách nợ |
| 🖨️ **Báo cáo** | Bảng kê theo ngày, xuất CSV, in PDF |
| 📱 **Responsive** | Tối ưu cho cả Mobile (bottom nav) và Desktop (sidebar) |

---

## 🏗️ Tech Stack

| Layer | Công nghệ | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | 19.2 / 5.8 |
| **Routing** | React Router DOM (HashRouter) | 7.12 |
| **UI** | Tailwind CSS (CDN) + Lucide Icons | Latest |
| **Charts** | Recharts | 3.6 |
| **Build** | Vite | 6.2 |
| **Auth** | Firebase Authentication | 12.7 |
| **Database** | Cloud Firestore | 12.7 |
| **Functions** | Firebase Cloud Functions | 4.3 |
| **Testing** | Vitest + Testing Library | Latest |

---

## 📁 Cấu trúc dự án

```
TrangHoaMgmt/
├── index.html              # Entry HTML + Tailwind CDN
├── index.tsx               # React entry point
├── App.tsx                 # Root component + Router + Auth
├── types.ts                # TypeScript interfaces & enums
├── vite.config.ts          # Vite configuration
├── vitest.config.ts        # Vitest test configuration
├── tsconfig.json           # TypeScript config
├── firebase.json           # Firebase project config
├── .firebaserc             # Firebase project aliases
├── .env                    # Environment variables (tự tạo)
│
├── components/
│   ├── Login.tsx           # Đăng nhập 2 bước: Auth → Chọn trạm
│   ├── Layout.tsx          # Sidebar (desktop) + Bottom nav (mobile)
│   ├── Dashboard.tsx       # KPI cards + Bar charts
│   ├── OrderForm.tsx       # Form tạo/sửa đơn hàng
│   ├── OrderList.tsx       # Danh sách + filter (ngày/trạm/cước)
│   ├── OrderDetail.tsx     # Chi tiết đơn hàng
│   ├── Reports.tsx         # Báo cáo ngày, xuất CSV, in
│   └── EmployeeManagement.tsx  # CRUD nhân viên (Admin only)
│
├── services/
│   ├── firebase.ts         # Khởi tạo Firebase App
│   └── dataService.ts      # Business logic: Auth, Orders, Employees
│
├── functions/              # Firebase Cloud Functions
│   ├── index.js            # registerEmployee, deleteEmployee
│   └── package.json
│
├── tests/                  # Test suites (32 tests)
│   ├── setup.ts            # Test config, mocks
│   ├── security.test.ts    # Security tests (10)
│   ├── business-logic.test.ts  # Business logic tests (15)
│   ├── integration.test.ts # Integration tests (7)
│   └── README.md           # Test documentation
│
├── public/img/             # Logo, images
└── dist/                   # Production build output
```

---

## 👤 Phân quyền hệ thống (RBAC)

| Quyền | STAFF | MANAGER | ADMIN |
|-------|:-----:|:-------:|:-----:|
| Xem Dashboard & thống kê | ✅ | ✅ | ✅ |
| Xem danh sách đơn hàng | ✅ | ✅ | ✅ |
| Tạo đơn hàng mới | ✅ | ✅ | ✅ |
| Sửa đơn hàng (cùng ngày, của mình) | ✅ | ✅ | ✅ |
| Sửa đơn hàng (mọi lúc) | ❌ | ✅ | ✅ |
| Xóa đơn hàng | ❌ | ❌ | ✅ |
| Xem báo cáo & xuất CSV | ✅ | ✅ | ✅ |
| Quản lý nhân viên (CRUD) | ❌ | ❌ | ✅ |

**Logic sửa đơn:**
- **STAFF**: Chỉ sửa được đơn **của mình** và tạo trong **cùng ngày**
- **MANAGER/ADMIN**: Sửa được mọi đơn, mọi lúc

---

## ⚙️ Cấu hình

### Biến môi trường (`.env`)

Tạo file `.env` trong thư mục gốc:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> Lấy config từ **Firebase Console → Project Settings → Your apps**

### Deploy Firebase

```bash
# Đăng nhập Firebase
firebase login

# Liên kết với project
firebase use --add

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore Rules
firebase deploy --only firestore:rules
```

---

## 📜 NPM Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Chạy dev server tại port 3000 |
| `npm run build` | Build production → `dist/` |
| `npm run preview` | Preview bản build locally |
| `npm test` | Chạy tests (watch mode) |
| `npm run test:ui` | Chạy tests với Vitest UI |
| `npm run test:coverage` | Chạy tests với coverage report |

---

## 🧪 Testing

Dự án có **32 tests** chia thành 3 suites:

| Suite | Tests | Mô tả |
|-------|:-----:|-------|
| Security | 10 | Kiểm tra các bản vá bảo mật |
| Business Logic | 15 | Kiểm tra logic nghiệp vụ |
| Integration | 7 | Kiểm tra luồng hoạt động |

```bash
# Chạy tất cả tests
npm test

# Chạy 1 lần (CI mode)
npx vitest run

# Xem UI
npm run test:ui
```

Chi tiết: [tests/README.md](tests/README.md)

---

## 🛡️ Bảo mật

Dự án đã được rà soát theo **OWASP Top 10** và áp dụng các biện pháp:

- ✅ Firebase Auth cho authentication
- ✅ Firestore Rules cho authorization (RBAC)
- ✅ Cloud Functions cho sensitive operations
- ✅ Input validation ở cả client và server
- ✅ Role verification từ Firestore (không tin client)
- ✅ Ownership check cho order editing

📄 **Chi tiết kiến trúc bảo mật:** [Security.md](Security.md)

---

## 🐛 Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| "Chưa đăng nhập" khi gọi Functions | Region không khớp | Kiểm tra `asia-southeast1` trong `dataService.ts` |
| "Permission denied" Firestore | Rules chưa deploy | `firebase deploy --only firestore:rules` |
| "Không tìm thấy phân quyền" | Thiếu document `accounts/{uid}` | Tạo document thủ công trong Firestore Console |
| Cloud Functions deploy fail | Node.js version sai | Cần Node.js >= 18 |

---

## 📝 Ghi chú

### Email đăng nhập
- Nhập `admin` → tự động thành `admin@tranghoa.com`
- Hoặc nhập email đầy đủ: `admin@tranghoa.com`

### HashRouter
App sử dụng `HashRouter` (URL dạng `/#/orders`):
- ✅ Hoạt động tốt với static hosting
- ✅ Không lỗi 404 khi refresh trang

### Mã đơn hàng
Sinh tự động dạng `VD1234` → `VD9999`

---

## 🤝 Contributing

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit changes: `git commit -m "Add: mô tả"`
4. Push branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## 📄 License

Dự án nội bộ - **Trang Hòa Limousine**

---

**Cập nhật lần cuối:** 21/01/2026
