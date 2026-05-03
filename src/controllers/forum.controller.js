import ForumThread from '../models/ForumThread.js';
import ForumAnswer from '../models/ForumAnswer.js';
import ForumReply from '../models/ForumReply.js';
import ForumLike from '../models/ForumLike.js';
import ForumAnswerLike from '../models/ForumAnswerLike.js';
import ForumReport from '../models/ForumReport.js';
import mongoose from 'mongoose';
import { uploadFileToCloudinary } from '../utils/cloudinary.js';

const THREAD_CATEGORIES = ['lesson', 'tab', 'chord', 'discussion'];
const ALLOWED_FILE_TYPES = new Set(['pdf', 'image', 'audio']);
const guitarKeywords = [
  'guitar',
  'đàn',
  'chord',
  'tab',
  'fingerstyle',
  'strumming',
  'hợp âm',
  'scale',
];

function isGuitarContent(text) {
  const s = String(text || '').toLowerCase();
  return guitarKeywords.some((k) => s.includes(String(k).toLowerCase()));
}

function isValidYoutube(url) {
  const s = String(url || '').trim().toLowerCase();
  if (!s) return true;
  return s.includes('youtube.com') || s.includes('youtu.be');
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .slice(0, 20)
    .map((t) => String(t).trim())
    .filter(Boolean);
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  const out = [];
  for (const f of files.slice(0, 10)) {
    const url = f?.url ? String(f.url).trim() : '';
    const type = f?.type ? String(f.type).trim() : '';
    if (!url || !type) continue;
    if (!ALLOWED_FILE_TYPES.has(type)) {
      const err = new Error('File không hợp lệ');
      err.statusCode = 400;
      throw err;
    }
    out.push({ url, type });
  }
  return out;
}

function parseListParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function listThreads(req, res, next) {
  try {
    const { category, type, q, sort = 'newest' } = req.query;
    const tags = parseListParam(req.query.tags);
    const userId = req.query.userId;

    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (userId) filter.user = userId;
    if (tags.length) filter.tags = { $in: tags };
    if (q) {
      filter.$or = [
        { title: { $regex: String(q), $options: 'i' } },
        { content: { $regex: String(q), $options: 'i' } },
        { tags: { $in: [String(q)] } },
      ];
    }

    const sortValue = String(sort || 'newest');

    // For top/unanswered we need computed fields (likes + answer count), so use aggregation.
    if (sortValue === 'top' || sortValue === 'unanswered') {
      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'forumlikes',
            let: { threadId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$thread', '$$threadId'] } } },
              {
                $group: {
                  _id: '$thread',
                  count: { $sum: 1 },
                },
              },
            ],
            as: 'likeAgg',
          },
        },
        {
          $addFields: {
            likeCount: { $ifNull: [{ $arrayElemAt: ['$likeAgg.count', 0] }, 0] },
          },
        },
        {
          $lookup: {
            from: 'forumanswers',
            let: { threadId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$thread', '$$threadId'] } } },
              { $count: 'count' },
            ],
            as: 'answersAgg',
          },
        },
        { $addFields: { answersCount: { $ifNull: [{ $arrayElemAt: ['$answersAgg.count', 0] }, 0] } } },
        ...(sortValue === 'unanswered' ? [{ $match: { answersCount: 0 } }] : []),
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userObj',
          },
        },
        { $unwind: { path: '$userObj', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            content: 1,
            type: 1,
            category: 1,
            tags: 1,
            files: 1,
            videoUrl: 1,
            mediaUrl: 1,
            bestAnswer: 1,
            createdAt: 1,
            updatedAt: 1,
            likeCount: 1,
            answersCount: 1,
            user: {
              _id: '$userObj._id',
              username: '$userObj.username',
              fullName: '$userObj.fullName',
              avatarUrl: '$userObj.avatarUrl',
            },
          },
        },
        {
          $sort:
            sortValue === 'top'
              ? { likeCount: -1, createdAt: -1 }
              : { createdAt: -1 },
        },
        { $limit: 200 },
      ];

      const items = await ForumThread.aggregate(pipeline);
      return res.json(items);
    }

    // newest/oldest can use simple find
    const sortObj = sortValue === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const items = await ForumThread.find(filter)
      .populate('user', 'username fullName avatarUrl')
      .populate('bestAnswer', '_id')
      .sort(sortObj)
      .limit(200);

    // Attach likeCount + answersCount for simple find paths too
    const threadIds = items.map((t) => t._id).filter(Boolean);
    const likesAgg = await ForumLike.aggregate([
      { $match: { thread: { $in: threadIds } } },
      { $group: { _id: '$thread', count: { $sum: 1 } } },
    ]);
    const likeMap = new Map(likesAgg.map((x) => [String(x._id), x.count]));

    const answersAgg = await ForumAnswer.aggregate([
      { $match: { thread: { $in: threadIds } } },
      { $group: { _id: '$thread', count: { $sum: 1 } } },
    ]);
    const answersMap = new Map(answersAgg.map((x) => [String(x._id), x.count]));

    const json = items.map((t) => {
      const obj = t.toObject ? t.toObject() : t;
      obj.likeCount = likeMap.get(String(t._id)) ?? 0;
      obj.answersCount = answersMap.get(String(t._id)) ?? 0;
      return obj;
    });

    return res.json(json);
  } catch (e) {
    next(e);
  }
}

