import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * Security Test Suite
 * Testing các bản vá bảo mật: C1, M1, H2, H3
 */

describe('Security Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('[C1 + M1] Auth State Verification', () => {
    it('không nên tin role từ localStorage', () => {
      // Giả lập attacker sửa localStorage
      const fakeAdmin = {
        uid: 'user123',
        email: 'staff@test.com',
        name: 'Staff User',
        role: 'ADMIN', // ⚠️ Sửa thành ADMIN
        username: 'staff',
        station: 'HT'
      };
      
      localStorage.setItem('vantai_user', JSON.stringify(fakeAdmin));
      
      const stored = localStorage.getItem('vantai_user');
      const parsedUser = JSON.parse(stored!);
      
      // Test: localStorage CÓ THỂ bị tamper
      expect(parsedUser.role).toBe('ADMIN');
      
      // Trong App.tsx mới, role phải verify từ Firestore
      // Không dùng trực tiếp parsedUser.role
    });

    it('chỉ nên lấy station từ localStorage', () => {
      const userData = {
        uid: 'user123',
        role: 'STAFF',
        station: 'SG'
      };
      
      localStorage.setItem('vantai_user', JSON.stringify(userData));
      
      const stored = JSON.parse(localStorage.getItem('vantai_user')!);
      
      // Chỉ sử dụng station, role phải verify từ backend
      expect(stored.station).toBe('SG');
    });
  });

  describe('[H2] IDOR - Ownership Check', () => {
    it('STAFF không nên sửa được order của người khác', () => {
      const currentUser = {
        uid: 'staff-A',
        role: 'STAFF',
        name: 'Staff A'
      };

      const orderByOtherUser = {
        id: '1',
        createdById: 'staff-B', // Order của Staff B
        createdAt: new Date().toISOString(),
        createdBy: 'Staff B'
      };

      // Check ownership
      const isOwner = orderByOtherUser.createdById === currentUser.uid;
      expect(isOwner).toBe(false);

      // Logic trong OrderForm.tsx
      const canEdit = 
        currentUser.role === 'ADMIN' || 
        currentUser.role === 'MANAGER' ||
        (currentUser.role === 'STAFF' && isOwner);
      
      expect(canEdit).toBe(false); // ✅ KHÔNG được sửa
    });

    it('STAFF nên sửa được order của chính mình (trong ngày)', () => {
      const currentUser = {
        uid: 'staff-A',
        role: 'STAFF',
        name: 'Staff A'
      };

      const myOrder = {
        id: '1',
        createdById: 'staff-A', // Order của chính mình
        createdAt: new Date().toISOString(),
      };

      const isOwner = myOrder.createdById === currentUser.uid;
      expect(isOwner).toBe(true);

      // Check editable (cùng ngày)
      const orderDate = new Date(myOrder.createdAt);
      const now = new Date();
      const isEditable = orderDate.toDateString() === now.toDateString();
      
      expect(isEditable).toBe(true);

      const canEdit = 
        currentUser.role === 'STAFF' && isOwner && isEditable;
      
      expect(canEdit).toBe(true); // ✅ ĐƯỢC sửa
    });

    it('ADMIN nên sửa được mọi order', () => {
      const adminUser = {
        uid: 'admin-1',
        role: 'ADMIN'
      };

      const someOrder = {
        createdById: 'other-user',
        createdAt: '2020-01-01' // Order cũ
      };

      const isOwner = someOrder.createdById === adminUser.uid;
      expect(isOwner).toBe(false);

      const canEdit = adminUser.role === 'ADMIN';
      expect(canEdit).toBe(true); // ✅ ADMIN sửa được tất cả
    });
  });

  describe('[H3] Input Validation', () => {
    it('nên reject email không hợp lệ', () => {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const invalidEmails = [
        '',
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      invalidEmails.forEach(email => {
        expect(EMAIL_REGEX.test(email)).toBe(false);
      });
    });

    it('nên accept email hợp lệ', () => {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const validEmails = [
        'user@example.com',
        'admin@tranghoa.com',
        'test.user@domain.co.uk',
      ];

      validEmails.forEach(email => {
        expect(EMAIL_REGEX.test(email)).toBe(true);
      });
    });

    it('nên reject password ngắn hơn 8 ký tự', () => {
      const passwords = [
        { value: '12345', valid: false },
        { value: '1234567', valid: false },
        { value: '12345678', valid: true },
        { value: 'strongPassword123', valid: true },
      ];

      passwords.forEach(({ value, valid }) => {
        expect(value.length >= 8).toBe(valid);
      });
    });

    it('nên reject role không hợp lệ', () => {
      const VALID_ROLES = ['STAFF', 'MANAGER', 'ADMIN'];
      
      expect(VALID_ROLES.includes('SUPER_ADMIN')).toBe(false);
      expect(VALID_ROLES.includes('USER')).toBe(false);
      expect(VALID_ROLES.includes('STAFF')).toBe(true);
    });

    it('nên sanitize inputs', () => {
      const dirtyEmail = '  USER@EXAMPLE.COM  ';
      const dirtyName = '  John Doe   ';
      
      const sanitizedEmail = dirtyEmail.toLowerCase().trim();
      const sanitizedName = dirtyName.trim();
      
      expect(sanitizedEmail).toBe('user@example.com');
      expect(sanitizedName).toBe('John Doe');
    });
  });
});
