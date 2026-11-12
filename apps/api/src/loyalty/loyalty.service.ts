import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pointsFor } from './loyalty-rules';

/**
 * Điểm thưởng (FR-13): mỗi thay đổi số dư đi kèm một giao dịch điểm trong cùng transaction,
 * nên `User.loyaltyPoints` luôn bằng tổng các giao dịch. UNIQUE (orderId, type) chặn cộng/thu hồi hai lần.
 */
@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Đơn sang PAID: ghi EARN và cộng điểm; trả số điểm vừa cộng */
  async earn(tx: Prisma.TransactionClient, order: { id: number; userId: number; total: number }): Promise<number> {
    const points = pointsFor(order.total);
    await tx.loyaltyTransaction.create({ data: { userId: order.userId, orderId: order.id, type: 'EARN', points } });
    await tx.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: points } } });
    return points;
  }

  /** Hủy đơn đã PAID: ghi REVOKE với số điểm âm đúng bằng số đã cộng */
  async revoke(tx: Prisma.TransactionClient, orderId: number): Promise<number> {
    const earned = await tx.loyaltyTransaction.findUnique({ where: { orderId_type: { orderId, type: 'EARN' } } });
    if (!earned) return 0;
    await tx.loyaltyTransaction.create({
      data: { userId: earned.userId, orderId, type: 'REVOKE', points: -earned.points },
    });
    await tx.user.update({ where: { id: earned.userId }, data: { loyaltyPoints: { decrement: earned.points } } });
    return earned.points;
  }

  /** FR-21: số dư và lịch sử giao dịch điểm của người dùng */
  async history(userId: number) {
    const [user, transactions] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { loyaltyPoints: true } }),
      this.prisma.loyaltyTransaction.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, orderId: true, type: true, points: true, createdAt: true },
      }),
    ]);
    return { balance: user.loyaltyPoints, transactions };
  }
}
