import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS chỉ cho origin của web (có thể liệt kê nhiều origin, cách nhau bằng dấu phẩy)
  app.enableCors({ origin: (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',') });
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
const thuCiDo = 1;
