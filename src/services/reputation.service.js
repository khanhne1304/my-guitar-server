import User from '../models/User.js';

const KARMA_THREAD_LIKE = 5;
const KARMA_BEST_ANSWER = 10;

/** Thresholds for badge tiers */
const BADGE_INTERMEDIATE = 100;
const BADGE_PRO = 500;

function badgeFromKarma(karma) {
  const k = typeof karma === 'number' && Number.isFinite(karma) ? karma : 0;
  if (k >= BADGE_PRO) return 'pro';
  if (k >= BADGE_INTERMEDIATE) return 'intermediate';
  return 'beginner';
}

/**
 * Adjust forum karma for a user and refresh badge.
 * @param {string} userId
 * @param {number} delta — positive or negative
 */
export async function adjustForumKarma(userId, delta) {
  if (!userId || !delta) return null;
  const u = await User.findById(userId).select('_id forumKarma forumBadge');
  if (!u) return null;
  const next = Math.max(0, (u.forumKarma || 0) + delta);
  u.forumKarma = next;
  u.forumBadge = badgeFromKarma(next);
  await u.save();
  return u;
}

export async function onThreadLiked(threadOwnerId, isNowLiked) {
  const delta = isNowLiked ? KARMA_THREAD_LIKE : -KARMA_THREAD_LIKE;
  return adjustForumKarma(threadOwnerId, delta);
}

export async function onBestAnswerChosen(answerAuthorId) {
  return adjustForumKarma(answerAuthorId, KARMA_BEST_ANSWER);
}

export const karmaConstants = {
  KARMA_THREAD_LIKE,
  KARMA_BEST_ANSWER,
};
