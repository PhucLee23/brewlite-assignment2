import { describe, expect, it } from 'vitest';
import { isTokenExpired, tokenExpiresAt } from './auth';

const jwtWithExp = (exp: number) => `x.${btoa(JSON.stringify({ sub: 1, exp })).replace(/=+$/, '')}.y`;

// Tự đăng xuất khi token hết hạn (FR-07, tiêu chí 4)
describe('hạn của JWT', () => {
  it('đọc exp trong payload', () => {
    expect(tokenExpiresAt(jwtWithExp(1_900_000_000))).toBe(1_900_000_000_000);
  });

  it('token đã quá hạn hoặc hỏng coi như hết hạn', () => {
    const now = 1_800_000_000_000;
    expect(isTokenExpired(jwtWithExp(1_799_999_999), now)).toBe(true);
    expect(isTokenExpired(jwtWithExp(1_800_000_100), now)).toBe(false);
    expect(isTokenExpired('khong-phai-jwt', now)).toBe(true);
  });
});
