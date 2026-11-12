import { Prisma } from '@prisma/client';

/** Hạn của một phiên thanh toán kể từ lúc tạo (FR-11); cổng cũng nhận đúng hạn này */
export const SESSION_TTL_MS = 15 * 60 * 1000;

export function sessionExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_TTL_MS);
}

/**
 * Phiên PROCESSING quá 15 phút chưa có kết quả bị đánh FAILED (confirmedAt vẫn null) để không chặn hủy đơn
 * hay thanh toán lại. Nếu sau đó cổng vẫn báo đã trừ tiền thì PaymentsService vẫn ghi nhận (xem settle).
 */
export function expireStaleSessions(db: Prisma.TransactionClient, orderId?: number) {
  return db.payment.updateMany({
    where: {
      status: 'PROCESSING',
      createdAt: { lt: new Date(Date.now() - SESSION_TTL_MS) },
      ...(orderId ? { orderId } : {}),
    },
    data: { status: 'FAILED' },
  });
}
