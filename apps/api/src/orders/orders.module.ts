import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PaymentsModule } from '../payments/payments.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PromotionsModule, PaymentsModule, LoyaltyModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService],
  exports: [OrdersService],
})
export class OrdersModule {}
