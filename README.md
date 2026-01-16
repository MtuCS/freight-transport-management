# 🚚 Hệ Thống Quản Lý Vận Tải Trang Hòa Limousine

## 📋 Giới thiệu

Hệ thống quản lý hàng hóa vận chuyển cho **Trang Hòa Limousine**, số hóa toàn bộ quy trình gửi nhận hàng giữa các trạm **HT** (Hà Tĩnh), **PA** (Phan Anh), **SG** (Sài Gòn). Ứng dụng được xây dựng theo mô hình **Single Page Application (SPA)** với kiến trúc bảo mật cao sử dụng **Firebase Authentication** kết hợp **Cloud Functions**.

### ✨ Tính năng chính

| Chức năng | Mô tả |
|-----------|-------|
| 📦 **Quản lý đơn hàng** | Tạo, sửa, xóa phiếu gửi hàng với mã đơn tự động |
| 📊 **Dashboard tổng quan** | Thống kê KPI: tổng đơn, doanh thu thực thu, cước chưa thu, biểu đồ theo trạm |
| 👥 **Quản lý nhân viên** | Admin cấp/xóa tài khoản qua Cloud Functions (không bị logout) |
| 🔐 **Bảo mật RBAC** | Firebase Auth + Firestore Rules + Cloud Functions |
| 🎯 **Phân quyền 3 cấp** | STAFF, MANAGER, ADMIN với quyền hạn khác nhau |
| 💰 **Theo dõi cước phí** | Trạng thái "Đã thu" / "Chưa thu" + danh sách nợ |
| 🖨️ **Báo cáo & In ấn** | Bảng kê hàng hóa theo ngày, xuất CSV, in PDF |
| 📱 **Responsive UI** | Tối ưu cho cả Mobile (bottom nav) và Desktop (sidebar) |

---

## 🏗️ Kiến trúc hệ thống

### Tech Stack

| Layer | Công nghệ | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | 19.2.3 / 5.8.2 |
| **Routing** | React Router DOM (HashRouter) | 7.12.0 |
| **Charts** | Recharts | 3.6.0 |
| **Icons** | Lucide React | 0.562.0 |
| **Styling** | Tailwind CSS (CDN) | Latest |
| **Build** | Vite | 6.2.0 |
| **Auth** | Firebase Authentication | 12.7.0 |
| **Database** | Cloud Firestore | 12.7.0 |
| **Functions** | Firebase Cloud Functions (Node.js 18) | 4.3.1 |
| **Region** | `asia-southeast1` | - |

> **Lưu ý:** App sử dụng `HashRouter` (URL dạng `/#/path`) để tương thích tốt với static hosting và tránh lỗi 404 khi refresh trang.

### Cấu trúc thư mục

```
TrangHoaMgmt/
├── index.html              # Entry HTML + Tailwind CDN + importmap
├── index.tsx               # React entry point
├── App.tsx                 # Root component + Router + Auth state
├── types.ts                # TypeScript interfaces & enums
│
├── components/
│   ├── Login.tsx           # 2-step login: Auth → Chọn trạm
│   ├── Layout.tsx          # Sidebar (desktop) + Bottom nav (mobile)
│   ├── Dashboard.tsx       # KPI cards + Bar charts (Recharts)
│   ├── OrderForm.tsx       # Form tạo/sửa đơn hàng
│   ├── OrderList.tsx       # Danh sách + filter (ngày/trạm/cước)
│   ├── Reports.tsx         # Báo cáo ngày, xuất CSV, in
│   └── EmployeeManagement.tsx  # CRUD nhân viên (Admin only)
│
├── services/
│   ├── firebase.ts         # Khởi tạo Firebase App (env vars)
│   └── dataService.ts      # Business logic: Auth, Orders, Employees
│
├── functions/
│   ├── index.js            # Cloud Functions: registerEmployee, deleteEmployee
│   └── package.json        # Dependencies: firebase-admin, firebase-functions
│
├── public/
│   └── img/                # Logo, background, promotional images
│
├── vite.config.ts          # Vite: port 3000, path alias @/
├── tsconfig.json           # TypeScript config
├── firebase.json           # Firebase: functions source, emulators
├── package.json            # Frontend dependencies & scripts
└── .env                    # (Tự tạo) Biến môi trường Firebase
```

