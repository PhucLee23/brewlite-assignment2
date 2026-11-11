import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithQuery } from '@/test/render';
import MenuPage from './page';

const products = [
  { id: 1, name: 'Cà phê sữa đá', description: '', price: 29000, imageUrl: '/images/ca-phe-sua.jpg', stock: 100 },
  { id: 4, name: 'Cold brew', description: '', price: 45000, imageUrl: '/images/cold-brew.jpg', stock: 3 },
  { id: 10, name: 'Trà bưởi hồng', description: '', price: 42000, imageUrl: '/images/tra-buoi-hong.jpg', stock: 0 },
];

// CT-01: trang Menu – đang tải, trống, lỗi, nhãn tồn kho (FR-01, FR-02, NFR-08)
describe('CT-01 trang Menu', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hiển thị khung chờ khi đang tải rồi lưới món với giá VNĐ', async () => {
    mockFetch(products);
    renderWithQuery(<MenuPage />);
    expect(screen.getByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
    expect(await screen.findByText('Cà phê sữa đá')).toBeInTheDocument();
    expect(screen.getByText('29.000đ')).toBeInTheDocument();
  });

  it('nhãn "Hết hàng" khi stock = 0 và "Còn N" khi 1 ≤ stock ≤ 5', async () => {
    mockFetch(products);
    renderWithQuery(<MenuPage />);
    expect(await screen.findByText('Hết hàng')).toBeInTheDocument();
    expect(screen.getByText('Còn 3')).toBeInTheDocument();
  });

  it('danh sách rỗng hiển thị "Menu đang được cập nhật"', async () => {
    mockFetch([]);
    renderWithQuery(<MenuPage />);
    expect(await screen.findByText('Menu đang được cập nhật')).toBeInTheDocument();
  });

  it('lỗi kết nối hiển thị thông báo và nút Thử lại tải lại được', async () => {
    const fetch = mockFetch(null, products);
    renderWithQuery(<MenuPage />);
    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Cold brew')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
