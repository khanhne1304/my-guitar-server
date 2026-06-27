import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  createVnpayPayment,
  vnpayReturn,
  vnpayIpn,
} from '../controllers/payment.controller.js';

const router = Router();

// Tạo URL thanh toán cho đơn hàng (yêu cầu đăng nhập)
router.post('/vnpay/create', protect, createVnpayPayment);

// VNPay redirect trình duyệt về đây sau thanh toán (không cần auth)
router.get('/vnpay/return', vnpayReturn);

// VNPay gọi server-to-server xác nhận kết quả (không cần auth, xác thực bằng chữ ký)
router.get('/vnpay/ipn', vnpayIpn);

export default router;
