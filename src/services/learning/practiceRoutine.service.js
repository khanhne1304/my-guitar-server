import PracticeRoutine from '../../models/PracticeRoutine.js';
import { getCourseForModule, assertCourseOwner } from './learning.helpers.js';
import { httpError } from '../../utils/httpError.js';

function mapRoutine(r) {
  return {
    id: r._id.toString(),
    moduleId: r.moduleId.toString(),
    exercises: (r.exercises || []).map((e) => ({
      title: e.title,
      description: e.description || '',
      durationMinutes: e.durationMinutes || 5,
    })),
    estimatedMinutes: r.estimatedMinutes || 15,
  };
}

export async function upsertPracticeRoutine(user, body) {
  const { moduleId, exercises, estimatedMinutes } = body;
  const { course } = await getCourseForModule(moduleId);
  assertCourseOwner(course, user);

  const normalized = Array.isArray(exercises)
    ? exercises
        .filter((e) => e?.title?.trim())
        .map((e) => ({
          title: String(e.title).trim(),
          description: e.description ? String(e.description).trim() : '',
          durationMinutes: Math.max(1, Number(e.durationMinutes) || 5),
        }))
    : [];

  let doc = await PracticeRoutine.findOne({ moduleId });
  if (doc) {
    doc.exercises = normalized;
    if (estimatedMinutes != null) doc.estimatedMinutes = Math.max(1, Number(estimatedMinutes) || 15);
    await doc.save();
  } else {
    doc = await PracticeRoutine.create({
      moduleId,
      exercises: normalized,
      estimatedMinutes: estimatedMinutes != null ? Math.max(1, Number(estimatedMinutes) || 15) : 15,
    });
  }
  return mapRoutine(doc.toObject());
}

export async function deletePracticeRoutine(user, moduleId) {
  const { course } = await getCourseForModule(moduleId);
  assertCourseOwner(course, user);
  await PracticeRoutine.deleteOne({ moduleId });
  return { ok: true };
}

export async function getPracticeRoutine(moduleId) {
  const r = await PracticeRoutine.findOne({ moduleId }).lean();
  return r ? mapRoutine(r) : null;
}
