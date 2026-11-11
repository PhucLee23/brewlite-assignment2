import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Bản Docker ở local chạy server Next.js gọn nhẹ (ADR-004)
  output: 'standalone',
};

export default nextConfig;
