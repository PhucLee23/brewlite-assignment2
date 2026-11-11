import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // Đọc biến môi trường từ apps/api/.env hoặc .env ở thư mục gốc repository
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
  ],
})
export class AppModule {}
