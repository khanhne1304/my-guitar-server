import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listAdmin,
  deleteReview,
} from '../controllers/review.controller.js';

const router = Router();

// Tất cả routes đều yêu cầu authentication và admin role
router.use(protect);
router.use(admin);

// GET /api/admin/reviews - Lấy danh sách reviews với pagination, search, rating
router.get('/', listAdmin);

// DELETE /api/admin/reviews/:id - Xóa review
router.delete('/:id', deleteReview);

export default router;

