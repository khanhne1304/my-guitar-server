import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  listUserSongs,
  getUserSong,
  createUserSong,
  updateUserSong,
  deleteUserSong,
  updateComparisonResult,
} from '../controllers/userSong.controller.js';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(protect);

// GET /api/user-songs - Lấy danh sách bài hát của user
router.get('/', listUserSongs);

// GET /api/user-songs/:id - Lấy thông tin một bài hát
router.get('/:id', getUserSong);

// POST /api/user-songs - Tạo bài hát mới
router.post('/', createUserSong);

// PUT /api/user-songs/:id - Cập nhật thông tin bài hát
router.put('/:id', updateUserSong);

// PATCH /api/user-songs/:id/comparison - Cập nhật kết quả so sánh
router.patch('/:id/comparison', updateComparisonResult);

// DELETE /api/user-songs/:id - Xóa bài hát
router.delete('/:id', deleteUserSong);

export default router;


