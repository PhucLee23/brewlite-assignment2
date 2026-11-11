import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const startedAt = Date.now();

// NFR-07: Render và pipeline CD gọi endpoint này để kiểm tra API và kết nối CSDL
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const info = {
      version: process.env.APP_VERSION ?? 'dev',
      uptime: Math.round((Date.now() - startedAt) / 1000),
    };
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down', ...info });
    }
    return { status: 'ok', db: 'ok', ...info };
  }
}
