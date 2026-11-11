import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';

// API-T14: GET /health trả 200 khi CSDL hoạt động, 503 khi không kết nối được (NFR-07)
describe('API-T14 GET /health', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('200 khi API và CSDL hoạt động', async () => {
    ({ app } = await createTestApp());
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
    expect(typeof res.body.uptime).toBe('number');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('503 khi không kết nối được CSDL', async () => {
    const downDb = {
      $queryRaw: () => Promise.reject(new Error('mất kết nối')),
      $disconnect: async () => undefined,
    };
    ({ app } = await createTestApp((b) => b.overrideProvider(PrismaService).useValue(downDb)));
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body).toMatchObject({ status: 'error', db: 'down' });
  });

  it('lỗi trả về bằng tiếng Việt: đường dẫn không tồn tại, JSON hỏng', async () => {
    ({ app } = await createTestApp());
    const notFound = await request(app.getHttpServer()).get('/khong-co').expect(404);
    expect(notFound.body.message).toBe('Không tìm thấy đường dẫn');

    const badJson = await request(app.getHttpServer())
      .post('/khong-co')
      .set('Content-Type', 'application/json')
      .send('{"thieu": ')
      .expect(400);
    expect(badJson.body.message).toBe('Dữ liệu gửi lên không phải JSON hợp lệ');
  });
});
