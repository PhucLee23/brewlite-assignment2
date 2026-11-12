import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../../apps/api/src/app.module';
import { configureApp } from '../../../apps/api/src/app.setup';
import { GatewayHttp } from '../../../apps/api/src/payments/gateways/gateway';
import { PrismaService } from '../../../apps/api/src/prisma/prisma.service';
import { FakeGateways } from './fake-gateways';

/**
 * Dựng API với cấu hình giống main.ts; `override` cho phép thay provider (ví dụ giả lập mất CSDL).
 * Cổng MoMo, VNPay luôn được thay bằng cổng giả để test không gọi Internet.
 */
export async function createTestApp(
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<{ app: INestApplication; prisma: PrismaService; gateways: FakeGateways }> {
  const gateways = new FakeGateways();
  let builder = Test.createTestingModule({ imports: [AppModule] }).overrideProvider(GatewayHttp).useValue(gateways);
  if (override) builder = override(builder);
  const moduleRef = await builder.compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return { app, prisma: app.get(PrismaService), gateways };
}
