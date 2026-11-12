import { testDatabaseUrl } from './test-db';

// Mỗi tiến trình test dùng CSDL test và cấu hình cố định, không đụng CSDL dev
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.FRONTEND_URL ??= 'http://localhost:3000';
process.env.JWT_SECRET ??= 'jwt-secret-cho-test';
