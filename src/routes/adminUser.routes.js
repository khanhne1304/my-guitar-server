import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/adminUser.controller.js';

const router = Router();

// Tất cả routes đều yêu cầu authentication và admin role
router.use(protect);
router.use(admin);

// GET /api/admin/users - Lấy danh sách users
router.get('/', listUsers);

// POST /api/admin/users - Tạo user mới
router.post('/', createUser);

// PUT /api/admin/users/:id - Cập nhật user
router.put('/:id', updateUser);

// DELETE /api/admin/users/:id - Xóa user
router.delete('/:id', deleteUser);

export default router;

