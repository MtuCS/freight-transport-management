# Hệ Thống Quản Lý Vận Tải Trang Hoa (VTTH Manager) - Phiên bản Bảo mật High-Level

## 1. Giới thiệu dự án
Ứng dụng số hóa quy trình vận tải trạm HT, PA, SG. Phiên bản này đã được nâng cấp bảo mật toàn diện theo tiêu chuẩn doanh nghiệp.

## 2. Các nâng cấp bảo mật (Security Hardening)

### 2.1. Firebase Authentication
- **Chuyển đổi:** Loại bỏ việc lưu mật khẩu văn bản thuần (plain text) trong Firestore.
- **Xác thực:** Sử dụng cơ chế Email/Password của Firebase Auth với mật khẩu được băm (salted hash) phía Server Google.
- **Phiên làm việc:** Quản lý JWT an toàn, tự động duy trì đăng nhập qua `onAuthStateChanged`.

### 2.2. Cloud Functions (Backend)
- **Cơ chế:** Các thao tác nhạy cảm như "Tạo nhân viên" và "Xóa nhân viên" được chuyển từ phía Client sang **Firebase Cloud Functions**.
- **Lợi ích:** Admin có thể tạo tài khoản cho nhân viên mà không bị tự động đăng xuất khỏi phiên làm việc hiện tại của mình. Cloud Functions sử dụng `Firebase Admin SDK` để tương tác trực tiếp với Auth list.

### 2.3. Firestore Security Rules (RBAC)
Cấu hình mẫu để bảo vệ dữ liệu (Cần cập nhật trong Firebase Console):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Hàm check role
    function getRole() {
      return get(/databases/$(database)/documents/accounts/$(request.auth.uid)).data.role;
    }

    // Tài khoản nhân viên: Chỉ Admin được phép sửa/xóa
    match /accounts/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && getRole() == 'ADMIN';
    }

    // Đơn hàng: Nhân viên xem/tạo thoải mái. Xóa chỉ Admin. Sửa có điều kiện.
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

## 3. Cấu trúc Cloud Functions (Tham khảo)
Đoạn mã mẫu triển khai phía Server (`functions/index.js`):
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.registerEmployee = functions.https.onCall(async (data, context) => {
  // Kiểm tra quyền Admin
  const adminDoc = await admin.firestore().collection('accounts').doc(context.auth.uid).get();
  if (adminDoc.data().role !== 'ADMIN') throw new functions.https.HttpsError('permission-denied');

  const { email, password, name, username, role } = data;
  
  // 1. Tạo user trong Auth
  const userRecord = await admin.auth().createUser({ email, password, displayName: name });
  
  // 2. Tạo profile trong Firestore
  await admin.firestore().collection('accounts').doc(userRecord.uid).set({
    email, name, username, role, createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true, uid: userRecord.uid };
});
```

---
*Cập nhật bảo mật: {new Date().toLocaleDateString('vi-VN')}*