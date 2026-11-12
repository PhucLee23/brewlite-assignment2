import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

/** Các chuyển tiếp hợp lệ theo BR-06; COMPLETED và CANCELLED là trạng thái kết thúc */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Chuyển tiếp không hợp lệ trả 409 (FR-17) */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Không thể chuyển đơn từ "${STATUS_LABEL[from]}" sang "${STATUS_LABEL[to]}"`);
  }
}
