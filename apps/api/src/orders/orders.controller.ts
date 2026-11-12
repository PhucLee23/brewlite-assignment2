import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { readIdempotencyKey } from '../common/idempotency-key';
import { ParseIdPipe } from '../common/parse-id.pipe';
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

  // Khai báo trước ':id' để "me" không bị hiểu là mã đơn
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.orders.findOneFor(user, id);
  }
}
