import { OrderStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsIn, IsOptional } from 'class-validator';

/** BR-07: nhân viên chỉ đặt được các trạng thái pha chế và hủy; PAID / PAYMENT_FAILED chỉ do kết quả có chữ ký của cổng đặt */
export const STAFF_STATUSES: OrderStatus[] = ['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

export class UpdateOrderStatusDto {
  @IsIn(STAFF_STATUSES, { message: 'Nhân viên chỉ được đặt trạng thái PREPARING, READY, COMPLETED hoặc CANCELLED' })
  status: OrderStatus;
}

/** FR-19: 5 nhóm của màn hình quầy; ba nhóm đầu là hàng chờ đang xử lý */
export const COUNTER_STATUSES: OrderStatus[] = ['PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
export const COUNTER_QUEUE: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];

/** `?status=PAID,PREPARING,READY` – mặc định là các đơn cần pha chế */
export class StaffOrdersQuery {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim().toUpperCase()) : value))
  @ArrayNotEmpty({ message: 'status không được rỗng' })
  @IsIn(Object.values(OrderStatus), { each: true, message: 'status không hợp lệ' })
  status: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];
}
