import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  listComments,
  createComment,
  createReport,
  listReportsAdmin,
  updateReportStatusAdmin,
} from '../controllers/forum.controller.js';
import {
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateCreateReport,
  validateListPosts,
} from '../validators/forum.validator.js';

const router = Router();

// Public posts
router.get('/posts', validateListPosts, listPosts);
router.get('/posts/:id', getPost);

// User posts
router.post('/posts', protect, validateCreatePost, createPost);
router.patch('/posts/:id', protect, validateUpdatePost, updatePost);
router.delete('/posts/:id', protect, deletePost);

// Comments
router.get('/posts/:postId/comments', listComments);
router.post('/posts/:postId/comments', protect, validateCreateComment, createComment);

// Reports
router.post('/posts/:postId/report', protect, validateCreateReport, createReport);

// Admin – reports overview
router.get('/admin/reports', protect, admin, listReportsAdmin);
router.patch('/admin/reports/:id', protect, admin, updateReportStatusAdmin);

export default router;