---

## 🔐 Kiến trúc bảo mật

### 1. Luồng xác thực (Authentication Flow)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Login.tsx  │────▶│  Firebase Auth   │────▶│ Firestore       │
│  (Email/Pw) │     │  signInWith...   │     │ accounts/{uid}  │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                    │                        │
       │                    ▼                        ▼
       │              JWT Token               Account Profile
       │                    │                  (role, name)
       ▼                    ▼                        │
┌─────────────┐     ┌──────────────────┐            │
│ Chọn Trạm   │────▶│  localStorage    │◀───────────┘
│ (HT/PA/SG)  │     │  (chỉ station)   │
└─────────────┘     └──────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  App.tsx verify  │
                    │  onAuthStateChanged
                    │  → getAccountProfile
                    └──────────────────┘
```

**Chi tiết:**
1. User nhập email + password (hoặc username → auto thêm `@tranghoa.com`)
2. Firebase Auth xác thực, trả về `uid`
3. Lấy thông tin phân quyền từ Firestore `accounts/{uid}` (role, name, email)
4. User chọn trạm làm việc (HT/PA/SG)
5. Lưu **chỉ station** vào `localStorage` (role KHÔNG được tin từ localStorage)
6. **App.tsx** sử dụng `onAuthStateChanged` để verify auth state và lấy role từ Firestore

### 2. Cloud Functions (Server-side Operations)

Các thao tác nhạy cảm được xử lý ở backend để đảm bảo bảo mật:

#### `registerEmployee` - Tạo nhân viên mới

```javascript
exports.registerEmployee = functions
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // 1. Kiểm tra đã đăng nhập
    if (!context.auth) throw new HttpsError('unauthenticated');
    
    // 2. Kiểm tra quyền ADMIN
    const adminDoc = await admin.firestore()
      .collection('accounts').doc(context.auth.uid).get();
    if (adminDoc.data().role !== 'ADMIN') 
      throw new HttpsError('permission-denied');
    
    // 3. Tạo user trong Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.name
    });
    
    // 4. Tạo profile trong Firestore
    await admin.firestore().collection('accounts')
      .doc(userRecord.uid).set({
        email: data.email,
        name: data.name,
        username: data.username,
        role: data.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return { success: true, uid: userRecord.uid };
  });
```

**Lợi ích:** Admin tạo tài khoản cho nhân viên mà **không bị logout** khỏi phiên của chính mình (vì sử dụng Admin SDK ở server).

#### `deleteEmployee` - Xóa nhân viên

```javascript
exports.deleteEmployee = functions
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // Verify Admin → Delete Auth user → Delete Firestore profile
  });
```

### 3. Firestore Security Rules (RBAC)

Quy tắc bảo mật cần cấu hình trong **Firebase Console → Firestore → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Lấy role của user hiện tại
    function getRole() {
      return get(/databases/$(database)/documents/accounts/$(request.auth.uid)).data.role;
    }
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && getRole() == 'ADMIN';
    }

    // Collection: accounts (Chỉ ADMIN được ghi)
    match /accounts/{uid} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }

    // Collection: orders
    match /orders/{orderId} {
      // Tất cả user xác thực được đọc và tạo
      allow read, create: if isAuthenticated();
      
      // Chỉ ADMIN xóa được
      allow delete: if isAdmin();
      
      // Sửa: ADMIN bất kỳ lúc nào, STAFF chỉ cùng ngày tạo
      allow update: if isAuthenticated() && (
        getRole() == 'ADMIN' || 
        getRole() == 'MANAGER' ||
        (getRole() == 'STAFF' && 
         request.time.toMillis() - resource.data.createdAt.toMillis() < 86400000)
      );
    }
  }
}
```

