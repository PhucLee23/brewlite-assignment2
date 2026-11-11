import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

// Gom thông báo lỗi của mọi trường (kể cả trường lồng nhau trong mảng)
function collect(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((e) => {
    const path = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.entries(e.constraints ?? {}).map(([rule, message]) =>
      rule === 'whitelistValidation' ? `Trường "${path}" không được phép gửi lên` : message,
    );
    return [...own, ...collect(e.children ?? [], path)];
  });
}

/**
 * Validate DTO theo whitelist (NFR-04): trường lạ trả 400, dữ liệu được chuyển kiểu theo DTO.
 * Thông báo lỗi tiếng Việt khai báo ngay trong DTO bằng tùy chọn `message`.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException(collect(errors)),
  });
}
