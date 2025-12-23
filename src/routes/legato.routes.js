import { Router } from 'express';
import { analyzeLegatoPerformance, getLegatoHistory, saveLegatoPracticeResult } from '../controllers/legato.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.post('/analyze', analyzeLegatoPerformance);
router.post('/save', protect, saveLegatoPracticeResult);
router.get('/history', protect, getLegatoHistory);

export default router;












