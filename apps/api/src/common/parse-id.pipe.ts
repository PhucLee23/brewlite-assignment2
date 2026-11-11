import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const MAX_INT = 2147483647;

/** Chuyển tham số `:id` trên đường dẫn thành số nguyên dương; sai định dạng trả 400 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1 || id > MAX_INT) {
      throw new BadRequestException('Mã không hợp lệ, phải là số nguyên dương');
    }
    return id;
  }
}
