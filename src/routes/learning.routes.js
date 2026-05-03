import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getPlacementTest,
  postOnboarding,
  getRoadmap,
  postCompleteLesson,
  postPracticeTime,
  postVideoWatchTime,
  listCustomPaths,
  getCustomPath,
  postCustomPath,
  putCustomPath,
  deleteCustomPath,
} from '../controllers/learning.controller.js';

const router = Router();

router.get('/placement-test', protect, getPlacementTest);
router.post('/onboarding', protect, postOnboarding);
router.get('/roadmap', protect, getRoadmap);
router.post('/complete-lesson', protect, postCompleteLesson);
router.post('/practice-time', protect, postPracticeTime);
router.post('/video-watch-time', protect, postVideoWatchTime);

router.get('/custom-paths', protect, listCustomPaths);
router.get('/custom-paths/:pathId', protect, getCustomPath);
router.post('/custom-paths', protect, postCustomPath);
router.put('/custom-paths/:pathId', protect, putCustomPath);
router.delete('/custom-paths/:pathId', protect, deleteCustomPath);

export default router;
