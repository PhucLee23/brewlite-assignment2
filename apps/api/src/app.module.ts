import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    // Đọc biến môi trường từ apps/api/.env hoặc .env ở thư mục gốc repository
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    ProductsModule,
  ],
})
export class AppModule {}
