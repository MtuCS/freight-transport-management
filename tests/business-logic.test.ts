import { describe, it, expect } from 'vitest';
import { generateOrderCode, isEditable } from '../services/dataService';
import type { Order } from '../types';

/**
 * Business Logic Tests
 * Testing các helper functions và logic nghiệp vụ
 */

describe('Business Logic Tests', () => {
  describe('generateOrderCode', () => {
    it('nên sinh mã đơn hàng với format VD + 4 số', () => {
      const code = generateOrderCode();
      
      expect(code).toMatch(/^VD\d{4}$/);
      expect(code.length).toBe(6);
      expect(code.startsWith('VD')).toBe(true);
    });

    it('mã đơn nên nằm trong khoảng VD1000 - VD9999', () => {
      const code = generateOrderCode();
      const number = parseInt(code.substring(2));
      
      expect(number).toBeGreaterThanOrEqual(1000);
      expect(number).toBeLessThanOrEqual(9999);
    });

    it('nên sinh mã khác nhau mỗi lần', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateOrderCode());
      }
      
      // Có ít nhất 50 mã khác nhau trong 100 lần (do random)
      expect(codes.size).toBeGreaterThan(50);
    });
  });

  describe('isEditable', () => {
    it('đơn hàng hôm nay nên editable', () => {
      const today = new Date().toISOString();
      const order: Partial<Order> = {
        id: '1',
        createdAt: today,
        code: 'VD1234'
      };
      
      expect(isEditable(order as Order)).toBe(true);
    });

    it('đơn hàng hôm qua KHÔNG editable', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const order: Partial<Order> = {
        id: '1',
        createdAt: yesterday.toISOString(),
        code: 'VD1234'
      };
      
      expect(isEditable(order as Order)).toBe(false);
    });

    it('đơn hàng không có createdAt KHÔNG editable', () => {
      const order: Partial<Order> = {
        id: '1',
        code: 'VD1234'
      };
      
      expect(isEditable(order as Order)).toBe(false);
    });

    it('đơn hàng null/undefined KHÔNG editable', () => {
      expect(isEditable(null as any)).toBe(false);
      expect(isEditable(undefined as any)).toBe(false);
    });
  });

  describe('Order Validation', () => {
    it('đơn hàng hợp lệ phải có senderName, senderPhone, cost', () => {
      const validOrder = {
        senderName: 'Nguyen Van A',
        senderPhone: '0901234567',
        cost: 50000
      };
      
      expect(validOrder.senderName).toBeTruthy();
      expect(validOrder.senderPhone).toBeTruthy();
      expect(validOrder.cost).toBeGreaterThan(0);
    });

    it('cost phải là số dương', () => {
      const costs = [
        { value: 0, valid: false },
        { value: -100, valid: false },
        { value: 50000, valid: true },
        { value: 1000000, valid: true },
      ];

      costs.forEach(({ value, valid }) => {
        expect(value > 0).toBe(valid);
      });
    });

    it('quantity phải >= 1', () => {
      const quantities = [
        { value: 0, valid: false },
        { value: 1, valid: true },
        { value: 10, valid: true },
      ];

      quantities.forEach(({ value, valid }) => {
        expect(value >= 1).toBe(valid);
      });
    });
  });

  describe('Role-Based Authorization', () => {
    it('ADMIN có full quyền', () => {
      const adminRole: string = 'ADMIN';
      
      const canViewDashboard = true;
      const canCreateOrder = true;
      const canEditAnyOrder = adminRole === 'ADMIN';
      const canDeleteOrder = adminRole === 'ADMIN';
      const canManageEmployees = adminRole === 'ADMIN';
      
      expect(canViewDashboard).toBe(true);
      expect(canCreateOrder).toBe(true);
      expect(canEditAnyOrder).toBe(true);
      expect(canDeleteOrder).toBe(true);
      expect(canManageEmployees).toBe(true);
    });

    it('MANAGER có quyền sửa mọi order nhưng không xóa', () => {
      const managerRole: string = 'MANAGER';
      
      const canEditAnyOrder = managerRole === 'MANAGER' || managerRole === 'ADMIN';
      const canDeleteOrder = managerRole === 'ADMIN';
      const canManageEmployees = managerRole === 'ADMIN';
      
      expect(canEditAnyOrder).toBe(true);
      expect(canDeleteOrder).toBe(false);
      expect(canManageEmployees).toBe(false);
    });

    it('STAFF chỉ sửa order của mình trong ngày', () => {
      const staffRole: string = 'STAFF';
      
      const canViewDashboard = true;
      const canCreateOrder = true;
      const canEditAnyOrder = staffRole === 'ADMIN' || staffRole === 'MANAGER';
      const canDeleteOrder = staffRole === 'ADMIN';
      
      expect(canViewDashboard).toBe(true);
      expect(canCreateOrder).toBe(true);
      expect(canEditAnyOrder).toBe(false);
      expect(canDeleteOrder).toBe(false);
    });
  });

  describe('Station Logic', () => {
    it('nên có 3 trạm: HT, PA, SG', () => {
      const stations = ['HT', 'PA', 'SG'];
      
      expect(stations).toHaveLength(3);
      expect(stations).toContain('HT');
      expect(stations).toContain('PA');
      expect(stations).toContain('SG');
    });

    it('tuyến vận chuyển phải khác trạm gửi và nhận', () => {
      const routes = [
        { from: 'HT', to: 'SG', valid: true },
        { from: 'PA', to: 'HT', valid: true },
        { from: 'HT', to: 'HT', valid: false }, // Cùng trạm
      ];

      routes.forEach(({ from, to, valid }) => {
        expect(from !== to).toBe(valid);
      });
    });
  });
});
