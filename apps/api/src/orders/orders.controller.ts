import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { readIdempotencyKey } from '../common/idempotency-key';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { OrderLifecycleService } from './order-lifecycle.service';
import { StaffOrdersQuery, UpdateOrderStatusDto } from './order-status.dto';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

// Mọi API đơn hàng cần đăng nhập (FR-07)
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') rawKey?: string,
  ) {
    return this.orders.create(user.id, dto, readIdempotencyKey(rawKey, false));
  }

  /** FR-19: màn hình quầy, chỉ nhân viên */
  @Get()
  @Roles('STAFF')
  listForStaff(@Query() query: StaffOrdersQuery) {
    return this.lifecycle.listForStaff(query.status);
  }

  // Khai báo trước ':id' để "counts", "me" không bị hiểu là mã đơn
  /** FR-19: số đơn mỗi nhóm trên màn hình quầy, chỉ nhân viên */
  @Get('counts')
  @Roles('STAFF')
  countsForStaff() {
    return this.lifecycle.countsForStaff();
  }

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.orders.findOneFor(user, id);
  }

  /** FR-16: khách hủy đơn của mình */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.lifecycle.cancelByCustomer(user, id);
  }

  /** FR-18: nhân viên quầy cập nhật trạng thái pha chế */
  @Patch(':id/status')
  @Roles('STAFF')
  changeStatus(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.lifecycle.changeStatus(id, dto.status);
  }
}
