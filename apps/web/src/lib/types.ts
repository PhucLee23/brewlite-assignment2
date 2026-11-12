// Kiểu dữ liệu trả về từ API (khớp docs/diagrams/class-domain.puml)

export type Size = 'S' | 'M' | 'L';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

// `stock` của size và topping là số ly / số phần còn làm được, tính từ nguyên liệu (BR-09)
export interface ProductDetail extends Product {
  sizes: { size: Size; surcharge: number; price: number; stock: number }[];
  toppings: (Topping & { stock: number })[];
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'PAYMENT_FAILED' | 'CANCELLED';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  size: Size;
  toppings: string[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export type PaymentProvider = 'MOMO' | 'VNPAY';

/** Trạng thái hiển thị của giao dịch (FR-26): EXPIRED = phiên hết hạn, REFUND_DUE = đơn đã hủy, cần hoàn tiền */
export type PaymentDisplayStatus = 'SUCCESS' | 'REFUND_DUE' | 'PROCESSING' | 'FAILED' | 'EXPIRED';

export interface Order {
  id: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  promotionCode: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  loyalty: { type: 'EARN' | 'REVOKE'; points: number }[];
  /** Giao dịch đã thanh toán thành công, để mở biên lai */
  payments: { id: number; provider: PaymentProvider }[];
}

/** Phiên thanh toán ở cổng (POST /payments, GET /payments/:id); `paymentUrl` chỉ có khi phiên còn mở (FR-11) */
export interface PaymentSession {
  id: number;
  orderId: number;
  amount: number;
  provider: PaymentProvider;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  displayStatus: PaymentDisplayStatus;
  gatewayOrderId: string;
  gatewayRef: string | null;
  confirmedAt: string | null;
  paymentUrl: string | null;
  expiresAt: string;
  replayed: boolean;
  order: { id: number; status: OrderStatus; total: number };
}

/** Biên lai: bằng chứng giao dịch do cổng MoMo/VNPay xác nhận (GET /payments/:id/receipt) */
export interface Receipt {
  payment: {
    id: number;
    amount: number;
    provider: PaymentProvider;
    displayStatus: PaymentDisplayStatus;
    gatewayOrderId: string;
    gatewayRef: string | null;
    bankCode: string | null;
    payType: string | null;
    confirmedAt: string | null;
  };
  order: Order;
  customer: { fullName: string; email: string };
  gatewayResult: Record<string, unknown> | null;
}
