import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Prisma kết nối khi có truy vấn đầu tiên, nên API vẫn khởi động được khi CSDL tạm mất
// (health check báo 503 thay vì tiến trình bị dừng).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
