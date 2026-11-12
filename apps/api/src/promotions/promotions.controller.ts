import { Controller, Get, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { PromotionsService } from './promotions.service';

class PromotionQuery {
  @Type(() => Number)
  @IsInt({ message: 'subtotal (tạm tính) phải là số nguyên' })
  @Min(0, { message: 'subtotal (tạm tính) không được âm' })
  @Max(100_000_000, { message: 'subtotal (tạm tính) quá lớn' })
  subtotal: number;
}

// FR-09: kiểm tra mã giảm giá với tạm tính hiện tại của giỏ hàng
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get(':code')
  check(@Param('code') code: string, @Query() query: PromotionQuery) {
    return this.promotions.evaluate(code, query.subtotal);
  }
}
