import { execSync } from 'child_process';
import { createRequire } from 'module';
import { join } from 'path';
import { adminDatabaseUrl, API_DIR, testDatabaseUrl } from './test-db';

// globalSetup chạy ngoài môi trường module của Jest nên lấy Prisma Client từ apps/api
const { PrismaClient } = createRequire(join(API_DIR, 'package.json'))('@prisma/client');

// Chạy một lần trước mọi test: tạo CSDL test nếu chưa có, áp migration (giống production: migrate deploy),
// xóa dữ liệu của lần chạy trước rồi seed lại
export default async function globalSetup() {
  const url = testDatabaseUrl();
  const dbName = new URL(url).pathname.slice(1);
  // Chặn nhầm CSDL thật: bước dọn dữ liệu bên dưới chỉ chạy trên CSDL có tên chứa "test"
  if (!dbName.includes('test')) throw new Error(`CSDL test phải có tên chứa "test", đang là "${dbName}"`);

  const admin = new PrismaClient({ datasourceUrl: adminDatabaseUrl() });
  try {
    const rows: unknown[] = await admin.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (rows.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.$disconnect();
  }

  const env = { ...process.env, DATABASE_URL: url };
  execSync('npx prisma migrate deploy', { cwd: API_DIR, env, stdio: 'inherit' });

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const tables: { tablename: string }[] =
      await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length > 0) {
      await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await db.$disconnect();
  }
  execSync('npx prisma db seed', { cwd: API_DIR, env, stdio: 'inherit' });
}
