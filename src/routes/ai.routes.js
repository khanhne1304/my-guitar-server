import { Router } from 'express';
import {
  scorePracticeClip,
  getAiPracticeHistory,
  uploadPracticeAudio,
  analyzePracticeAudio,
  getUserAudioFiles,
  listCloudinaryAudioFiles,
  deleteUserAudio,
} from '../controllers/ai.controller.js';
import { protect } from '../middlewares/auth.js';
import { audioUpload } from '../middlewares/audioUpload.js';

const router = Router();

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

router.post('/practice/score', protect, scorePracticeClip);
router.get('/practice/history', protect, getAiPracticeHistory);
router.get('/practice/audios', protect, getUserAudioFiles); // Lấy danh sách audio của user
router.get('/practice/audios/cloudinary', protect, listCloudinaryAudioFiles); // Lấy từ Cloudinary (tất cả)
router.delete('/practice/audios/:id', protect, deleteUserAudio); // Xóa audio của user
// Phân tích audio chỉ để tính điểm, không upload
router.post(
  '/practice/analyze',
  protect,
  audioUpload.single('audio'),
  handleMulterError,
  analyzePracticeAudio,
);
// Upload audio lên Cloudinary và lưu vào database
router.post(
  '/practice/upload',
  protect,
  audioUpload.single('audio'),
  handleMulterError,
  uploadPracticeAudio,
);

export default router;

