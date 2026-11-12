// Kiểm tra biến môi trường bắt buộc ngay khi khởi động; thiếu thì dừng (architecture §3.6).
const REQUIRED = ['DATABASE_URL', 'FRONTEND_URL', 'JWT_SECRET'];

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. Xem .env.example`);
  }
  return config;
}
