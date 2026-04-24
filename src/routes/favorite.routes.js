import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getMyFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  checkFavoriteStatus,
} from '../controllers/favorite.controller.js';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(protect);

// GET /api/favorites - Lấy danh sách yêu thích của user
router.get('/', getMyFavorites);

// POST /api/favorites/:productId - Thêm sản phẩm vào yêu thích
router.post('/:productId', addFavorite);

// DELETE /api/favorites/:productId - Xóa sản phẩm khỏi yêu thích
router.delete('/:productId', removeFavorite);

// PUT /api/favorites/:productId/toggle - Toggle favorite status
router.put('/:productId/toggle', toggleFavorite);

// POST /api/favorites/check-status - Kiểm tra trạng thái favorite của nhiều sản phẩm
router.post('/check-status', checkFavoriteStatus);

export default router;
