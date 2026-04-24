import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  listReviews,
  createReview,
  updateMyReview,
  deleteReview,
  getReviewableProducts,
} from '../controllers/review.controller.js';
import { validateCreateReview } from '../validators/review.validator.js';

const router = Router();

// Public
router.get('/', listReviews);

// User
router.get('/reviewable', protect, getReviewableProducts);
router.post('/', protect, validateCreateReview, createReview);
router.patch('/:id', protect, updateMyReview);
router.delete('/:id', protect, deleteReview);

export default router;
