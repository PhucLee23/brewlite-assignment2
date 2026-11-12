import { Prisma } from '@prisma/client';

/** Trường trả ra ngoài của một đơn (không lộ khóa idempotency) */
export const ORDER_SELECT = {
  id: true,
  userId: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  promotionCode: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      productId: true,
      productName: true,
      size: true,
      toppings: true,
      qty: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
  // Điểm vừa cộng / thu hồi, hiển thị ở màn hình xác nhận (FR-14)
  loyalty: { select: { type: true, points: true } },
  // Giao dịch đã thanh toán thành công, để trang đơn có link tới biên lai (FR-26)
  payments: { where: { status: 'SUCCESS' }, select: { id: true, provider: true }, orderBy: { id: 'desc' } },
} satisfies Prisma.OrderSelect;
