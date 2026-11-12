import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { evaluatePromotion } from './promotion-rules';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mã không phân biệt hoa thường; trả kết quả đánh giá theo BR-04 */
  async evaluate(code: string, subtotal: number) {
    const normalized = code.trim().toUpperCase();
    const promo = await this.prisma.promotion.findUnique({ where: { code: normalized } });
    const result = evaluatePromotion(promo, subtotal);
    return { code: normalized, percentOff: promo?.percentOff ?? 0, ...result };
  }
}
