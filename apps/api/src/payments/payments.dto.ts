import { PaymentProvider } from '@prisma/client';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsInt({ message: 'orderId phải là số nguyên' })
  @Min(1, { message: 'orderId không hợp lệ' })
  orderId: number;

  @IsIn(['MOMO', 'VNPAY'], { message: 'Cổng thanh toán phải là MOMO hoặc VNPAY' })
  provider: PaymentProvider;

  /** Địa chỉ web khách đang mở, để cổng chuyển khách về đúng chỗ (phải nằm trong FRONTEND_URL) */
  @IsOptional()
  @IsString({ message: 'returnOrigin phải là chuỗi' })
  @Matches(/^https?:\/\/[^/]+$/, { message: 'returnOrigin phải có dạng http(s)://tên-miền[:cổng]' })
  returnOrigin?: string;
}

/** Tham số cổng gắn vào link khi chuyển khách về BrewLite (có chữ ký của cổng) */
export class ConfirmReturnDto {
  @IsObject({ message: 'params phải là object' })
  params: Record<string, string>;
}

/**
 * Bộ lọc của trang giao dịch (FR-26): EXPIRED = phiên hết hạn chưa có kết quả từ cổng;
 * REFUND_DUE = tiền đã nhận nhưng đơn đã hủy, nhân viên hoàn lại tại quầy
 */
export const PAYMENT_FILTERS = ['SUCCESS', 'REFUND_DUE', 'PROCESSING', 'FAILED', 'EXPIRED'] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export class ListPaymentsQuery {
  @IsOptional()
  @IsIn(PAYMENT_FILTERS, { message: 'status phải là SUCCESS, REFUND_DUE, PROCESSING, FAILED hoặc EXPIRED' })
  status?: PaymentFilter;
}
