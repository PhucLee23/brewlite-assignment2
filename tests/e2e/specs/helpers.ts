import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = process.env.API_URL ?? 'http://localhost:4000';

let counter = 0;

/** Đăng ký khách mới qua API để mỗi test có tài khoản riêng */
export async function registerCustomer(request: APIRequestContext) {
  counter += 1;
  const email = `e2e-${Date.now()}-${counter}@test.vn`;
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, password: '123456', fullName: 'Khách E2E' },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return { email, password: '123456', token: body.accessToken as string };
}

/** Menu → chi tiết món → chọn size → thêm vào giỏ (UC-01 – UC-03) */
export async function addToCart(page: Page, productName: string, size: 'S' | 'M' | 'L', qty = 1) {
  await page.goto('/');
  // Tên link = tên món rồi tới giá, ví dụ "Latte 45.000đ" (không lẫn với "Matcha latte", "Latte caramel muối")
  await page.getByRole('link', { name: new RegExp(`^${productName} \\d`) }).click();
  await expect(page.getByRole('heading', { level: 1, name: productName, exact: true })).toBeVisible();
  await page.getByText(`Size ${size}`, { exact: true }).click();
  for (let i = 1; i < qty; i++) await page.getByRole('button', { name: 'Tăng số lượng' }).click();
  await page.getByRole('button', { name: /Thêm vào giỏ/ }).click();
  await expect(page.getByText('Đã thêm vào giỏ.')).toBeVisible();
}

export async function login(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

/** Chọn VNPay ở form thanh toán rồi bấm nút thanh toán: web chuyển sang trang của cổng (UC-06 bước 8–9) */
export async function payWithVnpay(page: Page, total: string) {
  await page.getByText('VNPay', { exact: true }).click();
  await page.getByRole('button', { name: `Thanh toán ${total} qua VNPay` }).click();
}

/** Trên trang cổng VNPay (cổng giả của E2E): bấm Thanh toán hoặc Hủy giao dịch, cổng chuyển khách về BrewLite */
export async function finishOnVnpay(page: Page, action: 'Thanh toán' | 'Hủy giao dịch') {
  await expect(page.getByRole('heading', { name: 'Cổng VNPay giả lập' })).toBeVisible();
  await page.getByRole('button', { name: action, exact: true }).click();
  await expect(page).toHaveURL(/\/payments\/\d+/);
}

/** Chuẩn bị qua API: khách đặt một ly và trả bằng VNPay (đi qua trang cổng, rồi gửi kết quả có chữ ký về API) */
export async function paidOrderViaApi(request: APIRequestContext) {
  const customer = await registerCustomer(request);
  const auth = { Authorization: `Bearer ${customer.token}` };
  const order = await (
    await request.post(`${API_URL}/orders`, { headers: auth, data: { items: [{ productId: 1, size: 'S', qty: 1 }] } })
  ).json();
  const payment = await (
    await request.post(`${API_URL}/payments`, {
      headers: { ...auth, 'Idempotency-Key': `e2e-${Date.now()}-${++counter}` },
      data: { orderId: order.id, provider: 'VNPAY' },
    })
  ).json();
  const payUrl = new URL(payment.paymentUrl);
  const result = await request.post(`${payUrl.origin}/paymentv2/result`, {
    form: { ...Object.fromEntries(payUrl.searchParams), action: 'pay' },
    maxRedirects: 0,
  });
  const back = new URL(result.headers()['location']);
  const confirm = await request.post(`${API_URL}/payments/${payment.id}/return`, {
    headers: auth,
    data: { params: Object.fromEntries(back.searchParams) },
  });
  expect(confirm.ok()).toBe(true);
  return { order, auth };
}
