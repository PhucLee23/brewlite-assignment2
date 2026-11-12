import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { assertTransition, canTransition } from './order-state-machine';

const ALL = Object.values(OrderStatus);

// Danh sách đầy đủ các mũi tên trong sơ đồ BR-06
const ALLOWED: [OrderStatus, OrderStatus][] = [
  ['PENDING', 'PAID'],
  ['PENDING', 'PAYMENT_FAILED'],
  ['PAYMENT_FAILED', 'PENDING'],
  ['PENDING', 'CANCELLED'],
  ['PAYMENT_FAILED', 'CANCELLED'],
  ['PAID', 'CANCELLED'],
  ['PAID', 'PREPARING'],
  ['PREPARING', 'READY'],
  ['READY', 'COMPLETED'],
];

// UT-03: state machine – mọi chuyển tiếp hợp lệ và không hợp lệ (BR-06)
describe('UT-03 state machine đơn hàng', () => {
  it.each(ALLOWED)('cho phép %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it('từ chối mọi cặp còn lại (409)', () => {
    const allowed = new Set(ALLOWED.map(([f, t]) => `${f}>${t}`));
    let rejected = 0;
    for (const from of ALL) {
      for (const to of ALL) {
        if (allowed.has(`${from}>${to}`)) continue;
        expect(canTransition(from, to)).toBe(false);
        expect(() => assertTransition(from, to)).toThrow(ConflictException);
        rejected++;
      }
    }
    expect(rejected).toBe(ALL.length * ALL.length - ALLOWED.length);
  });

  it('COMPLETED và CANCELLED là trạng thái kết thúc', () => {
    for (const to of ALL) {
      expect(canTransition('COMPLETED', to)).toBe(false);
      expect(canTransition('CANCELLED', to)).toBe(false);
    }
  });
});
