import Lesson from '../../models/Lesson.js';
import Module from '../../models/Module.js';
import Quiz from '../../models/Quiz.js';
import Course from '../../models/Course.js';
import CourseProgress from '../../models/CourseProgress.js';
import { httpError } from '../../utils/httpError.js';
import { canReadCourse, uid } from './learning.helpers.js';
import { XP_LESSON, XP_MODULE, XP_QUIZ_PASS, XP_PRACTICE } from './learning.constants.js';
import { addGlobalXp, recordActivity } from './stats.service.js';
import { getCourseDetail } from './course.service.js';

async function getOrCreateProgress(userId, courseId) {
  let doc = await CourseProgress.findOne({ userId, courseId });
  if (!doc) {
    doc = await CourseProgress.create({
      userId,
      courseId,
      completedLessons: [],
      completedModules: [],
      passedQuizIds: [],
      practiceLoggedModuleIds: [],
      xp: 0,
    });
  }
  return doc;
}

async function awardCourseXp(userId, courseId, amount) {
  if (!amount) return;
  await CourseProgress.updateOne({ userId, courseId }, { $inc: { xp: amount } });
  await addGlobalXp(userId, amount);
  await recordActivity(userId, { xpGain: amount });
}

async function allLessonsDone(moduleId, completedSet) {
  const lessons = await Lesson.find({ moduleId }).select('_id').lean();
  if (!lessons.length) return true;
  return lessons.every((l) => completedSet.has(l._id.toString()));
}

async function moduleCheckpointPassed(moduleId, passedQuizSet) {
  const checkpoint = await Quiz.findOne({ moduleId, lessonId: null }).lean();
  if (!checkpoint) return true;
  return passedQuizSet.has(checkpoint._id.toString());
}

async function tryCompleteModule(userId, courseId, moduleId, progressDoc) {
  const modId = moduleId.toString();
  if ((progressDoc.completedModules || []).includes(modId)) return { moduleCompleted: false };

  const completedLessons = new Set(progressDoc.completedLessons || []);
  const passedQuizzes = new Set(progressDoc.passedQuizIds || []);

  const lessonsDone = await allLessonsDone(moduleId, completedLessons);
  const quizDone = await moduleCheckpointPassed(moduleId, passedQuizzes);

  if (!lessonsDone || !quizDone) return { moduleCompleted: false };

  await CourseProgress.updateOne(
    { userId, courseId },
    { $addToSet: { completedModules: modId } },
  );
  await awardCourseXp(userId, courseId, XP_MODULE);
  return { moduleCompleted: true };
}

export async function completeLesson(user, lessonId) {
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) throw httpError(404, 'Không tìm thấy bài học');
  const mod = await Module.findById(lesson.moduleId).lean();
  if (!mod) throw httpError(404, 'Không tìm thấy module');
  const course = await Course.findById(mod.courseId).lean();
  if (!course || !canReadCourse(course, user)) throw httpError(404, 'Không tìm thấy khóa học');

  const userId = uid(user);
  const progress = await getOrCreateProgress(userId, course._id);
  const lessonIdStr = lesson._id.toString();
  const alreadyDone = (progress.completedLessons || []).includes(lessonIdStr);

  if (!alreadyDone) {
    await CourseProgress.updateOne(
      { userId, courseId: course._id },
      { $addToSet: { completedLessons: lessonIdStr } },
    );
    await awardCourseXp(userId, course._id, XP_LESSON);
  }

  const updated = await CourseProgress.findOne({ userId, courseId: course._id });
  const moduleResult = await tryCompleteModule(userId, course._id, mod._id, updated);

  const detail = await getCourseDetail(course._id.toString(), user);
  return {
    ok: true,
    lessonId: lessonIdStr,
    courseId: course._id.toString(),
    moduleId: mod._id.toString(),
    xpEarned: alreadyDone ? 0 : XP_LESSON,
    moduleCompleted: moduleResult.moduleCompleted,
    progressPercent: detail.course.progressPercent,
    completedLessons: detail.course.completedLessons,
  };
}

export async function logPractice(user, moduleId, minutes = 0) {
  const mod = await Module.findById(moduleId).lean();
  if (!mod) throw httpError(404, 'Không tìm thấy module');
  const course = await Course.findById(mod.courseId).lean();
  if (!course) throw httpError(404, 'Không tìm thấy khóa học');

  const userId = uid(user);
  await getOrCreateProgress(userId, course._id);
  await CourseProgress.updateOne(
    { userId, courseId: course._id },
    { $addToSet: { practiceLoggedModuleIds: mod._id.toString() } },
  );

  const mins = Math.max(0, Number(minutes) || 0);
  await recordActivity(userId, { practiceMinutes: mins, xpGain: XP_PRACTICE });
  await awardCourseXp(userId, course._id, XP_PRACTICE);

  return { ok: true, moduleId: mod._id.toString(), xpEarned: XP_PRACTICE };
}

export async function recordQuizPass(user, quizId, mod, course) {
  const userId = uid(user);
  await getOrCreateProgress(userId, course._id);
  await CourseProgress.updateOne(
    { userId, courseId: course._id },
    { $addToSet: { passedQuizIds: quizId } },
  );
  await awardCourseXp(userId, course._id, XP_QUIZ_PASS);

  const updated = await CourseProgress.findOne({ userId, courseId: course._id });
  return tryCompleteModule(userId, course._id, mod._id, updated);
}

export async function getProgress(user, courseId) {
  const course = await Course.findById(courseId).lean();
  if (!course || !canReadCourse(course, user)) throw httpError(404, 'Không tìm thấy khóa học');

  const userId = uid(user);
  const p = await CourseProgress.findOne({ userId, courseId: course._id }).lean();
  const detail = await getCourseDetail(courseId, user);

  return {
    courseId: course._id.toString(),
    completedLessons: p?.completedLessons || [],
    completedModules: p?.completedModules || [],
    passedQuizIds: p?.passedQuizIds || [],
    xp: p?.xp || 0,
    progressPercent: detail.course.progressPercent,
    totalLessons: detail.course.totalLessons,
    completedCount: detail.course.completedLessons,
  };
}