export async function createThread(req, res, next) {
  try {
    const { title, content, type, category, tags, mediaUrl, files, videoUrl } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });
    if (!content?.trim()) return res.status(400).json({ message: 'content is required' });
    if (!category) return res.status(400).json({ message: 'category is required' });

    if (!THREAD_CATEGORIES.includes(String(category))) {
      return res.status(400).json({ message: 'category is invalid' });
    }

    // Enforce guitar-related content
    if (!isGuitarContent(`${title} ${content}`)) {
      return res.status(400).json({ message: 'Nội dung phải liên quan đến guitar' });
    }

    const normalizedVideoUrl = videoUrl ? String(videoUrl).trim() : '';
    if (normalizedVideoUrl && !isValidYoutube(normalizedVideoUrl)) {
      return res.status(400).json({ message: 'Link YouTube không hợp lệ' });
    }

    const normalizedTags = normalizeTags(tags);
    const normalizedFiles = normalizeFiles(files);

    // Backward-compat: if old clients send mediaUrl, keep it; otherwise derive from first image file (if any).
    const normalizedMediaUrl = mediaUrl
      ? String(mediaUrl).trim()
      : (normalizedFiles.find((f) => f.type === 'image')?.url || '');

    // Backward-compat: auto infer type if not provided
    const inferredType =
      String(category) === 'tab'
        ? 'tab'
        : String(category) === 'discussion'
          ? 'discussion'
          : 'tutorial';
    const effectiveType = type ? String(type) : inferredType;

    const doc = await ForumThread.create({
      title: String(title).trim(),
      content: String(content).trim(),
      type: effectiveType,
      category,
      tags: normalizedTags,
      files: normalizedFiles,
      videoUrl: normalizedVideoUrl,
      mediaUrl: normalizedMediaUrl,
      user: req.user.id,
    });

    const populated = await ForumThread.findById(doc._id).populate('user', 'username fullName avatarUrl');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
}

export async function uploadThreadFile(req, res, next) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'file is required' });

    const { buffer, originalname, mimetype } = file;
    if (!buffer || !originalname) return res.status(400).json({ message: 'file is invalid' });

    // Bonus: basic filename check (soft reject -> still reject to enforce guitar focus)
    const nameLower = String(originalname).toLowerCase();
    if (!nameLower.includes('guitar') && !nameLower.includes('đàn')) {
      return res.status(400).json({ message: 'Tên file phải liên quan đến guitar' });
    }

    const result = await uploadFileToCloudinary(buffer, originalname, { folder: 'forum', mimetype });
    const url = result?.secure_url || '';
    if (!url) return res.status(500).json({ message: 'Upload failed' });

    const mt = String(mimetype || '').toLowerCase();
    const type = mt === 'application/pdf' ? 'pdf' : mt.startsWith('image/') ? 'image' : 'audio';

    res.status(201).json({ url, type, originalname });
  } catch (e) {
    next(e);
  }
}

