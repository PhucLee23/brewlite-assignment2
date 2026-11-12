import type { PaymentProvider } from '@/lib/types';

/** Màu nhận diện và thông tin thẻ thử nghiệm của từng cổng (môi trường sandbox, không dùng tiền thật) */
export const PROVIDERS: Record<PaymentProvider, { name: string; color: string; hint: string; testInfo: string[] }> = {
  MOMO: {
    name: 'MoMo',
    color: '#A50064',
    hint: 'Ví MoMo (quét mã bằng app), thẻ ATM nội địa hoặc Visa/Master/JCB',
    testInfo: [
      'Chọn “Thanh toán bằng thẻ ATM”',
      'Số thẻ 9704 0000 0000 0018 · Tên NGUYEN VAN A · Ngày phát hành 03/07',
      'Số điện thoại bất kỳ · OTP: OTP',
    ],
  },
  VNPAY: {
    name: 'VNPay',
    color: '#005BAA',
    hint: 'Thẻ ATM và tài khoản ngân hàng, thẻ quốc tế, app ngân hàng',
    testInfo: [
      'Chọn “Thẻ nội địa và tài khoản ngân hàng” → NCB',
      'Số thẻ 9704 1985 2619 1432 198 · Tên NGUYEN VAN A · Ngày phát hành 07/15',
      'OTP: 123456',
    ],
  },
};

/** Logo dựng bằng chữ theo màu nhận diện của cổng */
export function ProviderLogo({ provider, small = false }: { provider: PaymentProvider | null; small?: boolean }) {
  const box = small ? 'h-8 w-8 text-[9px]' : 'h-11 w-11 text-[11px]';
  if (provider === 'MOMO') {
    return (
      <span
        aria-label="MoMo"
        className={`${box} grid flex-none place-items-center rounded-lg font-bold leading-[0.95] text-white`}
        style={{ background: PROVIDERS.MOMO.color }}
      >
        <span className="text-center">
          mo
          <br />
          mo
        </span>
      </span>
    );
  }
  if (provider === 'VNPAY') {
    return (
      <span
        aria-label="VNPay"
        className={`${box} grid flex-none place-items-center rounded-lg border border-latte bg-white font-extrabold tracking-tight`}
      >
        <span>
          <span style={{ color: '#ED1C24' }}>VN</span>
          <span style={{ color: PROVIDERS.VNPAY.color }}>PAY</span>
        </span>
      </span>
    );
  }
  return <span className={`${box} grid flex-none place-items-center rounded-lg bg-latte text-roast`}>?</span>;
}
