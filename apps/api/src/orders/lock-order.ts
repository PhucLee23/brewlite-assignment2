import { OrderStatus, Prisma } from '@prisma/client';

export interface LockedOrder {
  id: number;
  userId: number;
  status: OrderStatus;
  total: number;
}

/**
 * Khóa dòng đơn hàng tới hết transaction (ADR-006). Thanh toán và hủy đơn cùng gọi hàm này
 * nên không thể chạy chồng lên nhau trên cùng một đơn.
 */
export async function lockOrder(tx: Prisma.TransactionClient, orderId: number): Promise<LockedOrder | null> {
  const rows = await tx.$queryRaw<LockedOrder[]>`
    SELECT id, "userId", status, total FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  return rows[0] ?? null;
}
