import { expect, test } from '@playwright/test';
import { API_URL, login, paidOrderViaApi } from './helpers';

// E2E-T03: nhân viên quầy chuyển đơn PAID → PREPARING → READY → COMPLETED (UC-10)
test('E2E-T03 nhân viên quầy xử lý đơn đã thanh toán', async ({ page, request }) => {
  const { order, auth } = await paidOrderViaApi(request);

  // Nhân viên đăng nhập từ trang chủ thì vào thẳng màn hình quầy
  await page.goto('/login');
  await login(page, 'barista@brewlite.vn', '123456');
  await expect(page).toHaveURL(/\/staff$/);

  // Mỗi bước bấm xong, đơn rời nhóm hiện tại và sang nhóm kế tiếp
  const card = page.getByTestId(`staff-order-${order.id}`);
  const openTab = (name: string) => page.getByRole('tab', { name: new RegExp(`^${name} \\(`) }).click();
  await expect(card).toBeVisible();
  await expect(card.getByText('Đã thanh toán')).toBeVisible();
  await card.getByRole('button', { name: 'Bắt đầu pha' }).click();
  await expect(card).toHaveCount(0);
  await openTab('Đang pha');
  await expect(card.getByText('Đang pha chế')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Hủy đơn' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Báo sẵn sàng' }).click();
  await openTab('Sẵn sàng');
  await expect(card.getByText('Sẵn sàng – mời nhận nước')).toBeVisible();
  await card.getByRole('button', { name: 'Đã giao nước' }).click();
  await expect(card).toHaveCount(0);
  await openTab('Đã giao');
  await expect(card.getByText('Hoàn tất')).toBeVisible();

  const final = await (await request.get(`${API_URL}/orders/${order.id}`, { headers: auth })).json();
  expect(final.status).toBe('COMPLETED');
});

// E2E-T03 (hủy): đơn đã thanh toán chưa pha, nhân viên hủy tại quầy; tiền hiện ở mục Cần hoàn tiền (FR-19, FR-26)
test('E2E-T03 nhân viên hủy đơn đã thanh toán chưa pha', async ({ page, request }) => {
  const { order, auth } = await paidOrderViaApi(request);

  await page.goto('/login');
  await login(page, 'barista@brewlite.vn', '123456');
  await expect(page).toHaveURL(/\/staff$/);

  const card = page.getByTestId(`staff-order-${order.id}`);
  page.once('dialog', (dialog) => void dialog.accept());
  await card.getByRole('button', { name: 'Hủy đơn' }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole('tab', { name: /^Đã hủy \(/ }).click();
  await expect(card.getByText('Đã hủy')).toBeVisible();

  const final = await (await request.get(`${API_URL}/orders/${order.id}`, { headers: auth })).json();
  expect(final.status).toBe('CANCELLED');

  await page.getByRole('link', { name: 'Doanh thu' }).click();
  await page.getByRole('button', { name: 'Cần hoàn tiền', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: `Đơn #${order.id} ·` })).toContainText('Cần hoàn tiền');
});

// E2E-T04: nhân viên nhập thêm nguyên liệu ở trang Kho, số ly còn bán được tăng theo (FR-24)
test('E2E-T04 nhân viên nhập kho nguyên liệu', async ({ page }) => {
  await page.goto('/login');
  await login(page, 'barista@brewlite.vn', '123456');
  await expect(page).toHaveURL(/\/staff$/);

  await page.getByRole('link', { name: 'Kho', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kho nguyên liệu' })).toBeVisible();
  const item = page.getByRole('listitem').filter({ hasText: 'Tép bưởi hồng' }).filter({ has: page.getByRole('button') });
  await item.getByLabel(/Số lượng Tép bưởi hồng nhập thêm/).fill('500');
  await item.getByRole('button', { name: 'Nhập kho' }).click();
  await expect(item.getByText('Đã nhập thêm 500 g')).toBeVisible();

  // Trà bưởi hồng dùng 50 g mỗi ly S nên bán lại được
  await page.goto('/');
  const card = page.getByRole('link', { name: /Trà bưởi hồng/ });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('Hết hàng');
});
