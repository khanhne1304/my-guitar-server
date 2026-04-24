import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import { audioUpload } from '../middlewares/audioUpload.js';
import {
  listReferenceSongs,
  listPublicReferenceSongs,
  getReferenceSong,
  createReferenceSong,
  updateReferenceSong,
  deleteReferenceSong,
} from '../controllers/referenceSong.controller.js';

const router = Router();

// Public route - Lấy danh sách bài hát gốc công khai (chỉ bài isActive = true)
router.get('/public', listPublicReferenceSongs);

// Middleware để xử lý lỗi từ multer
function handleMulterError(err, req, res, next) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Kích thước tối đa là 200MB.',
      });
    }
    if (err.message === 'Định dạng audio không được hỗ trợ.') {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    return next(err);
  }
  next();
}

// Tất cả routes đều yêu cầu authentication và admin role
router.use(protect);
router.use(admin);

// GET /api/admin/reference-songs - Lấy danh sách bài hát gốc
router.get('/', listReferenceSongs);

// GET /api/admin/reference-songs/:id - Lấy thông tin một bài hát gốc
router.get('/:id', getReferenceSong);

// POST /api/admin/reference-songs - Tạo bài hát gốc mới (upload audio)
router.post(
  '/',
  audioUpload.single('audio'),
  handleMulterError,
  createReferenceSong
);

// PATCH /api/admin/reference-songs/:id - Cập nhật thông tin bài hát gốc
router.patch('/:id', updateReferenceSong);

// DELETE /api/admin/reference-songs/:id - Xóa bài hát gốc
router.delete('/:id', deleteReferenceSong);

export default router;


