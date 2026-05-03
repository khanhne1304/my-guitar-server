import CourseLesson from '../models/CourseLesson.js';
import CourseModule from '../models/CourseModule.js';
import Course from '../models/Course.js';
import ModuleQuiz from '../models/ModuleQuiz.js';
import CourseUserProgress from '../models/CourseUserProgress.js';
import {
  QUIZ_PASS_PERCENT,
  getLessonsForModule,
  getCourseSummaryForUser,
  canReadCourseContent,
  viewerId,
} from './courseCatalog.service.js';

async function getOrCreateProgress(userId, courseId) {
  let doc = await CourseUserProgress.findOne({ user: userId, course: courseId });
  if (!doc) {
    doc = await CourseUserProgress.create({
      user: userId,
      course: courseId,
      completedLessonIds: [],
      quizScores: [],
    });
  }
  return doc;
}

export async function markLessonComplete(viewer, lessonId) {
  const les = await CourseLesson.findById(lessonId).lean();
  if (!les) {
    const err = new Error('Không tìm thấy bài học');
    err.status = 404;
    throw err;
  }

  const check = await getLessonsForModule(les.module.toString(), viewer);
  const row = check.lessons.find((l) => l.id === les._id.toString());
  if (!row || row.locked) {
    const err = new Error('Bài học đang khóa');
    err.status = 403;
    throw err;
  }

  const mod = await CourseModule.findById(les.module).lean();
  const course = await Course.findById(mod.course).lean();
  if (!course || !canReadCourseContent(course, viewer)) {
    const err = new Error('Không tìm thấy khóa học');
    err.status = 404;
    throw err;
  }

  const uid = viewerId(viewer);
  await getOrCreateProgress(uid, course._id);
  await CourseUserProgress.updateOne(
    { user: uid, course: course._id },
    { $addToSet: { completedLessonIds: les._id.toString() } },
  );

  const summary = await getCourseSummaryForUser(course._id, viewer);
  return { ok: true, lessonId: les._id.toString(), courseProgress: summary };
}

export async function submitModuleQuiz(viewer, moduleId, answers) {
  const mod = await CourseModule.findById(moduleId).lean();
  if (!mod) {
    const err = new Error('Không tìm thấy học phần');
    err.status = 404;
    throw err;
  }

  const course = await Course.findById(mod.course).lean();
  if (!course || !canReadCourseContent(course, viewer)) {
    const err = new Error('Không tìm thấy khóa học');
    err.status = 404;
    throw err;
  }

  const uid = viewerId(viewer);
  const lessons = await CourseLesson.find({ module: mod._id }).lean();
  const progress = await CourseUserProgress.findOne({ user: uid, course: course._id }).lean();
  const completed = new Set(progress?.completedLessonIds || []);
  const allLessonsDone =
    lessons.length > 0 && lessons.every((l) => completed.has(l._id.toString()));
  if (!allLessonsDone) {
    const err = new Error('Hãy hoàn thành tất cả bài học trong học phần trước khi làm kiểm tra');
    err.status = 400;
    throw err;
  }

  const quiz = await ModuleQuiz.findOne({ module: mod._id }).lean();
  if (!quiz) {
    const err = new Error('Chưa có bài kiểm tra cho học phần này');
    err.status = 404;
    throw err;
  }

  const answerObj = answers && typeof answers === 'object' ? answers : {};
  let correct = 0;
  const n = quiz.questions.length;
  for (const q of quiz.questions) {
    const picked = answerObj[q.key];
    if (typeof picked === 'number' && picked === q.correctIndex) correct += 1;
  }
  const scorePercent = n === 0 ? 0 : Math.round((correct / n) * 100);
  const passed = scorePercent >= QUIZ_PASS_PERCENT;

  await getOrCreateProgress(uid, course._id);
  const doc = await CourseUserProgress.findOne({ user: uid, course: course._id });
  doc.quizScores = (doc.quizScores || []).filter((x) => x.module.toString() !== mod._id.toString());
  doc.quizScores.push({
    module: mod._id,
    scorePercent,
    passed,
    submittedAt: new Date(),
  });
  await doc.save();

  return {
    ok: true,
    moduleId: mod._id.toString(),
    courseId: course._id.toString(),
    scorePercent,
    correctCount: correct,
    totalQuestions: n,
    passed,
    passPercentRequired: QUIZ_PASS_PERCENT,
    message: passed
      ? 'Làm tốt lắm! Học phần tiếp theo đã được mở khóa.'
      : `Bạn đạt ${scorePercent}%. Cần ít nhất ${QUIZ_PASS_PERCENT}% để mở học phần tiếp theo.`,
  };
}
