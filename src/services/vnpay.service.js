/**
 * VNPay service — tạo URL thanh toán và xác thực chữ ký (HMAC-SHA512).
 * Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * Quy ước ký (phiên bản 2.1.0):
 *  - Sắp xếp tham số theo thứ tự alphabet của KEY (đã encodeURIComponent).
 *  - encodeURIComponent từng VALUE, thay %20 -> '+'.
 *  - signData = các cặp "key=value" nối bằng '&'.
 *  - secureHash = HMAC_SHA512(signData, vnp_HashSecret) (hex).
 */
import crypto from 'crypto';

const VNP_URL =
  process.env.VNP_URL ||
  'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || '';
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';

export function isVnpayConfigured() {
  return Boolean(VNP_TMN_CODE && VNP_HASH_SECRET);
}

/** Sắp xếp + encode tham số theo đúng cách VNPay yêu cầu. */
function sortObject(obj) {
  const sorted = {};
  const keys = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(encodeURIComponent(key));
    }
  }
  keys.sort();
  for (let i = 0; i < keys.length; i += 1) {
    sorted[keys[i]] = encodeURIComponent(obj[keys[i]]).replace(/%20/g, '+');
  }
  return sorted;
}

function buildQuery(params) {
  return Object.keys(params)
    .map((k) => `${k}=${params[k]}`)
    .join('&');
}

function signData(params) {
  return crypto
    .createHmac('sha512', VNP_HASH_SECRET)
    .update(Buffer.from(buildQuery(params), 'utf-8'))
    .digest('hex');
}

/** Định dạng thời gian theo GMT+7: yyyyMMddHHmmss */
function formatDateGMT7(date) {
  const tz = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${tz.getUTCFullYear()}` +
    `${p(tz.getUTCMonth() + 1)}` +
    `${p(tz.getUTCDate())}` +
    `${p(tz.getUTCHours())}` +
    `${p(tz.getUTCMinutes())}` +
    `${p(tz.getUTCSeconds())}`
  );
}

/**
 * Tạo URL chuyển hướng sang cổng VNPay.
 * @param {Object} opts
 * @param {number} opts.amount  số tiền (VND, chưa nhân 100)
 * @param {string} opts.txnRef  mã tham chiếu duy nhất
 * @param {string} opts.orderInfo  mô tả đơn (không dấu để tránh lệch chữ ký)
 * @param {string} opts.ipAddr  IP người dùng
 * @param {string} opts.returnUrl  URL VNPay redirect về sau thanh toán
 * @param {string} [opts.bankCode]  ví dụ 'VNBANK' (ATM/QR nội địa), 'VNPAYQR'
 * @param {string} [opts.locale]  'vn' | 'en'
 */
export function createPaymentUrl({
  amount,
  txnRef,
  orderInfo,
  ipAddr,
  returnUrl,
  bankCode,
  locale = 'vn',
}) {
  if (!isVnpayConfigured()) {
    throw new Error('VNPAY_NOT_CONFIGURED');
  }

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: formatDateGMT7(new Date()),
  };
  if (bankCode) params.vnp_BankCode = bankCode;

  const sorted = sortObject(params);
  sorted.vnp_SecureHash = signData(sorted);
  return `${VNP_URL}?${buildQuery(sorted)}`;
}

/**
 * Xác thực chữ ký từ query VNPay trả về (return URL hoặc IPN).
 * @param {Object} query  req.query (đã được Express giải mã URL)
 * @returns {boolean}
 */
export function verifyVnpaySignature(query) {
  if (!isVnpayConfigured()) return false;
  const received = { ...query };
  const secureHash = received.vnp_SecureHash;
  delete received.vnp_SecureHash;
  delete received.vnp_SecureHashType;
  const sorted = sortObject(received);
  return secureHash === signData(sorted);
}
