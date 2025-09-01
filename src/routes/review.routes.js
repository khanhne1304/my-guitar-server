import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listReviews,
  createReview,
  updateMyReview,
  deleteReview,
  validateCreate,
} from '../controllers/review.controller.js';

const router = Router();

router.get('/', listReviews); // public list (có thể filter theo product)
router.post('/', protect, validateCreate, createReview);
router.patch('/:id', protect, updateMyReview);
router.delete('/:id', protect, deleteReview); // admin xoá được mọi review; user chỉ xoá review của mình

export default router;
