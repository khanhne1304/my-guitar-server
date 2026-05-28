import Course from '../../models/Course.js';
import Module from '../../models/Module.js';
import Lesson from '../../models/Lesson.js';
import Quiz from '../../models/Quiz.js';
import PracticeRoutine from '../../models/PracticeRoutine.js';
import ChallengeSong from '../../models/ChallengeSong.js';
import CourseProgress from '../../models/CourseProgress.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import { httpError } from '../../utils/httpError.js';
import { assertCourseOwner, mapCourseBase } from './learning.helpers.js';

function mapModule(m, extra = {}) {
  return {
    id: m._id.toString(),
    courseId: m.courseId.toString(),
    title: m.title,
    description: m.description || '',
    order: m.order,
    ...extra,
  };
}

export async function createModule(user, body) {
  const { courseId, title, description, order } = body;
  const course = await Course.findById(courseId);
  assertCourseOwner(course, user);

  let nextOrder = order;
  if (nextOrder == null) {
    const last = await Module.findOne({ courseId: course._id }).sort({ order: -1 }).select('order');
    nextOrder = last ? last.order + 1 : 1;
  }

  const mod = await Module.create({
    courseId: course._id,
    title: String(title).trim(),
    description: description != null ? String(description).trim() : '',
    order: nextOrder,
  });
  return mapModule(mod.toObject());
}

export async function updateModule(user, moduleId, body) {
  const mod = await Module.findById(moduleId);
  if (!mod) throw httpError(404, 'Không tìm thấy module');
  const course = await Course.findById(mod.courseId);
  assertCourseOwner(course, user);

  if (body.title !== undefined) mod.title = String(body.title).trim();
  if (body.description !== undefined) mod.description = String(body.description).trim();
  if (body.order !== undefined) mod.order = Math.max(1, Number(body.order) || 1);
  await mod.save();
  return mapModule(mod.toObject());
}

export async function deleteModule(user, moduleId) {
  const mod = await Module.findById(moduleId);
  if (!mod) throw httpError(404, 'Không tìm thấy module');
  const course = await Course.findById(mod.courseId);
  assertCourseOwner(course, user);

  const lessons = await Lesson.find({ moduleId: mod._id }).select('_id').lean();
  const lessonIds = lessons.map((l) => l._id);
  const quizzes = await Quiz.find({ moduleId: mod._id }).select('_id').lean();
  const quizIds = quizzes.map((q) => q._id);

  if (quizIds.length) await QuizAttempt.deleteMany({ quizId: { $in: quizIds } });
  await Quiz.deleteMany({ moduleId: mod._id });
  await Lesson.deleteMany({ moduleId: mod._id });
  await PracticeRoutine.deleteOne({ moduleId: mod._id });
  await ChallengeSong.deleteOne({ moduleId: mod._id });

  const lessonIdStrs = lessonIds.map((id) => id.toString());
  await CourseProgress.updateMany(
    { courseId: course._id },
    {
      $pull: {
        completedLessons: { $in: lessonIdStrs },
        completedModules: mod._id.toString(),
        passedQuizIds: { $in: quizIds.map((id) => id.toString()) },
        practiceLoggedModuleIds: mod._id.toString(),
      },
    },
  );

  await Module.deleteOne({ _id: mod._id });

  const remaining = await Module.find({ courseId: course._id }).sort({ order: 1, _id: 1 });
  for (let i = 0; i < remaining.length; i++) {
    remaining[i].order = i + 1;
    await remaining[i].save();
  }
  return { ok: true };
}

export { mapModule };