export async function getThread(req, res, next) {
  try {
    const threadId = req.params.id;
    const oid = mongoose.Types.ObjectId.isValid(threadId) ? new mongoose.Types.ObjectId(threadId) : null;
    if (!oid) return res.status(400).json({ message: 'Invalid id' });

    const pipeline = [
      { $match: { _id: oid } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userObj',
        },
      },
      { $unwind: { path: '$userObj', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'forumlikes',
          let: { threadId: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$thread', '$$threadId'] } } }, { $count: 'count' }],
          as: 'likeAgg',
        },
      },
      { $addFields: { likeCount: { $ifNull: [{ $arrayElemAt: ['$likeAgg.count', 0] }, 0] } } },
      {
        $project: {
          title: 1,
          content: 1,
          type: 1,
          category: 1,
          tags: 1,
          files: 1,
          videoUrl: 1,
          mediaUrl: 1,
          bestAnswer: 1,
          createdAt: 1,
          updatedAt: 1,
          likeCount: 1,
          user: {
            _id: '$userObj._id',
            username: '$userObj.username',
            fullName: '$userObj.fullName',
            avatarUrl: '$userObj.avatarUrl',
          },
        },
      },
    ];

    const rows = await ForumThread.aggregate(pipeline);
    const thread = rows?.[0] || null;
    if (!thread) return res.status(404).json({ message: 'Not found' });

    res.json(thread);
  } catch (e) {
    next(e);
  }
}

