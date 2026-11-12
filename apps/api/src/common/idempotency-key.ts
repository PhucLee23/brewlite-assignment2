import { BadRequestException } from '@nestjs/common';

const FORMAT = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * Kiểm tra header `Idempotency-Key` (FR-10, FR-12): 8–100 ký tự chữ, số, "-", "_".
 * `required` = true cho thanh toán (bắt buộc), false cho tạo đơn (tùy chọn).
 */
export function readIdempotencyKey(raw: string | undefined, required: boolean): string | undefined {
  if (raw === undefined || raw === '') {
    if (required) throw new BadRequestException('Thiếu header Idempotency-Key');
    return undefined;
  }
  if (!FORMAT.test(raw)) {
    throw new BadRequestException('Idempotency-Key phải dài 8–100 ký tự, chỉ gồm chữ, số, "-" và "_"');
  }
  return raw;
}
