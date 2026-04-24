import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listAdmin,
  create,
  getByCode,
  update,
  remove,
} from '../controllers/coupon.controller.js';
import { validateCreate } from '../validators/coupon.validator.js';

const router = Router();

// Tất cả routes đều yêu cầu authentication và admin role
router.use(protect);
router.use(admin);

// GET /api/admin/coupons - Lấy danh sách coupons với pagination, search, status
router.get('/', listAdmin);

// POST /api/admin/coupons - Tạo coupon mới
router.post('/', validateCreate, create);

// GET /api/admin/coupons/:code - Lấy coupon theo code
router.get('/:code', getByCode);

// PUT /api/admin/coupons/:id - Cập nhật coupon
router.put('/:id', update);

// PATCH /api/admin/coupons/:id - Cập nhật coupon (alias)
router.patch('/:id', update);

// DELETE /api/admin/coupons/:id - Xóa coupon
router.delete('/:id', remove);

export default router;