export async function deleteThread(req, res, next) {
  try {
    const threadId = req.params.id;
    const thread = await ForumThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: 'Not found' });

    const requesterId = String(req.user?._id || req.user?.id || '');
    const ownerId = String(thread.user || '');
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && requesterId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const answers = await ForumAnswer.find({ thread: threadId }).select('_id').lean();
    const answerIds = answers.map((a) => a._id);

    await ForumReply.deleteMany({ answer: { $in: answerIds } });
    await ForumAnswer.deleteMany({ thread: threadId });
    await ForumLike.deleteMany({ thread: threadId });
    await ForumReport.deleteMany({ thread: threadId });
    await ForumThread.deleteOne({ _id: threadId });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function listAnswers(req, res, next) {
  try {
    const threadId = req.params.id;
    const oid = mongoose.Types.ObjectId.isValid(threadId) ? new mongoose.Types.ObjectId(threadId) : null;
    if (!oid) return res.status(400).json({ message: 'Invalid thread id' });

    const pipeline = [
      { $match: { thread: oid } },
      { $sort: { isBestAnswer: -1, createdAt: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userObj',
        },
      },
      { $unwind: { path: '$userObj', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'forumanswerlikes',
          let: { answerId: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$answer', '$$answerId'] } } }, { $count: 'count' }],
          as: 'likeAgg',
        },
      },
      { $addFields: { likeCount: { $ifNull: [{ $arrayElemAt: ['$likeAgg.count', 0] }, 0] } } },
      {
        $project: {
          thread: 1,
          content: 1,
          isBestAnswer: 1,
          createdAt: 1,
          updatedAt: 1,
          likeCount: 1,
          user: {
            _id: '$userObj._id',
            username: '$userObj.username',
            fullName: '$userObj.fullName',
            avatarUrl: '$userObj.avatarUrl',
          },
        },
      },
      { $limit: 500 },
    ];

    const items = await ForumAnswer.aggregate(pipeline);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function createAnswer(req, res, next) {
  try {
    const { threadId, content } = req.body || {};
    if (!threadId) return res.status(400).json({ message: 'threadId is required' });
    if (!content?.trim()) return res.status(400).json({ message: 'content is required' });

    const thread = await ForumThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const ans = await ForumAnswer.create({
      thread: threadId,
      content: String(content).trim(),
      user: req.user.id,
    });

    const populated = await ForumAnswer.findById(ans._id).populate('user', 'username fullName avatarUrl');
    const obj = populated?.toObject ? populated.toObject() : populated;
    if (obj) obj.likeCount = 0;
    res.status(201).json(obj);
  } catch (e) {
    next(e);
  }
}

export async function updateAnswer(req, res, next) {
  try {
    const answerId = req.params.id;
    const { content } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ message: 'content is required' });

    const ans = await ForumAnswer.findById(answerId);
    if (!ans) return res.status(404).json({ message: 'Answer not found' });

    const requesterId = String(req.user?._id || req.user?.id || '');
    const ownerId = String(ans.user || '');
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && requesterId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    ans.content = String(content).trim();
    await ans.save();

    const populated = await ForumAnswer.findById(ans._id).populate('user', 'username fullName avatarUrl');
    const likeCount = await ForumAnswerLike.countDocuments({ answer: ans._id });
    const obj = populated?.toObject ? populated.toObject() : populated;
    if (obj) obj.likeCount = likeCount;
    res.json(obj);
  } catch (e) {
    next(e);
  }
}

export async function deleteAnswer(req, res, next) {
  try {
    const answerId = req.params.id;
    const ans = await ForumAnswer.findById(answerId);
    if (!ans) return res.status(404).json({ message: 'Answer not found' });

    const requesterId = String(req.user?._id || req.user?.id || '');
    const ownerId = String(ans.user || '');
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && requesterId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await ForumReply.deleteMany({ answer: ans._id });
    await ForumAnswerLike.deleteMany({ answer: ans._id });

    const thread = await ForumThread.findById(ans.thread).select('_id bestAnswer').lean();
    if (thread?.bestAnswer && String(thread.bestAnswer) === String(ans._id)) {
      await ForumThread.updateOne({ _id: thread._id }, { $set: { bestAnswer: null } });
    }

    await ForumAnswer.deleteOne({ _id: ans._id });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function toggleAnswerLike(req, res, next) {
  try {
    const answerId = req.params.id;
    const oid = mongoose.Types.ObjectId.isValid(answerId) ? new mongoose.Types.ObjectId(answerId) : null;
    if (!oid) return res.status(400).json({ message: 'answerId is invalid' });

    const ans = await ForumAnswer.findById(oid).select('_id').lean();
    if (!ans) return res.status(404).json({ message: 'Answer not found' });

    const existing = await ForumAnswerLike.findOne({ user: req.user.id, answer: oid }).select('_id').lean();
    let liked = false;
    if (existing) {
      await ForumAnswerLike.deleteOne({ _id: existing._id });
      liked = false;
    } else {
      await ForumAnswerLike.create({ user: req.user.id, answer: oid });
      liked = true;
    }

    const likeCount = await ForumAnswerLike.countDocuments({ answer: oid });
    res.json({ likeCount, liked });
  } catch (e) {
    next(e);
  }
}

export async function markBestAnswer(req, res, next) {
  try {
    const answerId = req.params.id;
    const ans = await ForumAnswer.findById(answerId);
    if (!ans) return res.status(404).json({ message: 'Answer not found' });

    const thread = await ForumThread.findById(ans.thread);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    // Only thread owner can mark best answer
    if (String(thread.user) !== String(req.user?._id || req.user?.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Unset previous best answers for this thread
    await ForumAnswer.updateMany({ thread: thread._id, isBestAnswer: true }, { $set: { isBestAnswer: false } });
    ans.isBestAnswer = true;
    await ans.save();

    thread.bestAnswer = ans._id;
    await thread.save();

    const populatedAnswer = await ForumAnswer.findById(ans._id).populate('user', 'username fullName avatarUrl');
    const populatedThread = await ForumThread.findById(thread._id)
      .populate('user', 'username fullName avatarUrl')
      .populate('bestAnswer', '_id');

    res.json({ thread: populatedThread, answer: populatedAnswer });
  } catch (e) {
    next(e);
  }
}

export async function createReply(req, res, next) {
  try {
    const { answerId, content } = req.body || {};
    if (!answerId) return res.status(400).json({ message: 'answerId is required' });
    if (!content?.trim()) return res.status(400).json({ message: 'content is required' });

    const ans = await ForumAnswer.findById(answerId);
    if (!ans) return res.status(404).json({ message: 'Answer not found' });

    const rep = await ForumReply.create({
      answer: answerId,
      content: String(content).trim(),
      user: req.user.id,
    });

    const populated = await ForumReply.findById(rep._id).populate('user', 'username fullName avatarUrl');
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
}

export async function listReplies(req, res, next) {
  try {
    const answerId = req.params.id;
    const items = await ForumReply.find({ answer: answerId })
      .populate('user', 'username fullName avatarUrl')
      .sort({ createdAt: 1 })
      .limit(500);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function updateReply(req, res, next) {
  try {
    const replyId = req.params.id;
    const { content } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ message: 'content is required' });

    const rep = await ForumReply.findById(replyId);
    if (!rep) return res.status(404).json({ message: 'Reply not found' });

    const requesterId = String(req.user?._id || req.user?.id || '');
    const ownerId = String(rep.user || '');
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && requesterId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    rep.content = String(content).trim();
    await rep.save();

    const populated = await ForumReply.findById(rep._id).populate('user', 'username fullName avatarUrl');
    res.json(populated);
  } catch (e) {
    next(e);
  }
}

export async function deleteReply(req, res, next) {
  try {
    const replyId = req.params.id;
    const rep = await ForumReply.findById(replyId);
    if (!rep) return res.status(404).json({ message: 'Reply not found' });

    const requesterId = String(req.user?._id || req.user?.id || '');
    const ownerId = String(rep.user || '');
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && requesterId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await ForumReply.deleteOne({ _id: rep._id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function toggleLike(req, res, next) {
  try {
    const { threadId } = req.body || {};
    if (!threadId) return res.status(400).json({ message: 'threadId is required' });
    const oid = mongoose.Types.ObjectId.isValid(threadId) ? new mongoose.Types.ObjectId(threadId) : null;
    if (!oid) return res.status(400).json({ message: 'threadId is invalid' });

    const thread = await ForumThread.findById(oid).select('_id').lean();
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const existing = await ForumLike.findOne({ user: req.user.id, thread: oid }).select('_id').lean();
    let liked = false;
    if (existing) {
      await ForumLike.deleteOne({ _id: existing._id });
      liked = false;
    } else {
      await ForumLike.create({ user: req.user.id, thread: oid });
      liked = true;
    }

    const likeCount = await ForumLike.countDocuments({ thread: oid });
    res.json({ likeCount, liked });
  } catch (e) {
    next(e);
  }
}

export async function createReport(req, res, next) {
  try {
    const { threadId, reason } = req.body || {};
    if (!threadId) return res.status(400).json({ message: 'threadId is required' });
    if (!reason?.trim()) return res.status(400).json({ message: 'reason is required' });

    const thread = await ForumThread.findById(threadId).select('_id').lean();
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const doc = await ForumReport.create({
      thread: threadId,
      reportedBy: req.user.id,
      reason: String(reason).trim(),
    });

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
}

export async function listReports(req, res, next) {
  try {
    const items = await ForumReport.find({})
      .populate('reportedBy', 'username fullName avatarUrl')
      .populate('thread', 'title category type user createdAt')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