> **Lưu ý:** Logic `isEditable()` trong frontend kiểm tra **cùng ngày** (`toDateString()`), không phải chính xác 24 giờ. Nên đồng bộ logic này với Firestore Rules.

---

## 🚀 Hướng dẫn cài đặt & Chạy

### Yêu cầu hệ thống

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Firebase CLI**: `npm install -g firebase-tools`
- Tài khoản Firebase với project đã bật **Authentication** và **Firestore**

### 1. Clone repository

```bash
git clone <repository-url>
cd TrangHoaMgmt
```

### 2. Cài đặt dependencies

```bash
# Frontend
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

### 3. Cấu hình Firebase

Tạo file `.env` trong thư mục gốc với nội dung:

```env
# Firebase Web App Config (lấy từ Firebase Console → Project Settings → Your apps)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### 4. Thiết lập Firebase Project

```bash
# Đăng nhập Firebase
firebase login

# Liên kết với project
firebase use --add
# Chọn project ID của bạn

# Deploy Firestore Rules (nếu có file firestore.rules)
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions
```

### 5. Chạy Development Server

```bash
npm run dev
```

Ứng dụng chạy tại: **http://localhost:3000**

### 6. Chạy Firebase Emulators (Local Testing)

```bash
# Chạy emulator cho Functions
firebase emulators:start --only functions

# Emulator UI: http://localhost:4000
# Functions: http://localhost:5001
```

> **Lưu ý:** Để test với emulator, cần cập nhật `dataService.ts` để connect đến emulator endpoint.

### 7. Build Production

```bash
npm run build
# Output: dist/
```

### 8. Chạy Tests

```bash
# Chạy tất cả tests
npm test

# Chạy tests với UI
npm run test:ui

# Chạy tests với coverage report
npm run test:coverage

# Chạy 1 lần (không watch mode)
npx vitest run
```

**Test Coverage:** 32 tests (3 suites) - Security, Business Logic, Integration

Chi tiết xem: [tests/README.md](tests/README.md)

### 9. Deploy lên Firebase Hosting (Tùy chọn)

Thêm cấu hình hosting vào `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "functions": { ... }
}
```

```bash
npm run build
firebase deploy --only hosting
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

---

## 👤 Phân quyền hệ thống (RBAC)

| Quyền | STAFF | MANAGER | ADMIN |
|-------|:-----:|:-------:|:-----:|
| Xem Dashboard & thống kê | ✅ | ✅ | ✅ |
| Xem danh sách đơn hàng | ✅ | ✅ | ✅ |
| Tạo đơn hàng mới | ✅ | ✅ | ✅ |
| Sửa đơn hàng (cùng ngày) | ✅ | ✅ | ✅ |
| Sửa đơn hàng (mọi lúc) | ❌ | ✅ | ✅ |
| Xóa đơn hàng | ❌ | ❌ | ✅ |
| Xem báo cáo & xuất CSV | ✅ | ✅ | ✅ |
| Quản lý nhân viên (CRUD) | ❌ | ❌ | ✅ |

### Chi tiết logic sửa đơn

Hàm `isEditable()` trong [dataService.ts](services/dataService.ts):

```typescript
export const isEditable = (order: Order): boolean => {
  if (!order || !order.createdAt) return false;
  const orderDate = new Date(order.createdAt);
  const now = new Date();
  return orderDate.toDateString() === now.toDateString();
  // Chỉ cho sửa nếu đơn được tạo CÙNG NGÀY (không phải 24h)
};
```

- **STAFF**: Chỉ sửa được đơn tạo **cùng ngày** (0:00 → 23:59)
- **MANAGER/ADMIN**: Sửa được **mọi lúc**, bỏ qua `isEditable()`

---

## 📊 Data Models (Firestore Collections)

### Collection: `orders`

```typescript
interface Order {
  id: string;                    // Document ID (timestamp-based)
  code: string;                  // Mã đơn tự sinh: "VD" + 4 số (VD1234)
  
