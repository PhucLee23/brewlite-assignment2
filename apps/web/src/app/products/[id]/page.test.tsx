import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithQuery } from '@/test/render';
import { useCart } from '@/store/cart';
import ProductDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '4' }) }));

const coldBrew = {
  id: 4,
  name: 'Cold brew',
  description: 'Ủ lạnh 18 giờ',
  price: 45000,
  imageUrl: '/images/cold-brew.jpg',
  stock: 5,
  sizes: [
    { size: 'S', surcharge: 0, price: 45000, stock: 5 },
    { size: 'M', surcharge: 5000, price: 50000, stock: 4 },
    { size: 'L', surcharge: 10000, price: 55000, stock: 3 },
  ],
  toppings: [
    { id: 1, name: 'Trân châu đen', price: 8000, stock: 40 },
    { id: 3, name: 'Kem cheese', price: 10000, stock: 0 },
  ],
};

const addButton = () => screen.getByRole('button', { name: /Thêm vào giỏ|Đã đủ|Hết/ });

// CT-02: trang chi tiết – thành tiền theo lựa chọn, giới hạn số lượng theo tồn kho (FR-03, FR-05)
describe('CT-02 trang chi tiết món', () => {
  beforeEach(() => {
    localStorage.clear();
    useCart.setState({ lines: [] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('thành tiền cập nhật ngay khi đổi size, topping, số lượng (BR-01)', async () => {
    mockFetch(coldBrew);
    renderWithQuery(<ProductDetailPage />);
    expect(await screen.findByRole('heading', { name: 'Cold brew' })).toBeInTheDocument();
    expect(addButton()).toHaveTextContent('45.000đ');

    fireEvent.click(screen.getByLabelText('Size L'));
    expect(addButton()).toHaveTextContent('55.000đ');

    fireEvent.click(screen.getByRole('checkbox', { name: /Trân châu đen/ }));
    expect(addButton()).toHaveTextContent('63.000đ');

    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
    expect(addButton()).toHaveTextContent('126.000đ');
  });

  it('thêm vào giỏ đúng lựa chọn và đơn giá', async () => {
    mockFetch(coldBrew);
    renderWithQuery(<ProductDetailPage />);
    await screen.findByRole('heading', { name: 'Cold brew' });
    fireEvent.click(screen.getByLabelText('Size M'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Trân châu đen/ }));
    fireEvent.click(addButton());
    expect(useCart.getState().lines).toEqual([
      expect.objectContaining({ productId: 4, size: 'M', unitPrice: 58000, qty: 1, toppings: [coldBrew.toppings[0]] }),
    ]);
    expect(screen.getByText(/Đã thêm vào giỏ/)).toBeInTheDocument();
  });

  it('số lượng tối đa = tồn kho − số ly đã có trong giỏ', async () => {
    useCart.getState().add(
      { productId: 4, name: 'Cold brew', imageUrl: '', size: 'S', toppings: [], unitPrice: 45000 },
      3,
    );
    mockFetch(coldBrew);
    renderWithQuery(<ProductDetailPage />);
    await screen.findByRole('heading', { name: 'Cold brew' });
    const plus = screen.getByRole('button', { name: 'Tăng số lượng' });
    fireEvent.click(plus);
    expect(screen.getByTestId('qty')).toHaveTextContent('2');
    expect(plus).toBeDisabled();
    expect(screen.getByText('Đã có 3 ly trong giỏ.')).toBeInTheDocument();
  });

  it('số ly tối đa theo size: Cold brew size L chỉ còn 3 ly; topping hết nguyên liệu không chọn được (BR-09)', async () => {
    mockFetch(coldBrew);
    renderWithQuery(<ProductDetailPage />);
    await screen.findByRole('heading', { name: 'Cold brew' });
    fireEvent.click(screen.getByLabelText('Size L'));
    expect(screen.getByText('Giá từ 45.000đ · Còn 3 ly size L')).toBeInTheDocument();
    const plus = screen.getByRole('button', { name: 'Tăng số lượng' });
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(screen.getByTestId('qty')).toHaveTextContent('3');
    expect(plus).toBeDisabled();
    expect(screen.getByText('Chỉ còn 3 ly với lựa chọn này.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Kem cheese/ })).toBeDisabled();
  });

  it('món đã đủ số lượng trong giỏ hoặc hết hàng thì không thêm được', async () => {
    useCart.getState().add({ productId: 4, name: 'Cold brew', imageUrl: '', size: 'S', toppings: [], unitPrice: 45000 }, 5);
    mockFetch(coldBrew);
    renderWithQuery(<ProductDetailPage />);
    await screen.findByRole('heading', { name: 'Cold brew' });
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveTextContent('Đã đủ số lượng còn lại trong giỏ');
  });
});
