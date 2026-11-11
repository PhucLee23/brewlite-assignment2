import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../../apps/api/src/app.module';
import { configureApp } from '../../../apps/api/src/app.setup';
import { PrismaService } from '../../../apps/api/src/prisma/prisma.service';

/** Dựng API với cấu hình giống main.ts; `override` cho phép thay provider (ví dụ giả lập mất CSDL) */
export async function createTestApp(
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<{ app: INestApplication; prisma: PrismaService }> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (override) builder = override(builder);
  const moduleRef = await builder.compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}
