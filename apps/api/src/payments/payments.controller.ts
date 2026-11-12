import { Body, Controller, Get, Headers, HttpCode, Ip, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { readIdempotencyKey } from '../common/idempotency-key';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { ConfirmReturnDto, CreatePaymentDto } from './payments.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Mở phiên ở cổng MoMo hoặc VNPay, trả link sang trang thanh toán của cổng; header Idempotency-Key bắt buộc (FR-11, FR-12) */
  @Post()
  @UseGuards(JwtAuthGuard)
  open(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentDto,
    @Ip() ip: string,
    @Headers('idempotency-key') rawKey?: string,
  ) {
    return this.payments.open(user, dto, readIdempotencyKey(rawKey, true)!, ipv4(ip));
  }

  /** IPN của MoMo: server gọi server, xác thực bằng chữ ký trong body thay cho JWT. MoMo cần HTTP 204 */
  @Post('momo/ipn')
  @HttpCode(204)
  momoIpn(@Body() body: Record<string, unknown>) {
    return this.payments.momoIpn(body);
  }

  /** IPN của VNPay: xác thực bằng vnp_SecureHash; luôn trả 200 kèm RspCode theo tài liệu VNPay */
  @Get('vnpay/ipn')
  vnpayIpn(@Query() query: Record<string, unknown>) {
    return this.payments.vnpayIpn(query);
  }

  /** Trang chờ hỏi kết quả mỗi 1,5 giây (FR-11) */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.payments.getForUser(user, id);
  }

  /** Web gửi lên tham số cổng gắn vào link khi chuyển khách về BrewLite */
  @Post(':id/return')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  confirmReturn(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number, @Body() dto: ConfirmReturnDto) {
    return this.payments.confirmReturn(user, id, dto.params);
  }
}

/** VNPay cần địa chỉ IPv4 của khách */
function ipv4(ip: string) {
  const v4 = ip?.replace(/^::ffff:/, '');
  return /^\d+\.\d+\.\d+\.\d+$/.test(v4) ? v4 : '127.0.0.1';
}
