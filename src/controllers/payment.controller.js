import Order from '../models/Order.js';
import {
  createPaymentUrl,
  verifyVnpaySignature,
  isVnpayConfigured,
} from '../services/vnpay.service.js';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const VNP_RETURN_URL =
  process.env.VNP_RETURN_URL || 'http://localhost:4000/api/payment/vnpay/return';

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(xff) ? xff[0] : xff || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '127.0.0.1';
  return ip === '::1' ? '127.0.0.1' : ip;
}

/**
 * POST /api/payment/vnpay/create  (protect)
 * Body: { orderId, bankCode? }
 * Tạo URL thanh toán cho một đơn hàng đang chờ.
 */
export async function createVnpayPayment(req, res, next) {
  try {
    if (!isVnpayConfigured()) {
      return res
        .status(503)
        .json({ message: 'Cổng thanh toán VNPay chưa được cấu hình trên máy chủ.' });
    }

    const { orderId, bankCode } = req.body || {};
    if (!orderId) return res.status(400).json({ message: 'Thiếu orderId' });

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.paymentMethod !== 'vnpay') {
      return res.status(400).json({ message: 'Đơn hàng không dùng phương thức VNPay' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Đơn hàng không ở trạng thái chờ thanh toán' });
    }

    const txnRef = `${order._id}_${Date.now()}`;
    order.vnp = { ...(order.vnp?.toObject?.() || order.vnp || {}), txnRef, amount: order.total };
    await order.save();

    const paymentUrl = createPaymentUrl({
      amount: order.total,
      txnRef,
      orderInfo: `Thanh toan don hang ${order._id}`,
      ipAddr: getClientIp(req),
      returnUrl: VNP_RETURN_URL,
      bankCode: bankCode || undefined,
    });

    return res.json({ paymentUrl });
  } catch (e) {
    if (e.message === 'VNPAY_NOT_CONFIGURED') {
      return res
        .status(503)
        .json({ message: 'Cổng thanh toán VNPay chưa được cấu hình trên máy chủ.' });
    }
    return next(e);
  }
}

/**
 * GET /api/payment/vnpay/return
 * VNPay redirect trình duyệt người dùng về đây sau khi thanh toán.
 * Xác thực chữ ký, cập nhật đơn (idempotent), rồi redirect về frontend.
 */
export async function vnpayReturn(req, res) {
  const valid = verifyVnpaySignature(req.query);
  const code = req.query.vnp_ResponseCode;
  const txnRef = req.query.vnp_TxnRef;

  let status = 'fail';
  let orderId = '';

  if (!valid) {
    status = 'invalid';
  } else {
    const order = await Order.findOne({ 'vnp.txnRef': txnRef });
    if (order) {
      orderId = order._id.toString();
      order.vnp.responseCode = code;
      order.vnp.transactionNo = req.query.vnp_TransactionNo;
      order.vnp.bankCode = req.query.vnp_BankCode;
      order.vnp.payDate = req.query.vnp_PayDate;

      if (code === '00') {
        if (order.status === 'pending') {
          order.status = 'paid';
          order.paidAt = new Date();
        }
        status = 'success';
      } else {
        status = 'fail';
      }
      await order.save();
    }
  }

  const params = new URLSearchParams({ status, orderId, code: code || '' });
  return res.redirect(`${FRONTEND_URL}/payment-result?${params.toString()}`);
}

/**
 * GET /api/payment/vnpay/ipn
 * VNPay gọi server-to-server để xác nhận kết quả (đáng tin cậy hơn return URL).
 * Phải trả JSON đúng định dạng { RspCode, Message }.
 */
export async function vnpayIpn(req, res) {
  if (!verifyVnpaySignature(req.query)) {
    return res.json({ RspCode: '97', Message: 'Invalid signature' });
  }

  const txnRef = req.query.vnp_TxnRef;
  const code = req.query.vnp_ResponseCode;
  const amount = Number(req.query.vnp_Amount);

  const order = await Order.findOne({ 'vnp.txnRef': txnRef });
  if (!order) return res.json({ RspCode: '01', Message: 'Order not found' });
  if (Math.round(Number(order.total) * 100) !== amount) {
    return res.json({ RspCode: '04', Message: 'Invalid amount' });
  }
  if (order.status !== 'pending') {
    return res.json({ RspCode: '02', Message: 'Order already confirmed' });
  }

  if (code === '00') {
    order.status = 'paid';
    order.paidAt = new Date();
  }
  order.vnp.responseCode = code;
  order.vnp.transactionNo = req.query.vnp_TransactionNo;
  order.vnp.bankCode = req.query.vnp_BankCode;
  order.vnp.payDate = req.query.vnp_PayDate;
  await order.save();

  return res.json({ RspCode: '00', Message: 'Confirm Success' });
}
