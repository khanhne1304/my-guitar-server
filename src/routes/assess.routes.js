import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  submitAssessment,
  getAssessmentResults
} from '../controllers/assess.controller.js';
import {
  submitAssessmentValidator,
  getAssessmentResultsValidator,
  handleValidationErrors
} from '../validators/assess.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/assess/submit - Submit quiz/recording assessment
router.post(
  '/submit',
  submitAssessmentValidator,
  handleValidationErrors,
  submitAssessment
);

// GET /api/assess/results/:lessonKey - Get assessment results
router.get(
  '/results/:lessonKey',
  getAssessmentResultsValidator,
  handleValidationErrors,
  getAssessmentResults
);

export default router;
