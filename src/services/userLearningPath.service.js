import mongoose from 'mongoose';
import UserLearningPath from '../models/UserLearningPath.js';

function assertValidPathId(pathId) {
  if (!mongoose.Types.ObjectId.isValid(pathId)) {
    const err = new Error('Không tìm thấy lộ trình.');
    err.status = 404;
    throw err;
  }
}

const MAX_STEPS = 80;

function normalizeSteps(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (let i = 0; i < raw.length && out.length < MAX_STEPS; i++) {
    const s = raw[i];
    if (!s || typeof s !== 'object') continue;
    const title = typeof s.title === 'string' ? s.title.trim() : '';
    if (!title) continue;
    const note = typeof s.note === 'string' ? s.note.trim().slice(0, 1000) : '';
    out.push({ title: title.slice(0, 200), note, order: out.length });
  }
  return out;
}

function toClient(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const idStr = o._id?.toString ? o._id.toString() : String(o._id);
  const steps = Array.isArray(o.steps)
    ? [...o.steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  return {
    id: idStr,
    title: o.title,
    description: o.description || '',
    steps: steps.map((s, idx) => ({
      title: s.title,
      note: s.note || '',
      order: typeof s.order === 'number' ? s.order : idx,
    })),
    updatedAt: o.updatedAt,
    createdAt: o.createdAt,
  };
}

export async function listPaths(userId) {
  const list = await UserLearningPath.find({ user: userId }).sort({ updatedAt: -1 }).lean();
  return list.map((row) => toClient(row));
}

export async function getPathForOwner(userId, pathId) {
  assertValidPathId(pathId);
  const doc = await UserLearningPath.findOne({ _id: pathId, user: userId });
  if (!doc) {
    const err = new Error('Không tìm thấy lộ trình.');
    err.status = 404;
    throw err;
  }
  return toClient(doc);
}

export async function createPath(userId, body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) {
    const err = new Error('Nhập tiêu đề lộ trình.');
    err.status = 400;
    throw err;
  }
  const description =
    typeof body?.description === 'string' ? body.description.trim().slice(0, 3000) : '';
  const steps = normalizeSteps(body?.steps);

  const doc = await UserLearningPath.create({
    user: userId,
    title: title.slice(0, 160),
    description,
    steps,
  });
  return toClient(doc);
}

export async function updatePath(userId, pathId, body) {
  assertValidPathId(pathId);
  const doc = await UserLearningPath.findOne({ _id: pathId, user: userId });
  if (!doc) {
    const err = new Error('Không tìm thấy lộ trình.');
    err.status = 404;
    throw err;
  }

  if (body?.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      const err = new Error('Tiêu đề không được để trống.');
      err.status = 400;
      throw err;
    }
    doc.title = title.slice(0, 160);
  }
  if (body?.description !== undefined) {
    doc.description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 3000) : '';
  }
  if (body?.steps !== undefined) {
    doc.steps = normalizeSteps(body.steps);
  }

  await doc.save();
  return toClient(doc);
}

export async function deletePath(userId, pathId) {
  assertValidPathId(pathId);
  const r = await UserLearningPath.deleteOne({ _id: pathId, user: userId });
  if (r.deletedCount !== 1) {
    const err = new Error('Không tìm thấy lộ trình.');
    err.status = 404;
    throw err;
  }
  return { ok: true };
}
