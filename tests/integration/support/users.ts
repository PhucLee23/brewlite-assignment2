import { INestApplication } from '@nestjs/common';
import request from 'supertest';

let counter = 0;

/** Đăng ký một khách hàng mới (email không trùng giữa các lần chạy) và trả JWT */
export async function registerCustomer(app: INestApplication, fullName = 'Khách Test') {
  counter += 1;
  const email = `khach-${Date.now()}-${counter}@test.vn`;
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: '123456', fullName })
    .expect(201);
  return { token: res.body.accessToken as string, user: res.body.user as { id: number; email: string } };
}

/** Đăng nhập tài khoản nhân viên quầy có sẵn trong seed */
export async function loginStaff(app: INestApplication) {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'barista@brewlite.vn', password: '123456' })
    .expect(200);
  return res.body.accessToken as string;
}
