import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const API_DIR = join(__dirname, '../../../apps/api');

// Đọc DATABASE_URL từ apps/api/.env hoặc .env gốc khi chạy ở máy cá nhân
function fromEnvFile(): string | undefined {
  for (const file of [join(API_DIR, '.env'), join(API_DIR, '../../.env')]) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith('DATABASE_URL='));
    if (line) return line.slice('DATABASE_URL='.length).replace(/^"|"$/g, '');
  }
  return undefined;
}

function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

/** CSDL dùng cho test: TEST_DATABASE_URL nếu có, ngược lại cùng máy chủ với DATABASE_URL nhưng tên `brewlite_test` */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base =
    process.env.DATABASE_URL ?? fromEnvFile() ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite?schema=public';
  return withDatabase(base, 'brewlite_test');
}

/** Kết nối tới CSDL quản trị `postgres` trên cùng máy chủ để tạo CSDL test */
export function adminDatabaseUrl(): string {
  return withDatabase(testDatabaseUrl(), 'postgres');
}
