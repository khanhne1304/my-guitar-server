import ChallengeSong from '../../models/ChallengeSong.js';
import { extractYouTubeVideoId } from '../../utils/youtube.js';
import { getCourseForModule, assertCourseOwner } from './learning.helpers.js';
import { httpError } from '../../utils/httpError.js';

function mapChallenge(c) {
  return {
    id: c._id.toString(),
    moduleId: c.moduleId.toString(),
    title: c.title,
    artist: c.artist || '',
    youtubeUrl: c.youtubeUrl,
    youtubeVideoId: extractYouTubeVideoId(c.youtubeUrl) || '',
    difficulty: c.difficulty || 'easy',
  };
}

export async function upsertChallengeSong(user, body) {
  const { moduleId, title, artist, youtubeUrl, difficulty } = body;
  const { course } = await getCourseForModule(moduleId);
  assertCourseOwner(course, user);

  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) throw httpError(400, 'youtubeUrl không hợp lệ');

  const payload = {
    title: String(title).trim(),
    artist: artist ? String(artist).trim() : '',
    youtubeUrl: String(youtubeUrl).trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy',
  };

  let doc = await ChallengeSong.findOne({ moduleId });
  if (doc) {
    Object.assign(doc, payload);
    await doc.save();
  } else {
    doc = await ChallengeSong.create({ moduleId, ...payload });
  }
  return mapChallenge(doc.toObject());
}

export async function deleteChallengeSong(user, moduleId) {
  const { course } = await getCourseForModule(moduleId);
  assertCourseOwner(course, user);
  await ChallengeSong.deleteOne({ moduleId });
  return { ok: true };
}

export async function getChallengeSong(moduleId) {
  const c = await ChallengeSong.findOne({ moduleId }).lean();
  return c ? mapChallenge(c) : null;
}
