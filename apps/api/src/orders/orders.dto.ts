import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { SIZES, type Size } from '../products/pricing';

// BR-03: mỗi dòng 1–20 ly, tối đa 5 topping; mỗi đơn tối đa 30 dòng. Không nhận giá từ client (BR-02).
export class OrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1, { message: 'productId không hợp lệ' })
  productId: number;

  @IsIn(SIZES, { message: 'Size phải là S, M hoặc L' })
  size: Size;

  @IsOptional()
  @IsArray({ message: 'toppingIds phải là mảng' })
  @ArrayMaxSize(5, { message: 'Mỗi ly tối đa 5 topping' })
  @ArrayUnique({ message: 'Topping bị chọn trùng' })
  @IsInt({ each: true, message: 'toppingIds chỉ gồm số nguyên' })
  toppingIds: number[] = [];

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng mỗi dòng từ 1 đến 20' })
  @Max(20, { message: 'Số lượng mỗi dòng từ 1 đến 20' })
  qty: number;
}

export class CreateOrderDto {
  @IsArray({ message: 'items phải là mảng' })
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất một món' })
  @ArrayMaxSize(30, { message: 'Mỗi đơn tối đa 30 dòng' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString({ message: 'Mã giảm giá phải là chuỗi' })
  @Length(1, 30, { message: 'Mã giảm giá tối đa 30 ký tự' })
  promotionCode?: string;
}