  senderStation: Station;        // Enum: 'HT' | 'PA' | 'SG'
  receiverStation: Station;
  createdAt: string;             // ISO 8601 timestamp
  
  senderName: string;            // Tên người gửi (bắt buộc)
  senderPhone: string;           // SĐT người gửi (bắt buộc)
  
  receiverName: string;          // Tên người nhận
  receiverPhone: string;
  receiverAddress: string;
  
  goodsType: string;             // Loại hàng: Quần áo, Thực phẩm, ...
  quantity: number;              // Số lượng/kiện
  note: string;                  // Ghi chú
  
  cost: number;                  // Cước phí (VNĐ, bắt buộc)
  paymentStatus: PaymentStatus;  // 'Đã thu' | 'Chưa thu'
  
  createdBy: string;             // Tên người tạo đơn
  createdById?: string;          // UID của người tạo (optional)
  history: OrderHistory[];       // Lịch sử chỉnh sửa
}

interface OrderHistory {
  date: string;                  // ISO timestamp
  action: string;                // 'Created' | 'Updated'
  user: string;                  // Tên người thực hiện
}
```

### Collection: `accounts`

```typescript
interface Account {
  // Document ID = Firebase Auth UID
  uid: string;
  email: string;                 // Email đăng nhập
  username: string;              // Tên hiển thị / ID cũ
  name: string;                  // Họ và tên
  role: Role;                    // 'STAFF' | 'MANAGER' | 'ADMIN'
  createdAt?: Timestamp;         // Server timestamp (Cloud Function)
}
```

### Session Object: `User`

```typescript
// Lưu trong localStorage key: 'vantai_user'
interface User extends Account {
  station: Station;              // Trạm làm việc hiện tại
}
```

### Enums

```typescript
enum Station {
  HT = 'HT',    // Hà Tĩnh
  PA = 'PA',    // Phan Anh
  SG = 'SG'     // Sài Gòn
}

