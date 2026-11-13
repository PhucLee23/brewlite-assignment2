import { expect, test } from '@playwright/test';
import { addToCart, finishOnVnpay, login, payWithVnpay, registerCustomer } from './helpers';

// E2E-T01: Menu → chi tiết → giỏ → đăng nhập → thanh toán trên trang VNPay → xác nhận đơn (UC-06 luồng chính)
test('E2E-T01 đặt và thanh toán thành công qua VNPay', async ({ page, request }) => {
  const customer = await registerCustomer(request);

  await addToCart(page, 'Cà phê sữa đá', 'M', 2);
  await addToCart(page, 'Bạc xỉu', 'S');
  await expect(page.getByTestId('cart-count')).toHaveText('3');

  await page.getByRole('link', { name: 'Giỏ hàng', exact: true }).click();
  await expect(page.getByTestId('cart-total')).toHaveText('100.000đ'); // 34.000 × 2 + 32.000
  await page.getByRole('link', { name: 'Thanh toán' }).click();

  // A1: chưa đăng nhập thì sang trang đăng nhập, xong quay lại đúng trang thanh toán
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
  await login(page, customer.email, customer.password);
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByLabel('Mã giảm giá').fill('BREW10');
  await page.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page.locator('p', { hasText: 'Đã áp mã' })).toContainText('BREW10: giảm 10.000đ');
  await expect(page.getByTestId('checkout-total')).toHaveText('90.000đ');

  // Web chuyển sang trang VNPay; đơn vẫn chờ tới khi cổng xác nhận
  await payWithVnpay(page, '90.000đ');
  await finishOnVnpay(page, 'Thanh toán');

  // Cổng chuyển khách về kèm kết quả có chữ ký; API kiểm tra rồi web mở màn hình xác nhận
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  await expect(page.getByText('Đặt món thành công')).toBeVisible();
  await expect(page.getByText('Đã thanh toán')).toBeVisible();
  await expect(page.getByTestId('order-total')).toHaveText('90.000đ');
  await expect(page.getByText('Bạn vừa được cộng 90 điểm thưởng.')).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveCount(0); // giỏ đã được xóa

  // Biên lai: bằng chứng giao dịch do cổng xác nhận (FR-26)
  await page.getByRole('link', { name: 'Xem biên lai thanh toán' }).click();
  await expect(page.getByRole('heading', { name: 'Giao dịch thành công' })).toBeVisible();
  await expect(page.getByText('NCB', { exact: true })).toBeVisible();
});

// E2E-T02: bấm Hủy giao dịch ở VNPay → giỏ giữ nguyên → thanh toán lại thành công, vẫn một đơn (E5, A5)
test('E2E-T02 hủy ở cổng thì giữ giỏ và thanh toán lại được', async ({ page, request }) => {
  const customer = await registerCustomer(request);
  await page.goto('/login');
  await login(page, customer.email, customer.password);
  await expect(page).toHaveURL('/');

  await addToCart(page, 'Latte', 'L');
  await page.goto('/checkout');
  await payWithVnpay(page, '55.000đ');
  await finishOnVnpay(page, 'Hủy giao dịch');

  await expect(page.getByRole('heading', { name: 'Thanh toán không thành công' })).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  // Thanh toán lại ngay trên trang kết quả, cùng đơn cũ
  await payWithVnpay(page, '55.000đ');
  await finishOnVnpay(page, 'Thanh toán');

  await expect(page.getByText('Đặt món thành công')).toBeVisible();
  await page.goto('/orders');
  await expect(page.getByRole('link', { name: /Đơn #\d+/ })).toHaveCount(1);
});
