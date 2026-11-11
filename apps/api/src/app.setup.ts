import { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { createValidationPipe } from './common/validation';

/** Cấu hình dùng chung cho main.ts và integration test, để test chạy đúng như production */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  // CORS chỉ cho origin của web (có thể liệt kê nhiều origin, cách nhau bằng dấu phẩy)
  app.enableCors({
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
    exposedHeaders: ['X-Request-Id'],
  });
  return app;
}
