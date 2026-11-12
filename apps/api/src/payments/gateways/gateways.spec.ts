import { GatewayHttp } from './gateway';
import { momoCallbackSignature, MomoGateway } from './momo';
import { VnpayGateway, vnpaySign, vnpaySignedQuery, vnpayTime } from './vnpay';

// UT-06: chữ ký với cổng MoMo, VNPay (FR-11, NFR-04)
describe('UT-06 cổng MoMo', () => {
  // Kết quả sandbox MoMo gửi về sau khi trả bằng thẻ ATM test (ký bằng khóa test công khai của MoMo)
  const realCallback = {
    partnerCode: 'MOMO',
    orderId: 'BLTHU1793090710651',
    requestId: 'BLTHU1793090710651',
    amount: '45000',
    orderInfo: 'Thanh toán đơn #12 BrewLite',
    orderType: 'momo_wallet',
    transId: '4877578324',
    resultCode: '0',
    message: 'Successful.',
    payType: 'napas',
    responseTime: '1793090757791',
    extraData: '',
    signature: '73764241a3f9a7d602c303c919e43ed9f1da120ed23047a9b01680706e67fbee',
  };
  const momo = new MomoGateway(new GatewayHttp());

  it('nhận kết quả có chữ ký đúng', () => {
    expect(momo.parseCallback(realCallback)).toMatchObject({
      gatewayOrderId: 'BLTHU1793090710651',
      status: 'SUCCESS',
      amount: 45000,
      transactionNo: '4877578324',
      payType: 'napas',
    });
  });

  it('từ chối kết quả bị sửa số tiền, kết quả hoặc thiếu chữ ký', () => {
    expect(momo.parseCallback({ ...realCallback, amount: '1000' })).toBeNull();
    expect(momo.parseCallback({ ...realCallback, resultCode: '1006' })).toBeNull();
    expect(momo.parseCallback({ ...realCallback, signature: undefined })).toBeNull();
  });

  it('khách bấm hủy trên trang MoMo là thất bại', () => {
    const denied = { ...realCallback, resultCode: '1006', message: 'Transaction denied by user.' };
    expect(momo.parseCallback({ ...denied, signature: momoCallbackSignature(denied) })?.status).toBe('FAILED');
  });
});

describe('UT-06 cổng VNPay', () => {
  beforeAll(() => {
    process.env.VNPAY_TMN_CODE = 'TESTTMN1';
    process.env.VNPAY_HASH_SECRET = 'test-secret';
  });

  it('giờ gửi VNPay là giờ Việt Nam dạng yyyyMMddHHmmss', () => {
    expect(vnpayTime(new Date('2026-10-27T08:42:09.500Z'))).toBe('20261027154209');
  });

  it('ký các tham số vnp_ đã xếp theo tên và mã hóa URL (dấu cách thành +)', () => {
    const query = vnpaySignedQuery({
      vnp_TxnRef: 'BL1',
      vnp_Amount: '4500000',
      vnp_OrderInfo: 'Thanh toan don 1',
      other: 'x',
      vnp_SecureHash: 'h',
    });
    expect(query).toBe('vnp_Amount=4500000&vnp_OrderInfo=Thanh+toan+don+1&vnp_TxnRef=BL1');
  });

  it('link thanh toán có chữ ký khớp và hạn 15 phút; kết quả gửi về bị sửa thì bị từ chối', async () => {
    const vnpay = new VnpayGateway(new GatewayHttp());
    const url = new URL(
      await vnpay.createSession({
        gatewayOrderId: 'BL1',
        amount: 45000,
        orderInfo: 'Thanh toan don 1 BrewLite',
        returnUrl: 'http://localhost:3000/payments/1',
        createdAt: new Date('2026-10-27T08:40:00Z'),
        expiresAt: new Date('2026-10-27T08:55:00Z'),
        clientIp: '127.0.0.1',
      }),
    );
    const params = Object.fromEntries(url.searchParams);
    expect(params).toMatchObject({ vnp_Amount: '4500000', vnp_CreateDate: '20261027154000', vnp_ExpireDate: '20261027155500' });
    expect(vnpaySign(params)).toBe(params.vnp_SecureHash);

    const back = {
      vnp_Amount: '4500000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'BL1',
      vnp_TransactionNo: '15716289',
    };
    const signed = { ...back, vnp_SecureHash: vnpaySign(back) };
    expect(vnpay.parseCallback(signed)).toMatchObject({ status: 'SUCCESS', amount: 45000, transactionNo: '15716289' });
    expect(vnpay.parseCallback({ ...signed, vnp_Amount: '100' })).toBeNull();
  });
});
