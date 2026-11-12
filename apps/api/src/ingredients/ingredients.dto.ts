import { IsInt, Max, Min } from 'class-validator';

export class RestockDto {
  /** Lượng nhập thêm, tính theo đơn vị của nguyên liệu (g, ml, cái) */
  @IsInt({ message: 'Số lượng nhập phải là số nguyên' })
  @Min(1, { message: 'Số lượng nhập tối thiểu là 1' })
  @Max(1_000_000, { message: 'Số lượng nhập tối đa là 1.000.000 mỗi lần' })
  amount: number;
}
