import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listAdmin,
  create,
  getById,
  update,
  remove,
} from '../controllers/notification.controller.js';

const router = Router();

// Tất cả routes đều yêu cầu authentication và admin role
router.use(protect);
router.use(admin);

// GET /api/admin/notifications - Lấy danh sách notifications với pagination, search, type, status
router.get('/', listAdmin);

// POST /api/admin/notifications - Tạo notification mới
router.post('/', create);

// GET /api/admin/notifications/:id - Lấy notification theo ID
router.get('/:id', getById);

// PUT /api/admin/notifications/:id - Cập nhật notification
router.put('/:id', update);

// PATCH /api/admin/notifications/:id - Cập nhật notification (alias)
router.patch('/:id', update);

// DELETE /api/admin/notifications/:id - Xóa notification
router.delete('/:id', remove);

export default router;

