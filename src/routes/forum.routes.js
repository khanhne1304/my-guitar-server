import { Router } from 'express';
import { admin, protect } from '../middlewares/auth.js';
import { forumUpload } from '../middlewares/forumUpload.js';
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
router.get('/threads', listThreads);
router.post('/threads', protect, createThread);
router.post('/uploads', protect, forumUpload.single('file'), uploadThreadFile);
router.get('/threads/:id', getThread);
router.delete('/threads/:id', protect, deleteThread);
router.get('/threads/:id/answers', listAnswers);

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

