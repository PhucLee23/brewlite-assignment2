// Ví MoMo, môi trường test (https://developers.momo.vn), ADR-010. Khi không cấu hình biến môi trường thì dùng
// bộ khóa test MoMo công bố công khai trong code mẫu chính thức (github.com/momo-wallet/payment).
import { createHmac, randomBytes } from 'crypto';
import { CreateSessionInput, GatewayError, GatewayHttp, GatewayResult, PaymentGateway, sameSignature } from './gateway';

export function momoConfig() {
  return {
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn',
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    // MoMo gọi IPN từ Internet nên chỉ tới được khi API có địa chỉ công khai (production); ở máy cá nhân dùng API tra cứu
    ipnUrl: `${process.env.PUBLIC_API_URL || 'http://localhost:4000'}/payments/momo/ipn`,
  };
}

function sign(raw: string): string {
  return createHmac('sha256', momoConfig().secretKey).update(raw).digest('hex');
}

// Các trường trong chuỗi ký kết quả MoMo gửi về (link quay về và IPN), xếp theo bảng chữ cái
const CALLBACK_FIELDS = [
  'amount',
  'extraData',
  'message',
  'orderId',
  'orderInfo',
  'orderType',
  'partnerCode',
  'payType',
  'requestId',
  'responseTime',
  'resultCode',
  'transId',
];

export function momoCallbackSignature(p: Record<string, unknown>): string {
  return sign(`accessKey=${momoConfig().accessKey}&${CALLBACK_FIELDS.map((f) => `${f}=${p[f] ?? ''}`).join('&')}`);
}

/** resultCode 0: thành công; 9000: đã trừ tiền, chờ xác nhận; 1000, 7000, 7002: khách chưa trả xong */
function statusOf(resultCode: number): GatewayResult['status'] {
  if (resultCode === 0 || resultCode === 9000) return 'SUCCESS';
  if ([1000, 7000, 7002].includes(resultCode)) return 'PENDING';
  return 'FAILED';
}

interface MomoResponse {
  resultCode: number;
  message: string;
  payUrl?: string;
  amount?: number;
  transId?: number;
  payType?: string;
}

export class MomoGateway implements PaymentGateway {
  constructor(private readonly http: GatewayHttp) {}

  async createSession(input: CreateSessionInput): Promise<string> {
    const cfg = momoConfig();
    // Thứ tự trường đúng thứ tự trong chuỗi ký của MoMo
    const body = {
      amount: String(input.amount),
      extraData: '',
      ipnUrl: cfg.ipnUrl,
      orderId: input.gatewayOrderId,
      orderInfo: input.orderInfo,
      partnerCode: cfg.partnerCode,
      redirectUrl: input.returnUrl,
      requestId: input.gatewayOrderId,
      // Khách chọn trên trang MoMo: ví MoMo (quét QR), thẻ ATM hoặc thẻ quốc tế
      requestType: 'payWithMethod',
    };
    const raw = `accessKey=${cfg.accessKey}&${Object.entries(body)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')}`;
    const res = await this.http.postJson<MomoResponse>(`${cfg.endpoint}/v2/gateway/api/create`, {
      ...body,
      partnerName: 'BrewLite',
      storeId: 'BrewLite',
      lang: 'vi',
      autoCapture: true,
      orderExpireTime: Math.ceil((input.expiresAt.getTime() - input.createdAt.getTime()) / 60_000),
      signature: sign(raw),
    });
    if (res.resultCode !== 0 || !res.payUrl) throw new GatewayError(`MoMo từ chối tạo giao dịch: ${res.message}`);
    return res.payUrl;
  }

  parseCallback(p: Record<string, unknown>): GatewayResult | null {
    if (!sameSignature(momoCallbackSignature(p), p.signature)) return null;
    return {
      gatewayOrderId: String(p.orderId),
      status: statusOf(Number(p.resultCode)),
      amount: Number(p.amount),
      transactionNo: p.transId ? String(p.transId) : null,
      bankCode: null,
      payType: p.payType ? String(p.payType) : null,
      raw: p,
    };
  }

  async query(gatewayOrderId: string): Promise<GatewayResult> {
    const cfg = momoConfig();
    const requestId = `Q${Date.now()}${randomBytes(3).toString('hex')}`;
    const raw = `accessKey=${cfg.accessKey}&orderId=${gatewayOrderId}&partnerCode=${cfg.partnerCode}&requestId=${requestId}`;
    const res = await this.http.postJson<MomoResponse>(`${cfg.endpoint}/v2/gateway/api/query`, {
      partnerCode: cfg.partnerCode,
      requestId,
      orderId: gatewayOrderId,
      lang: 'vi',
      signature: sign(raw),
    });
    return {
      gatewayOrderId,
      status: statusOf(res.resultCode),
      amount: Number(res.amount ?? 0),
      transactionNo: res.transId ? String(res.transId) : null,
      bankCode: null,
      payType: res.payType || null,
      raw: { ...res },
    };
  }
}
