import { testDatabaseUrl } from './test-db';

// Mỗi tiến trình test dùng CSDL test và cấu hình cố định, không đụng CSDL dev
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.FRONTEND_URL ??= 'http://localhost:3000';
process.env.JWT_SECRET ??= 'jwt-secret-cho-test';
// Khóa VNPay giả cho test: cổng giả (support/fake-gateways.ts) ký kết quả bằng chính khóa này, không gọi Internet
process.env.VNPAY_TMN_CODE = 'TESTTMN1';
process.env.VNPAY_HASH_SECRET = 'vnpay-secret-cho-test';
