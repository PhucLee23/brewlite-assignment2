import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { assertTransition } from './order-state-machine';

/**
 * Cách DUY NHẤT để đổi trạng thái đơn (FR-17, ADR-006): kiểm tra state machine rồi cập nhật có điều kiện
 * `WHERE status = <cũ>`. Hai yêu cầu đồng thời trên cùng đơn thì chỉ một yêu cầu thành công, yêu cầu kia nhận 409.
 */
export async function transitionOrder(
  tx: Prisma.TransactionClient,
  orderId: number,
  from: OrderStatus,
  to: OrderStatus,
): Promise<void> {
  assertTransition(from, to);
  const res = await tx.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
  if (res.count === 0) {
    throw new ConflictException('Đơn vừa được cập nhật bởi thao tác khác, vui lòng tải lại');
  }
}
