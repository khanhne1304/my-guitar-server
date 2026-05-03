import UserFollow from '../models/UserFollow.js';
import TagFollow from '../models/TagFollow.js';
import User from '../models/User.js';

export async function followUser(req, res, next) {
  try {
    const targetId = req.params.id;
    const self = req.user._id || req.user.id;
    if (String(targetId) === String(self)) {
      return res.status(400).json({ message: 'Không thể theo dõi chính mình' });
    }
    const exists = await User.findById(targetId).select('_id').lean();
    if (!exists) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    await UserFollow.updateOne(
      { follower: self, following: targetId },
      { $setOnInsert: { follower: self, following: targetId } },
      { upsert: true },
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function unfollowUser(req, res, next) {
  try {
    await UserFollow.deleteOne({ follower: req.user._id || req.user.id, following: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function followTag(req, res, next) {
  try {
    const raw = decodeURIComponent(String(req.params.tag || '')).trim();
    if (!raw) return res.status(400).json({ message: 'tag is required' });
    const tag = raw.toLowerCase();

    await TagFollow.updateOne(
      { user: req.user._id || req.user.id, tag },
      { $setOnInsert: { user: req.user._id || req.user.id, tag } },
      { upsert: true },
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function unfollowTag(req, res, next) {
  try {
    const raw = decodeURIComponent(String(req.params.tag || '')).trim().toLowerCase();
    await TagFollow.deleteOne({ user: req.user._id || req.user.id, tag: raw });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

/** Danh sách user đang follow + tag đang follow */
export async function listFollowing(req, res, next) {
  try {
    const uid = req.user._id || req.user.id;
    const rows = await UserFollow.find({ follower: uid })
      .populate('following', 'username fullName avatarUrl forumKarma forumBadge')
      .limit(500)
      .lean();
    const tagRows = await TagFollow.find({ user: uid }).select('tag').lean();

    res.json({
      users: rows.map((r) => r.following).filter(Boolean),
      tags: tagRows.map((t) => t.tag),
    });
  } catch (e) {
    next(e);
  }
}