enum Role {
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

enum PaymentStatus {
  PAID = 'Đã thu',
  UNPAID = 'Chưa thu'
}
```

---

## 🔧 NPM Scripts

### Frontend (`package.json`)

| Script | Lệnh | Mô tả |
|--------|------|-------|
| `dev` | `vite` | Chạy dev server tại port 3000 |
| `build` | `vite build` | Build production → `dist/` |
| `preview` | `vite preview` | Preview bản build locally |

### Cloud Functions (`functions/package.json`)

| Script | Lệnh | Mô tả |
|--------|------|-------|
| `serve` | `firebase emulators:start --only functions` | Chạy Functions emulator |
| `deploy` | `firebase deploy --only functions` | Deploy lên Firebase |
| `logs` | `firebase functions:log` | Xem logs từ production |

---

## 🛠️ Công nghệ & Dependencies

### Frontend Dependencies

| Package | Version | Mục đích |
|---------|---------|----------|
| `react` | ^19.2.3 | UI Library |
| `react-dom` | ^19.2.3 | React DOM renderer |
| `react-router-dom` | ^7.12.0 | Client-side routing (HashRouter) |
| `firebase` | ^12.7.0 | Firebase JS SDK (Auth, Firestore, Functions) |
| `recharts` | ^3.6.0 | Biểu đồ thống kê (BarChart) |
| `lucide-react` | ^0.562.0 | Icon library |

### Dev Dependencies

| Package | Version | Mục đích |
|---------|---------|----------|
| `vite` | ^6.2.0 | Build tool & dev server |
| `@vitejs/plugin-react` | ^5.0.0 | React plugin cho Vite |
| `typescript` | ~5.8.2 | Type checking |
| `@types/node` | ^22.14.0 | Node.js type definitions |
| `vitest` | latest | Test framework |
| `@testing-library/react` | latest | React testing utilities |
| `@testing-library/jest-dom` | latest | Jest matchers cho DOM |
| `jsdom` | latest | DOM implementation cho tests |

### Cloud Functions Dependencies

| Package | Version | Mục đích |
|---------|---------|----------|
| `firebase-admin` | ^11.8.0 | Admin SDK (server-side) |
| `firebase-functions` | ^4.3.1 | Cloud Functions framework |

---

## 📝 Ghi chú quan trọng

### 1. Email đăng nhập

- Nếu nhập username không có `@` (vd: `admin`), hệ thống tự động thêm domain `@tranghoa.com`
- Có thể nhập trực tiếp email đầy đủ (vd: `admin@tranghoa.com`)

### 2. HashRouter vs BrowserRouter

App sử dụng `HashRouter` (URL dạng `/#/orders`) thay vì `BrowserRouter`:
- ✅ Không cần cấu hình server-side rewrite
- ✅ Hoạt động tốt với static hosting (Firebase Hosting, GitHub Pages)
- ✅ Không bị lỗi 404 khi refresh trang

### 3. Tailwind CSS

- Sử dụng **Tailwind CDN** (`<script src="https://cdn.tailwindcss.com">`)
- Cấu hình custom colors trong `index.html`:
  - `primary`: #0f172a (slate-900)
  - `secondary`: #334155 (slate-700)
  - `accent`: #3b82f6 (blue-500)

### 4. Print Styles

- Class `.no-print`: Ẩn khi in (filter toolbar, buttons)
- Class `.print-only`: Hiện khi in (header báo cáo, chữ ký)
- Được định nghĩa trong `<style>` của `index.html`

### 5. Xóa tài khoản

- Không thể tự xóa chính mình (check `targetUid === currentUser.uid`)
- Khi xóa: Xóa cả **Firebase Auth user** + **Firestore profile** (`accounts/{uid}`)

### 6. Mã đơn hàng

Sinh tự động bởi `generateOrderCode()`:
```typescript
`VD${Math.floor(1000 + Math.random() * 9000)}` // VD1234 → VD9999
```

---

## 🐛 Troubleshooting

### Lỗi: "Chưa đăng nhập" khi gọi Cloud Functions

**Nguyên nhân:** Region không khớp giữa client và server.

**Giải pháp:**
```typescript
// dataService.ts
const functions = getFunctions(app, 'asia-southeast1'); // Phải khớp với Cloud Functions
```

### Lỗi: "Permission denied" khi đọc/ghi Firestore

**Nguyên nhân:** Firestore Rules chưa được cấu hình.

**Giải pháp:**
1. Vào Firebase Console → Firestore → Rules
2. Copy rules từ section [Firestore Security Rules](#3-firestore-security-rules-rbac)
3. Publish rules

### Lỗi: "User not found" hoặc "Invalid credential"

**Nguyên nhân:** 
- Email không tồn tại trong Firebase Auth
- Mật khẩu sai

**Giải pháp:**
1. Kiểm tra email trong Firebase Console → Authentication → Users
2. Reset password nếu cần

### Lỗi: "Không tìm thấy thông tin phân quyền"

**Nguyên nhân:** User đã đăng nhập Auth nhưng không có document trong `accounts/{uid}`.

**Giải pháp:**
1. Tạo document thủ công trong Firestore:
   - Collection: `accounts`
   - Document ID: `{uid của user}`
   - Fields: `email`, `name`, `role`, `username`

### Lỗi: Cloud Functions deploy thất bại

**Nguyên nhân:** Node.js version không đúng.

**Giải pháp:**
```bash
# Kiểm tra version
node -v  # Cần >= 18

# Cập nhật nếu cần
nvm install 18
nvm use 18
```

---

## 🔄 Workflow phát triển

```
1. Chỉnh sửa code
        ↓
2. Test local: npm run dev
        ↓
3. Test Functions: firebase emulators:start
        ↓
4. Build: npm run build
        ↓
5. Deploy Functions: firebase deploy --only functions
        ↓
6. Deploy Hosting: Vercel auto-deploy từ Git
```

---

## 🛡️ Security Updates (16/01/2026)

Dự án đã được rà soát bảo mật theo **OWASP Top 10** và áp dụng các bản vá sau:

### ✅ Đã khắc phục

| ID | Severity | Vấn đề | File | Mô tả |
|----|----------|--------|------|-------|
| C1 | 🔴 Critical | Auth Bypass via localStorage | `App.tsx` | Thêm `onAuthStateChanged` listener để verify role từ Firebase thay vì tin localStorage |
| M1 | 🟡 Medium | Session Tampering | `App.tsx` | Chỉ lấy `station` từ localStorage, `role` luôn verify từ Firestore |
| H1 | 🟠 High | ProjectId Leak | `firebase.ts` | Wrap `console.log` trong `import.meta.env.DEV` check |
| H2 | 🟠 High | IDOR Order Edit | `OrderForm.tsx` | Thêm ownership check: STAFF chỉ sửa được order của chính mình |
| H3 | 🟠 High | Missing Input Validation | `functions/index.js` | Validate email, password length, role enum trong Cloud Functions |

### Chi tiết các bản vá

#### 1. Auth State Verification (C1 + M1)

**Trước:**
```tsx
// App.tsx - Tin hoàn toàn vào localStorage
const storedUser = localStorage.getItem('vantai_user');
if (storedUser) {
  setUser(JSON.parse(storedUser)); // ⚠️ Role có thể bị sửa
}
```

**Sau:**
```tsx
// App.tsx - Verify với Firebase Auth
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const account = await getAccountProfile(firebaseUser.uid);
    // Role lấy từ Firestore, chỉ station lấy từ localStorage
    setUser({ ...account, station });
  }
});
```

#### 2. Ownership Check cho Orders (H2)

**Trước:** STAFF có thể sửa order của người khác (cùng ngày)

**Sau:**
```tsx
// OrderForm.tsx
const isOwner = existing.createdById === user.uid;
const canEdit = 
  user.role === 'ADMIN' || 
  user.role === 'MANAGER' ||
  (user.role === 'STAFF' && isOwner && isEditable(existing));
```

> **Lưu ý:** Order mới tạo sẽ tự động lưu `createdById` để hỗ trợ ownership check.

#### 3. Input Validation trong Cloud Functions (H3)

```javascript
// functions/index.js
const VALID_ROLES = ['STAFF', 'MANAGER', 'ADMIN'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!EMAIL_REGEX.test(email)) throw new HttpsError('invalid-argument', 'Email không hợp lệ');
if (password.length < 8) throw new HttpsError('invalid-argument', 'Mật khẩu phải >= 8 ký tự');
if (!VALID_ROLES.includes(role)) throw new HttpsError('invalid-argument', 'Role không hợp lệ');
```

### 🔒 Firestore Security Rules (Đã deploy)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function getRole() {
      return get(/databases/$(database)/documents/accounts/$(request.auth.uid)).data.role;
    }

    match /accounts/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && getRole() == 'ADMIN';
    }

    match /orders/{orderId} {
      allow read, create: if request.auth != null;
      allow delete: if request.auth != null && getRole() == 'ADMIN';
      allow update: if request.auth != null && (
        getRole() == 'ADMIN' ||
        (getRole() == 'STAFF' &&
          request.time < resource.data.createdAt + duration.value(24, 'h'))
      );
    }
  }
}
```

### 📋 Security Checklist

- [x] Firebase Auth cho authentication
- [x] Firestore Rules cho authorization (RBAC)
- [x] Cloud Functions cho sensitive operations
- [x] Input validation ở cả client và server
- [x] Role verification từ Firestore (không tin client)
- [x] Ownership check cho order editing
- [x] HTTPS enforced (Vercel)
- [ ] Rate limiting (Firebase Auth có built-in, threshold cao)
- [ ] Content Security Policy (optional)

---

## 📄 License

Dự án nội bộ - **Trang Hòa Limousine**

---

## 👨‍💻 Liên hệ & Hỗ trợ

Để được hỗ trợ kỹ thuật, vui lòng liên hệ đội ngũ phát triển.

**Cập nhật lần cuối:** 16/01/2026 (Security Review)
