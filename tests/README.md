# 🧪 Test Suite Documentation

## Tổng quan

Dự án sử dụng **Vitest** làm test framework với **React Testing Library** để test các component và business logic.

## Kết quả Test

```
✅ Test Files:  3 passed (3)
✅ Tests:       32 passed (32)
⏱️  Duration:   1.95s
```

## Test Coverage

### 1. Security Tests (`tests/security.test.ts`) - 10 tests

Test các bản vá bảo mật đã áp dụng:

#### [C1 + M1] Auth State Verification (2 tests)
- ✅ Không tin role từ localStorage
- ✅ Chỉ lấy station từ localStorage

#### [H2] IDOR - Ownership Check (3 tests)
- ✅ STAFF không sửa được order của người khác
- ✅ STAFF sửa được order của chính mình (trong ngày)
- ✅ ADMIN sửa được mọi order

#### [H3] Input Validation (5 tests)
- ✅ Reject email không hợp lệ
- ✅ Accept email hợp lệ
- ✅ Reject password < 8 ký tự
- ✅ Reject role không hợp lệ
- ✅ Sanitize inputs (trim, lowercase)

### 2. Business Logic Tests (`tests/business-logic.test.ts`) - 15 tests

Test các hàm helper và logic nghiệp vụ:

#### generateOrderCode (3 tests)
- ✅ Sinh mã format VD + 4 số
- ✅ Mã trong khoảng VD1000 - VD9999
- ✅ Sinh mã khác nhau mỗi lần

#### isEditable (4 tests)
- ✅ Đơn hàng hôm nay editable
- ✅ Đơn hàng hôm qua KHÔNG editable
- ✅ Đơn không có createdAt KHÔNG editable
- ✅ null/undefined KHÔNG editable

#### Order Validation (3 tests)
- ✅ Validate required fields
- ✅ Cost phải > 0
- ✅ Quantity phải >= 1

#### Role-Based Authorization (3 tests)
- ✅ ADMIN có full quyền
- ✅ MANAGER sửa được mọi order nhưng không xóa
- ✅ STAFF chỉ sửa order của mình trong ngày

#### Station Logic (2 tests)
- ✅ 3 trạm: HT, PA, SG
- ✅ Tuyến vận chuyển phải khác trạm

### 3. Integration Tests (`tests/integration.test.ts`) - 7 tests

Test workflows và tích hợp:

#### Order Creation Workflow (1 test)
- ✅ Workflow tạo đơn hàng đầy đủ

#### Employee Management Workflow (2 tests)
- ✅ Admin tạo nhân viên với validation
- ✅ Xóa nhân viên (không tự xóa)

#### Auth State Management Workflow (2 tests)
- ✅ Login và verify role từ Firestore
- ✅ Refresh page - onAuthStateChanged verify

#### Order Edit Permission Workflow (2 tests)
- ✅ STAFF edit own order
- ✅ STAFF không edit order của người khác

## Chạy Tests

### Chạy tất cả tests
```bash
npm test
```

### Chạy tests với UI
```bash
npm run test:ui
```

### Chạy tests với coverage report
```bash
npm run test:coverage
```

### Chạy 1 lần (không watch)
```bash
npx vitest run
```

### Chạy tests cho file cụ thể
```bash
npx vitest run tests/security.test.ts
```

## Test Structure

```
tests/
├── setup.ts                 # Test configuration & mocks
├── security.test.ts         # Security patches verification
├── business-logic.test.ts   # Helper functions & logic
└── integration.test.ts      # Workflows & integration
```

## Mock Configuration

File `tests/setup.ts` cấu hình:
- Mock Firebase SDK
- Mock localStorage
- Auto cleanup sau mỗi test
- Import jest-dom matchers

## CI/CD Integration

Thêm vào CI pipeline (GitHub Actions, GitLab CI):

```yaml
- name: Run Tests
  run: npm test -- --run
```

## Coverage Goals

- [x] Security patches (C1, M1, H2, H3): 100%
- [x] Core business logic: 100%
- [x] Integration workflows: 100%
- [ ] Component rendering: TODO (optional)
- [ ] E2E tests: TODO (optional)

## Test Best Practices

1. ✅ Mỗi test độc lập (không phụ thuộc lẫn nhau)
2. ✅ Clear test names (mô tả rõ ràng)
3. ✅ AAA pattern (Arrange, Act, Assert)
4. ✅ Test edge cases
5. ✅ Mock external dependencies (Firebase)

## Lưu ý

- Tests chạy với **jsdom environment** để giả lập browser
- Firebase SDK được mock để không cần real connection
- Tests focus vào logic, không cần Firebase Emulator

---

**Last updated:** 16/01/2026
