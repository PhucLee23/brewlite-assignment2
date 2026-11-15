import { Transform } from 'class-transformer';
import { IsByteLength, IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

// FR-06: email, mật khẩu 6–72 ký tự, họ tên 2–100 ký tự.
// bcrypt chỉ đọc 72 byte đầu của mật khẩu; chữ có dấu chiếm 2–3 byte nên còn phải giới hạn theo byte.
export const PASSWORD_MAX_BYTES = 72;

export class RegisterDto {
  @Transform(lower)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @Length(6, 72, { message: 'Mật khẩu phải dài từ 6 đến 72 ký tự' })
  @IsByteLength(0, PASSWORD_MAX_BYTES, { message: 'Mật khẩu quá dài: chữ có dấu tính 2–3 ký tự, tối đa 72 ký tự không dấu' })
  password: string;

  @Transform(trim)
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @Length(2, 100, { message: 'Họ tên phải dài từ 2 đến 100 ký tự' })
  fullName: string;
}

export class LoginDto {
  @Transform(lower)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password: string;
}
