# 🚚 Hệ Thống Quản Lý Vận Tải Trang Hòa Limousine

## 📋 Giới thiệu

Hệ thống quản lý hàng hóa vận chuyển cho Trang Hòa Limousine, số hóa quy trình gửi nhận hàng giữa các trạm HT, PA, SG. Ứng dụng được xây dựng với kiến trúc bảo mật cao sử dụng **Firebase Authentication** và **Cloud Functions**.

### Tính năng chính

- ✅ **Quản lý đơn hàng**: Tạo, sửa, xóa phiếu gửi hàng
- 📊 **Dashboard tổng quan**: Thống kê doanh thu, đơn hàng theo trạm
- 👥 **Quản lý nhân viên**: Cấp phát tài khoản xác thực qua Firebase Auth
- 🔐 **Bảo mật cao**: Firebase Authentication + Cloud Functions + Firestore Rules
- 🎯 **Phân quyền**: 3 cấp độ (STAFF, MANAGER, ADMIN)
- 💰 **Theo dõi cước phí**: Quản lý trạng thái thu/chưa thu
- 📱 **Responsive**: Hỗ trợ đầy đủ trên Mobile và Desktop

---

## 🏗️ Kiến trúc hệ thống

### Tech Stack

**Frontend:**
- React 19.2.3 + TypeScript 5.8
- React Router DOM 7.12
- Recharts (biểu đồ)
- Lucide React (icons)
- Vite 6.2 (build tool)

**Backend:**
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions (Node.js 18)
- Region: `asia-southeast1`

**Deployment:**
- Hosting: Có thể deploy lên Firebase Hosting
- Functions: Firebase Cloud Functions

### Cấu trúc thư mục

```
TrangHoaMgmt/
├── components/           # React components
│   ├── Dashboard.tsx     # Tổng quan, thống kê
│   ├── OrderForm.tsx     # Form tạo/sửa đơn hàng
│   ├── OrderList.tsx     # Danh sách đơn hàng với filter
│   ├── EmployeeManagement.tsx  # Quản lý nhân viên (Admin)
│   ├── Login.tsx         # Màn hình đăng nhập
│   ├── Reports.tsx       # Báo cáo chi tiết
│   └── Layout.tsx        # Layout chung + sidebar
├── services/
│   ├── firebase.ts       # Khởi tạo Firebase App
│   └── dataService.ts    # Business logic & API calls
├── functions/
│   ├── index.js          # Cloud Functions
│   └── package.json
├── public/
│   └── img/
├── App.tsx               # Root component
├── types.ts              # TypeScript interfaces
├── index.tsx             # Entry point
├── vite.config.ts        # Vite configuration
├── firebase.json         # Firebase config
└── package.json
```

---

## 🔐 Kiến trúc bảo mật

### 1. Firebase Authentication

**Luồng đăng nhập:**
1. User nhập email + password
2. Firebase Auth xác thực (mật khẩu được hash bởi Google)
3. Lấy thông tin phân quyền từ Firestore `accounts/{uid}`
4. Chọn trạm làm việc (HT/PA/SG)
5. Lưu phiên đăng nhập với JWT token

**Tự động duy trì phiên:** Sử dụng `onAuthStateChanged()` để detect trạng thái đăng nhập.

### 2. Cloud Functions (Backend Logic)

Các thao tác nhạy cảm được xử lý ở server-side để tránh lỗi bảo mật:

#### `registerEmployee` (Tạo nhân viên)
```javascript
exports.registerEmployee = functions
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // 1. Verify Admin role
    // 2. Create Firebase Auth user
    // 3. Create Firestore profile
  });
```

**Lợi ích:** Admin tạo tài khoản cho nhân viên mà không bị logout khỏi phiên của chính mình.

#### `deleteEmployee` (Xóa nhân viên)
```javascript
exports.deleteEmployee = functions
  .region('asia-southeast1')
  .https.onCall(async (data, context) => {
    // 1. Verify Admin role
    // 2. Delete from Firebase Auth
    // 3. Delete from Firestore
  });
```

### 3. Firestore Security Rules (RBAC)

Quy tắc bảo mật mẫu (cần cấu hình trong Firebase Console):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function getRole() {
      return get(/databases/$(database)/documents/accounts/$(request.auth.uid)).data.role;
    }

    // Collection: accounts
    match /accounts/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && getRole() == 'ADMIN';
    }

    // Collection: orders
    match /orders/{orderId} {
      allow read, create: if request.auth != null;
      allow delete: if request.auth != null && getRole() == 'ADMIN';
      allow update: if request.auth != null && (
        getRole() == 'ADMIN' || 
        (getRole() == 'STAFF' && request.time < resource.data.createdAt + duration.value(24, 'h'))
      );
    }
  }
}
```

**Giải thích:**
- `accounts`: Chỉ ADMIN mới có quyền thêm/sửa/xóa
- `orders`: 
  - Tất cả user xác thực được đọc và tạo
  - STAFF chỉ sửa được đơn hàng trong vòng 24h
  - Chỉ ADMIN mới xóa được đơn

---

## 🚀 Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd TrangHoaMgmt
```

