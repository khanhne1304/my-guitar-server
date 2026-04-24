import { validationResult } from 'express-validator';
import {
  createPostService,
  listPostsService,
  getPostService,
  updatePostService,
  deletePostService,
  createCommentService,
  listCommentsService,
  createReportService,
  listReportsAdminService,
  updateReportStatusAdminService,
} from '../services/forum.service.js';

export async function listPosts(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { page = 1, limit = 10 } = req.query;
    const result = await listPostsService({ page: Number(page), limit: Number(limit) });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function createPost(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const post = await createPostService(req.user.id, req.body);
    res.status(201).json(post);
  } catch (e) {
    next(e);
  }
}

export async function getPost(req, res, next) {
  try {
    const post = await getPostService(req.params.id);
    res.json(post);
  } catch (e) {
    if (e.message === 'POST_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    next(e);
  }
}

export async function updatePost(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const updated = await updatePostService(req.user, req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    if (e.message === 'POST_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    if (e.message === 'FORBIDDEN') {
      return res.status(403).json({ message: 'Bạn không có quyền sửa bài viết này' });
    }
    next(e);
  }
}

export async function deletePost(req, res, next) {
  try {
    await deletePostService(req.user, req.params.id);
    res.json({ message: 'Đã xoá bài viết' });
  } catch (e) {
    if (e.message === 'POST_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    if (e.message === 'FORBIDDEN') {
      return res.status(403).json({ message: 'Bạn không có quyền xoá bài viết này' });
    }
    next(e);
  }
}

export async function listComments(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await listCommentsService(req.params.postId, {
      page: Number(page),
      limit: Number(limit),
    });
    res.json(result);
  } catch (e) {
    if (e.message === 'POST_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    next(e);
  }
}

export async function createComment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const comment = await createCommentService(req.user.id, req.params.postId, req.body);
    res.status(201).json(comment);
  } catch (e) {
    if (e.message === 'POST_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    next(e);
  }
}

export async function createReport(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const report = await createReportService(req.user.id, req.params.postId, req.body);
    res.status(201).json(report);
  } catch (e) {
    if (e.message === 'POST_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    next(e);
  }
}

export async function listReportsAdmin(req, res, next) {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const result = await listReportsAdminService({
      page: Number(page),
      limit: Number(limit),
      status,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function updateReportStatusAdmin(req, res, next) {
  try {
    const { status } = req.body;
    const updated = await updateReportStatusAdminService(req.user, req.params.id, { status });
    res.json(updated);
  } catch (e) {
    if (e.message === 'REPORT_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo' });
    }
    next(e);
  }
}

