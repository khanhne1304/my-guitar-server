import { Router } from 'express';
import { scorePracticeClip, getAiPracticeHistory, uploadPracticeAudio } from '../controllers/ai.controller.js';
import { protect } from '../middlewares/auth.js';
import { audioUpload } from '../middlewares/audioUpload.js';

const router = Router();

router.post('/practice/score', protect, scorePracticeClip);
router.get('/practice/history', protect, getAiPracticeHistory);
router.post(
  '/practice/upload',
  protect,
  audioUpload.single('audio'),
  uploadPracticeAudio,
);

export default router;

