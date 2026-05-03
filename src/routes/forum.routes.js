import { Router } from 'express';
import { admin, optionalAuth, protect } from '../middlewares/auth.js';
import { forumUpload } from '../middlewares/forumUpload.js';
import { validateGuitarContent } from '../middlewares/validateGuitarContent.js';
import { validateImageContent } from '../middlewares/validateImageContent.js';
import {
  listThreads,
  createThread,
  uploadThreadFile,
  getThread,
  deleteThread,
  listAnswers,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  markBestAnswer,
  listReplies,
  createReply,
  updateReply,
  deleteReply,
  toggleLike,
  toggleAnswerLike,
  createReport,
  listReports,
} from '../controllers/forum.controller.js';

const router = Router();

// Threads
router.get('/threads', optionalAuth, listThreads);
router.post('/threads', protect, validateGuitarContent, createThread);
router.post('/uploads', protect, forumUpload.single('file'), validateImageContent, uploadThreadFile);
router.get('/threads/:id', optionalAuth, getThread);
router.delete('/threads/:id', protect, deleteThread);
router.get('/threads/:id/answers', optionalAuth, listAnswers);

// Answers
router.post('/answers', protect, createAnswer);
router.patch('/answers/:id', protect, updateAnswer);
router.delete('/answers/:id', protect, deleteAnswer);
router.patch('/answers/:id/best', protect, markBestAnswer);
router.post('/answers/:id/likes', protect, toggleAnswerLike);
router.get('/answers/:id/replies', listReplies);

// Replies
router.post('/replies', protect, createReply);
router.patch('/replies/:id', protect, updateReply);
router.delete('/replies/:id', protect, deleteReply);

// Likes
router.post('/likes', protect, toggleLike);

// Reports
router.post('/reports', protect, createReport);
router.get('/reports', protect, admin, listReports);

export default router;

