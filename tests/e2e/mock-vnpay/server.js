// Cổng VNPay giả cho E2E (ADR-010): CI không có khóa sandbox và không nên phụ thuộc Internet.
// Làm đúng ba việc của VNPay mà BrewLite dùng: trang thanh toán (kiểm chữ ký link), chuyển khách về
// vnp_ReturnUrl kèm kết quả có chữ ký HMAC-SHA512, và API tra cứu querydr.
// Chạy: VNPAY_HASH_SECRET=... PORT=5055 node server.js
const { createHmac } = require('crypto');
const http = require('http');

const SECRET = process.env.VNPAY_HASH_SECRET || 'e2e-vnpay-secret';
const PORT = Number(process.env.PORT || 5055);
const outcomes = new Map(); // vnp_TxnRef → kết quả khách đã chọn
let txn = 14_000_000;

const encode = (s) => encodeURIComponent(s).replace(/%20/g, '+');
const hmac = (data) => createHmac('sha512', SECRET).update(data, 'utf8').digest('hex');

/** Giống VNPay: các tham số vnp_ (trừ chữ ký) xếp theo tên, mã hóa URL, nối bằng & */
function signedQuery(params) {
  return Object.keys(params)
    .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash' && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => `${encode(k)}=${encode(String(params[k]))}`)
    .join('&');
}

const QUERY_FIELDS = ['vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message', 'vnp_TmnCode', 'vnp_TxnRef',
  'vnp_Amount', 'vnp_BankCode', 'vnp_PayDate', 'vnp_TransactionNo', 'vnp_TransactionType', 'vnp_TransactionStatus',
  'vnp_OrderInfo', 'vnp_PromotionCode', 'vnp_PromotionAmount'];

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function payPage(p) {
  const amount = new Intl.NumberFormat('vi-VN').format(Number(p.vnp_Amount) / 100);
  const hidden = Object.entries(p).map(([k, v]) => `<input type="hidden" name="${escape(k)}" value="${escape(v)}">`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>VNPay (giả lập cho E2E)</title></head><body style="font-family:sans-serif;max-width:420px;margin:24px auto;padding:0 16px">
<h1>Cổng VNPay giả lập</h1><p>Đơn ${escape(p.vnp_TxnRef)}</p><p>Số tiền: <b>${amount} VND</b></p>
<form method="post" action="/paymentv2/result">${hidden}
<button name="action" value="pay">Thanh toán</button> <button name="action" value="cancel">Hủy giao dịch</button></form>
</body></html>`;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const send = (status, body, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  };

  if (req.method === 'GET' && url.pathname === '/health') return send(200, { status: 'ok' });

  if (req.method === 'GET' && url.pathname === '/paymentv2/vpcpay.html') {
    const p = Object.fromEntries(url.searchParams);
    if (hmac(signedQuery(p)) !== p.vnp_SecureHash) return send(400, 'Sai chữ ký', 'text/plain');
    return send(200, payPage(p), 'text/html');
  }

  if (req.method === 'POST' && url.pathname === '/paymentv2/result') {
    const form = Object.fromEntries(new URLSearchParams(await readBody(req)));
    const ok = form.action === 'pay';
    const transactionNo = ok ? String(++txn) : '0';
    outcomes.set(form.vnp_TxnRef, { ok, amount: form.vnp_Amount, transactionNo, orderInfo: form.vnp_OrderInfo });
    const result = {
      vnp_Amount: form.vnp_Amount,
      vnp_BankCode: 'NCB',
      vnp_CardType: 'ATM',
      vnp_OrderInfo: form.vnp_OrderInfo,
      vnp_PayDate: '20261027154209',
      vnp_ResponseCode: ok ? '00' : '24',
      vnp_TmnCode: form.vnp_TmnCode,
      vnp_TransactionNo: transactionNo,
      vnp_TransactionStatus: ok ? '00' : '02',
      vnp_TxnRef: form.vnp_TxnRef,
    };
    const query = signedQuery(result);
    res.writeHead(302, { Location: `${form.vnp_ReturnUrl}?${query}&vnp_SecureHash=${hmac(query)}` });
    return res.end();
  }

  if (req.method === 'POST' && url.pathname === '/merchant_webapi/api/transaction') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const o = outcomes.get(body.vnp_TxnRef);
    if (!o) return send(200, { vnp_ResponseCode: '91', vnp_Message: 'Transaction not found' });
    const answer = {
      vnp_ResponseId: String(Date.now()),
      vnp_Command: 'querydr',
      vnp_ResponseCode: '00',
      vnp_Message: 'QueryDR Success',
      vnp_TmnCode: body.vnp_TmnCode,
      vnp_TxnRef: body.vnp_TxnRef,
      vnp_Amount: o.amount,
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261027154209',
      vnp_TransactionNo: o.transactionNo,
      vnp_TransactionType: '01',
      vnp_TransactionStatus: o.ok ? '00' : '02',
      vnp_OrderInfo: o.orderInfo,
    };
    return send(200, { ...answer, vnp_SecureHash: hmac(QUERY_FIELDS.map((f) => answer[f] ?? '').join('|')) });
  }

  send(404, { message: 'Không có' });
});

server.listen(PORT, () => console.log(`Cổng VNPay giả lập chạy ở cổng ${PORT}`));
