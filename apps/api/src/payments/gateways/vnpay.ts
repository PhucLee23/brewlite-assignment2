// Cổng VNPay, môi trường sandbox (https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), ADR-010.
// Mã website và chuỗi bí mật lấy khi đăng ký merchant sandbox; chỉ nằm trong biến môi trường, không commit (NFR-05).
import { createHmac, randomBytes } from 'crypto';
import { CreateSessionInput, GatewayError, GatewayHttp, GatewayResult, PaymentGateway, sameSignature } from './gateway';

export function vnpayConfig() {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const hashSecret = process.env.VNPAY_HASH_SECRET;
  if (!tmnCode || !hashSecret) {
    throw new GatewayError('Chưa cấu hình VNPay: điền VNPAY_TMN_CODE và VNPAY_HASH_SECRET (xem README)');
  }
  return {
    tmnCode,
    hashSecret,
    payUrl: process.env.VNPAY_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    apiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  };
}

function hmac(data: string): string {
  return createHmac('sha512', vnpayConfig().hashSecret).update(data, 'utf8').digest('hex');
}

/** Giờ Việt Nam (GMT+7) dạng yyyyMMddHHmmss như VNPay yêu cầu */
export function vnpayTime(date: Date): string {
  return new Date(date.getTime() + 7 * 3600_000).toISOString().replace(/\D/g, '').slice(0, 14);
}

const encode = (s: string) => encodeURIComponent(s).replace(/%20/g, '+');

/** Các tham số vnp_ (trừ chữ ký) xếp theo tên, mã hóa URL rồi nối bằng &; dùng cho cả link thanh toán và kết quả gửi về */
export function vnpaySignedQuery(params: Record<string, unknown>): string {
  return Object.keys(params)
    .filter(
      (k) =>
        k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && params[k] !== '' && params[k] != null,
    )
    .sort()
    .map((k) => `${encode(k)}=${encode(String(params[k]))}`)
    .join('&');
}

export function vnpaySign(params: Record<string, unknown>): string {
  return hmac(vnpaySignedQuery(params));
}

// Thứ tự trường trong chuỗi ký của phản hồi tra cứu, theo tài liệu VNPay
const QUERY_RESPONSE_FIELDS = [
  'vnp_ResponseId',
  'vnp_Command',
  'vnp_ResponseCode',
  'vnp_Message',
  'vnp_TmnCode',
  'vnp_TxnRef',
  'vnp_Amount',
  'vnp_BankCode',
  'vnp_PayDate',
  'vnp_TransactionNo',
  'vnp_TransactionType',
  'vnp_TransactionStatus',
  'vnp_OrderInfo',
  'vnp_PromotionCode',
  'vnp_PromotionAmount',
];

/** Chữ ký của phản hồi API tra cứu (querydr): các trường nối bằng | */
export function vnpayQueryResponseSignature(res: Record<string, unknown>): string {
  return hmac(QUERY_RESPONSE_FIELDS.map((f) => res[f] ?? '').join('|'));
}

export class VnpayGateway implements PaymentGateway {
  constructor(private readonly http: GatewayHttp) {}

  /** VNPay không cần gọi API khi tạo phiên: BrewLite tự ký link sang trang thanh toán */
  createSession(input: CreateSessionInput): Promise<string> {
    const cfg = vnpayConfig();
    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: cfg.tmnCode,
      vnp_Amount: String(input.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.gatewayOrderId,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: input.returnUrl,
      vnp_IpAddr: input.clientIp,
      vnp_CreateDate: vnpayTime(input.createdAt),
      // VNPay tự từ chối thanh toán sau thời điểm này, cùng hạn với phiên ở BrewLite (FR-11)
      vnp_ExpireDate: vnpayTime(input.expiresAt),
    };
    const query = vnpaySignedQuery(params);
    return Promise.resolve(`${cfg.payUrl}?${query}&vnp_SecureHash=${hmac(query)}`);
  }

  parseCallback(p: Record<string, unknown>): GatewayResult | null {
    if (!sameSignature(vnpaySign(p), p.vnp_SecureHash)) return null;
    return {
      gatewayOrderId: String(p.vnp_TxnRef),
      // 00/00: thành công; mã khác (ví dụ 24: khách bấm hủy) là thất bại
      status: p.vnp_ResponseCode === '00' && p.vnp_TransactionStatus === '00' ? 'SUCCESS' : 'FAILED',
      amount: Number(p.vnp_Amount) / 100,
      transactionNo: p.vnp_TransactionNo && p.vnp_TransactionNo !== '0' ? String(p.vnp_TransactionNo) : null,
      bankCode: p.vnp_BankCode ? String(p.vnp_BankCode) : null,
      payType: p.vnp_CardType ? String(p.vnp_CardType) : null,
      raw: p,
    };
  }

  async query(gatewayOrderId: string, createdAt: Date): Promise<GatewayResult> {
    const cfg = vnpayConfig();
    const req = {
      vnp_RequestId: `${Date.now()}${randomBytes(4).toString('hex')}`,
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: cfg.tmnCode,
      vnp_TxnRef: gatewayOrderId,
      vnp_TransactionDate: vnpayTime(createdAt),
      vnp_CreateDate: vnpayTime(new Date()),
      vnp_IpAddr: '127.0.0.1',
      vnp_OrderInfo: `Tra cuu giao dich ${gatewayOrderId}`,
    };
    const data = [
      req.vnp_RequestId,
      req.vnp_Version,
      req.vnp_Command,
      req.vnp_TmnCode,
      req.vnp_TxnRef,
      req.vnp_TransactionDate,
      req.vnp_CreateDate,
      req.vnp_IpAddr,
      req.vnp_OrderInfo,
    ].join('|');
    const res = await this.http.postJson<Record<string, string>>(cfg.apiUrl, { ...req, vnp_SecureHash: hmac(data) });

    // 91: VNPay chưa có giao dịch (khách chưa nhập thẻ)
    if (res.vnp_ResponseCode === '91') {
      return { gatewayOrderId, status: 'PENDING', amount: 0, transactionNo: null, bankCode: null, payType: null, raw: res };
    }
    if (!sameSignature(vnpayQueryResponseSignature(res), res.vnp_SecureHash)) {
      throw new GatewayError('Phản hồi tra cứu VNPay sai chữ ký');
    }
    if (res.vnp_ResponseCode !== '00') throw new GatewayError(`VNPay tra cứu lỗi: ${res.vnp_Message}`);
    const status = res.vnp_TransactionStatus === '00' ? 'SUCCESS' : res.vnp_TransactionStatus === '01' ? 'PENDING' : 'FAILED';
    return {
      gatewayOrderId,
      status,
      amount: Number(res.vnp_Amount) / 100,
      transactionNo: res.vnp_TransactionNo && res.vnp_TransactionNo !== '0' ? res.vnp_TransactionNo : null,
      bankCode: res.vnp_BankCode || null,
      payType: null,
      raw: res,
    };
  }
}
