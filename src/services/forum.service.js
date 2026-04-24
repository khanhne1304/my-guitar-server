import ForumPost from '../models/ForumPost.js';
import ForumComment from '../models/ForumComment.js';
import ForumReport from '../models/ForumReport.js';

export async function createPostService(userId, { content, images = [], videoUrl }) {
  const post = await ForumPost.create({
    user: userId,
    content,
    images,
    videoUrl,
  });
  return post.populate('user', 'username fullName avatarUrl');
}

export async function listPostsService({ page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;
  const filter = { isDeleted: false };

  const [items, total] = await Promise.all([
    ForumPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username fullName avatarUrl')
      .lean(),
    ForumPost.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getPostService(id) {
  const post = await ForumPost.findOne({ _id: id, isDeleted: false })
    .populate('user', 'username fullName avatarUrl')
    .lean();
  if (!post) throw new Error('POST_NOT_FOUND');
  return post;
}

export async function updatePostService(currentUser, postId, payload) {
  const post = await ForumPost.findById(postId);
  if (!post || post.isDeleted) throw new Error('POST_NOT_FOUND');

  const isOwner = String(post.user) === String(currentUser.id);
  const isAdmin = currentUser.role === 'admin';
  if (!isOwner && !isAdmin) throw new Error('FORBIDDEN');

  if (payload.content !== undefined) post.content = payload.content;
  if (payload.images !== undefined) post.images = payload.images;
  if (payload.videoUrl !== undefined) post.videoUrl = payload.videoUrl;

  await post.save();
  return post.populate('user', 'username fullName avatarUrl');
}

export async function deletePostService(currentUser, postId) {
  const post = await ForumPost.findById(postId);
  if (!post || post.isDeleted) throw new Error('POST_NOT_FOUND');

  const isOwner = String(post.user) === String(currentUser.id);
  const isAdmin = currentUser.role === 'admin';
  if (!isOwner && !isAdmin) throw new Error('FORBIDDEN');

  post.isDeleted = true;
  await post.save();
}

export async function createCommentService(userId, postId, { text }) {
  const post = await ForumPost.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new Error('POST_NOT_FOUND');

  const comment = await ForumComment.create({
    user: userId,
    post: postId,
    text,
  });

  post.commentsCount += 1;
  await post.save();

  return comment.populate('user', 'username fullName avatarUrl');
}

export async function listCommentsService(postId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ForumComment.find({ post: postId, isDeleted: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username fullName avatarUrl')
      .lean(),
    ForumComment.countDocuments({ post: postId, isDeleted: false }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function createReportService(userId, postId, { reason, note }) {
  const post = await ForumPost.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new Error('POST_NOT_FOUND');

  const report = await ForumReport.create({
    post: postId,
    reporter: userId,
    reason,
    note,
  });

  return report.populate('post', 'content').populate('reporter', 'username fullName');
}

export async function listReportsAdminService({ page = 1, limit = 10, status }) {
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    ForumReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('post', 'content isDeleted createdAt')
      .populate('reporter', 'username fullName')
      .lean(),
    ForumReport.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function updateReportStatusAdminService(adminUser, reportId, { status }) {
  const report = await ForumReport.findById(reportId);
  if (!report) throw new Error('REPORT_NOT_FOUND');

  report.status = status;
  report.handledBy = adminUser.id;
  report.handledAt = new Date();
  await report.save();

  return report
    .populate('post', 'content isDeleted createdAt')
    .populate('reporter', 'username fullName')
    .populate('handledBy', 'username fullName');
}

