import type { OrderStatus } from './types';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng – mời nhận nước',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  PAYMENT_FAILED: 'bg-red-100 text-red-800',
  PAID: 'bg-blue-100 text-blue-900',
  PREPARING: 'bg-purple-100 text-purple-900',
  READY: 'bg-green-100 text-green-900',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
};

/** Khách hủy được đơn khi chưa pha chế (FR-16) */
export const CANCELLABLE: OrderStatus[] = ['PENDING', 'PAYMENT_FAILED', 'PAID'];

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const time = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
export const formatTime = (iso: string) => time.format(new Date(iso));