### 2. Cài đặt dependencies

**Frontend:**
```bash
npm install
```

**Cloud Functions:**
```bash
cd functions
npm install
cd ..
```

### 3. Cấu hình Firebase

Tạo file `.env` trong thư mục gốc:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 4. Deploy Cloud Functions

```bash
firebase login
firebase use --add  # Chọn project
firebase deploy --only functions
```

### 5. Chạy ứng dụng (Development)

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

### 6. Build Production

```bash
npm run build
```

### 7. Deploy lên Firebase Hosting (Tùy chọn)

```bash
firebase deploy --only hosting
```

---

## 👤 Phân quyền hệ thống

### Role: STAFF (Nhân viên)
- ✅ Xem danh sách đơn hàng
- ✅ Tạo đơn hàng mới
- ✅ Sửa đơn hàng (trong vòng 24h)
- ❌ Xóa đơn hàng
- ❌ Quản lý nhân viên

### Role: MANAGER (Quản lý)
- ✅ Tất cả quyền của STAFF
- ✅ Xem báo cáo chi tiết
- ✅ Sửa đơn hàng bất kỳ lúc nào
- ❌ Xóa đơn hàng
- ❌ Quản lý nhân viên

### Role: ADMIN (Quản trị viên)
- ✅ Full quyền
- ✅ Xóa đơn hàng
- ✅ Quản lý nhân viên (thêm/xóa tài khoản)
- ✅ Truy cập tất cả chức năng

---

## 📊 Data Models

### Order (Đơn hàng)
```typescript
interface Order {
  id: string;
  code: string;              // Mã đơn (VD1234)
  senderStation: Station;    // HT | PA | SG
  receiverStation: Station;
  createdAt: string;         // ISO timestamp
  
  senderName: string;
  senderPhone: string;
  
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  
  goodsType: string;
  quantity: number;
  note: string;
  
  cost: number;
  paymentStatus: PaymentStatus; // 'Đã thu' | 'Chưa thu'
  
  createdBy: string;         // Tên người tạo
  createdById?: string;      // UID
  history: OrderHistory[];
}
```

### Account (Tài khoản)
```typescript
interface Account {
  uid: string;               // Firebase Auth UID
  email: string;
  username: string;
  name: string;
  role: Role;                // STAFF | MANAGER | ADMIN
}
```

### User (Phiên đăng nhập)
```typescript
interface User extends Account {
  station: Station;          // Trạm hiện tại đang làm việc
}
```

---

## 🔧 Scripts hữu ích

```json
{
  "dev": "vite",              // Chạy dev server
  "build": "vite build",      // Build production
  "preview": "vite preview"   // Preview production build
}
```

---

## 🛠️ Công nghệ sử dụng

| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React | 19.2.3 | UI Framework |
| TypeScript | 5.8.2 | Type Safety |
| React Router | 7.12.0 | Routing |
| Firebase | 12.7.0 | Backend & Auth |
| Recharts | 3.6.0 | Biểu đồ thống kê |
| Lucide React | 0.562.0 | Icon library |
| Vite | 6.2.0 | Build tool |

---

## 📝 Ghi chú quan trọng

### Email đăng nhập
- Nếu nhập username (vd: `admin`), hệ thống tự động thêm domain `@tranghoa.com`
- Có thể nhập trực tiếp email đầy đủ

### Chỉnh sửa đơn hàng
- STAFF: Chỉ sửa được đơn trong vòng 24h
- MANAGER/ADMIN: Sửa được bất kỳ lúc nào
- Logic kiểm tra: `isEditable()` trong `dataService.ts`

### Xóa tài khoản
- Không thể tự xóa chính mình
- Khi xóa nhân viên: Xóa cả Auth + Firestore profile

---

## 🐛 Troubleshooting

**Lỗi: Functions không gọi được**
- Kiểm tra region có đúng `asia-southeast1` không
- Verify Cloud Functions đã deploy thành công

**Lỗi: Permission denied**
- Kiểm tra Firestore Rules
- Verify role trong collection `accounts`

**Lỗi: User not found**
- Kiểm tra email có tồn tại trong Firebase Auth
- Verify profile tồn tại trong Firestore `accounts/{uid}`

---

## 📄 License

Dự án nội bộ - Trang Hòa Limousine

---

## 👨‍💻 Liên hệ & Hỗ trợ

Để được hỗ trợ kỹ thuật, vui lòng liên hệ đội ngũ phát triển.

**Cập nhật:** 14/01/2026
