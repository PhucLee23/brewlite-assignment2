import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { readIdempotencyKey } from '../common/idempotency-key';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

// Mọi API đơn hàng cần đăng nhập (FR-07)
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') rawKey?: string,
  ) {
    return this.orders.create(user.id, dto, readIdempotencyKey(rawKey, false));
  }
}
