// Hợp đồng chung của các cổng thanh toán bên thứ ba (ADR-010). PaymentsService chỉ làm việc qua interface này.
import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/** Kết quả một giao dịch do cổng xác nhận (qua link quay về, IPN hoặc API tra cứu, đều đã kiểm tra chữ ký) */
export interface GatewayResult {
  /** Mã đơn BrewLite đã gửi sang cổng (Payment.gatewayOrderId) */
  gatewayOrderId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: number;
  /** Mã giao dịch của cổng: MoMo transId, VNPay vnp_TransactionNo */
  transactionNo: string | null;
  bankCode: string | null;
  payType: string | null;
  /** Dữ liệu gốc cổng trả về, lưu làm bằng chứng giao dịch */
  raw: Record<string, unknown>;
}

export interface CreateSessionInput {
  gatewayOrderId: string;
  amount: number;
  orderInfo: string;
  returnUrl: string;
  createdAt: Date;
  expiresAt: Date;
  clientIp: string;
}

export interface PaymentGateway {
  /** Tạo phiên ở cổng, trả về link trang thanh toán của cổng */
  createSession(input: CreateSessionInput): Promise<string>;
  /** Đọc dữ liệu cổng gửi về (link quay về hoặc IPN); sai chữ ký thì trả null */
  parseCallback(params: Record<string, unknown>): GatewayResult | null;
  /** Hỏi trực tiếp cổng trạng thái giao dịch (server gọi server) */
  query(gatewayOrderId: string, createdAt: Date): Promise<GatewayResult>;
}

export class GatewayError extends Error {}

/** Gọi API của cổng qua HTTP. Tách riêng để integration test thay bằng cổng giả, không gọi Internet */
@Injectable()
export class GatewayHttp {
  async postJson<T>(url: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // MoMo khuyến nghị chờ tối đa 30 giây
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new GatewayError('Không kết nối được cổng thanh toán, vui lòng thử lại');
    }
    if (!res.ok) throw new GatewayError(`Cổng thanh toán trả lỗi HTTP ${res.status}`);
    return (await res.json()) as T;
  }
}

/** So sánh chữ ký với thời gian không đổi để không lộ thông tin qua thời gian phản hồi (NFR-04) */
export function sameSignature(expected: string, actual: unknown): boolean {
  if (typeof actual !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
