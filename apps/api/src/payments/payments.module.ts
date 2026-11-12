import { Module } from '@nestjs/common';
import { GatewayHttp } from './gateways/gateway';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  // GatewayHttp gọi API của MoMo, VNPay; integration test thay bằng cổng giả (ADR-010)
  providers: [PaymentsService, GatewayHttp],
  exports: [PaymentsService],
})
export class PaymentsModule {}
