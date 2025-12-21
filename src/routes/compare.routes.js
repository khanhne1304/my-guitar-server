import { Router } from 'express';
import { compareAudio, compareTwoSongsAudio } from '../controllers/compareSong.controller.js';
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

// So sánh audio của user với bài hát gốc
router.post(
  '/audio',
  protect,
  audioUpload.single('audio'),
  handleMulterError,
  compareAudio,
);

// So sánh hai file audio trực tiếp
router.post(
  '/two-songs',
  protect,
  audioUpload.fields([
    { name: 'audio1', maxCount: 1 },
    { name: 'audio2', maxCount: 1 },
  ]),
  handleMulterError,
  compareTwoSongsAudio,
);

export default router;

