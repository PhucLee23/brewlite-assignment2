import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/app';

// API-T13: GET /promotions/:code?subtotal= với các mã trong seed (FR-09)
describe('API-T13 mã giảm giá', () => {
  let app: INestApplication;
  const check = (code: string, subtotal: number | string) =>
    request(app.getHttpServer()).get(`/promotions/${code}?subtotal=${subtotal}`);

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('mã hợp lệ trả số tiền giảm (không phân biệt hoa thường)', async () => {
    const res = await check('brew10', 58000).expect(200);
    expect(res.body).toEqual({ code: 'BREW10', percentOff: 10, valid: true, discount: 5800 });
  });

  it('chưa đạt tối thiểu, hết hạn, đã ngừng, không tồn tại: valid=false kèm lý do', async () => {
    expect((await check('WELCOME20', 50000).expect(200)).body).toMatchObject({ valid: false, reason: expect.stringContaining('tối thiểu') });
    expect((await check('WELCOME20', 100000).expect(200)).body).toMatchObject({ valid: true, discount: 20000 });
    expect((await check('HETHAN', 100000).expect(200)).body).toMatchObject({ valid: false, reason: 'Mã giảm giá đã hết hạn' });
    expect((await check('TAMNGUNG', 100000).expect(200)).body).toMatchObject({ valid: false, reason: 'Mã giảm giá đã ngừng áp dụng' });
    expect((await check('KHONGCO', 100000).expect(200)).body).toMatchObject({ valid: false, reason: 'Mã giảm giá không tồn tại' });
  });

  it('thiếu hoặc sai subtotal trả 400', async () => {
    await request(app.getHttpServer()).get('/promotions/BREW10').expect(400);
    const res = await check('BREW10', 'abc').expect(400);
    expect(res.body.message).toEqual(expect.arrayContaining(['subtotal (tạm tính) phải là số nguyên']));
    await check('BREW10', -1).expect(400);
  });
});
