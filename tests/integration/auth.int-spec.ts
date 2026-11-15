import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';

// API-T02: đăng ký, đăng nhập, 401 khi thiếu token, không trả passwordHash (FR-06, FR-07, NFR-03)
describe('API-T02 xác thực', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `api-t02-${Date.now()}@test.vn`;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('đăng ký thành công trả JWT và thông tin người dùng, không có mật khẩu', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email.toUpperCase(), password: '123456', fullName: '  Nguyễn Văn A  ' })
      .expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: expect.any(Number), email, fullName: 'Nguyễn Văn A', role: 'CUSTOMER', loyaltyPoints: 0 });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('mật khẩu lưu dạng băm bcrypt cost 10', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('email trùng (không phân biệt hoa thường) trả 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email.toUpperCase(), password: '654321', fullName: 'Người khác' })
      .expect(409);
    expect(res.body.message).toBe('Email đã được đăng ký');
  });

  it('dữ liệu sai trả 400 kèm thông báo tiếng Việt', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'khong-phai-email', password: '123', fullName: 'A', role: 'STAFF' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Email không hợp lệ',
        'Mật khẩu phải dài từ 6 đến 72 ký tự',
        'Họ tên phải dài từ 2 đến 100 ký tự',
        'Trường "role" không được phép gửi lên',
      ]),
    );
  });

  it('đăng nhập đúng trả JWT; sai email hoặc sai mật khẩu đều trả 401 cùng một thông báo', async () => {
    const ok = await request(app.getHttpServer()).post('/auth/login').send({ email, password: '123456' }).expect(200);
    expect(ok.body.accessToken).toEqual(expect.any(String));

    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'sai-mat-khau' })
      .expect(401);
    const wrongEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'khong-ton-tai@test.vn', password: '123456' })
      .expect(401);
    expect(wrongPassword.body.message).toBe('Email hoặc mật khẩu không đúng');
    expect(wrongEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('mật khẩu giới hạn 72 byte vì bcrypt bỏ phần sau: chữ có dấu chiếm 3 byte', async () => {
    const register = (password: string) =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `api-t02-byte-${Date.now()}-${Math.random()}@test.vn`, password, fullName: 'Kiểm tra byte' });
    // 24 chữ "ệ" đủ 72 byte, thêm 1 ký tự là vượt dù mới 25 ký tự
    expect((await register('ệ'.repeat(24) + 'A').expect(400)).body.message).toEqual([
      'Mật khẩu quá dài: chữ có dấu tính 2–3 ký tự, tối đa 72 ký tự không dấu',
    ]);
    await register('ệ'.repeat(24)).expect(201);
    await register('a'.repeat(72)).expect(201);
  });

  it('đăng nhập bằng mật khẩu dài hơn 72 byte bị từ chối, kể cả khi 72 byte đầu trùng mật khẩu thật', async () => {
    const byteEmail = `api-t02-dai-${Date.now()}@test.vn`;
    const password = 'ệ'.repeat(24);
    await request(app.getHttpServer()).post('/auth/register').send({ email: byteEmail, password, fullName: 'Kiểm tra byte' }).expect(201);
    await request(app.getHttpServer()).post('/auth/login').send({ email: byteEmail, password }).expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: byteEmail, password: password + 'khac' })
      .expect(401);
  });

  it('GET /auth/me: 401 khi thiếu hoặc sai token, 200 khi token hợp lệ', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', 'Bearer abc.def.ghi').expect(401);

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: '123456' });
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email, role: 'CUSTOMER' });
    expect(me.body.passwordHash).toBeUndefined();
  });
});
