import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { audioUpload } from '../middlewares/audioUpload.js';
import {
  analyzeAndCompare,
  analyzeOnly,
  getPracticeAdvice,
} from '../controllers/chordPractice.controller.js';
import { getPracticeAdviceConfigStatus } from '../services/practiceAdvice.service.js';

const router = Router();

function handleMulterError(err, req, res, next) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Kích thước tối đa là 200MB.',
      });
    }
    if (err.message === 'Định dạng audio không được hỗ trợ.') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
  return next();
}

router.post(
  '/analyze',
  protect,
  audioUpload.single('audio'),
  handleMulterError,
  analyzeAndCompare,
);

router.post(
  '/analyze-only',
  protect,
  audioUpload.single('audio'),
  handleMulterError,
  analyzeOnly,
);

router.post('/advice', protect, getPracticeAdvice);

/** Kiểm tra cấu hình gợi ý AI (không lộ key). */
router.get('/advice-status', (req, res) => {
  res.json({ success: true, ...getPracticeAdviceConfigStatus() });
});

export default router;
