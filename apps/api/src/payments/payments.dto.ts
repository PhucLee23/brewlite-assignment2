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

/** Trạng thái hiển thị của phiên: EXPIRED = phiên hết hạn mà cổng chưa báo kết quả */
export type PaymentDisplayStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
