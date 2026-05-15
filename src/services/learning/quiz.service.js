import Quiz from '../../models/Quiz.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import Lesson from '../../models/Lesson.js';
import Module from '../../models/Module.js';
import { httpError } from '../../utils/httpError.js';
import { getCourseForModule, assertCourseOwner, canReadCourse, uid } from './learning.helpers.js';
import { XP_QUIZ_PASS } from './learning.constants.js';
import * as progressService from './progress.service.js';

function normalizeQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1) {
    throw httpError(400, 'Cần ít nhất 1 câu hỏi');
  }
  return questions.map((q, i) => {
    const key = q.key || `q${i + 1}`;
    const text = q.text || q.question;
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
    const correctIndex = q.correctIndex ?? q.correct;
    if (!text || options.length < 2) {
      throw httpError(400, `Câu ${i + 1}: cần nội dung và ít nhất 2 phương án`);
    }
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length) {
      throw httpError(400, `Câu ${i + 1}: correctIndex không hợp lệ`);
    }
    return { key: String(key), text: String(text).trim(), options, correctIndex };
  });
}

async function mapQuizPublic(q) {
  const mod = await Module.findById(q.moduleId).select('courseId').lean();
  return {
    id: q._id.toString(),
    moduleId: q.moduleId.toString(),
    courseId: mod?.courseId?.toString() || null,
    lessonId: q.lessonId?.toString() || null,
    title: q.title,
    passingScore: q.passingScore,
    questions: q.questions.map((x) => ({
      key: x.key,
      text: x.text,
      options: x.options,
    })),
  };
}

async function mapQuizFull(q) {
  const base = await mapQuizPublic(q);
  return {
    ...base,
    questions: q.questions.map((x) => ({
      key: x.key,
      text: x.text,
      options: x.options,
      correctIndex: x.correctIndex,
    })),
  };
}

async function assertLessonInModule(lessonId, moduleId) {
  if (!lessonId) return;
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson || lesson.moduleId.toString() !== moduleId.toString()) {
    throw httpError(400, 'lessonId không thuộc module này');
  }
}

export async function createQuiz(user, body) {
  const { moduleId, lessonId, title, questions, passingScore } = body;
  const { course } = await getCourseForModule(moduleId);
  assertCourseOwner(course, user);
  await assertLessonInModule(lessonId || null, moduleId);

  const normalized = normalizeQuestions(questions);
  const quiz = await Quiz.create({
    moduleId,
    lessonId: lessonId || null,
    title: String(title).trim(),
    questions: normalized,
    passingScore: passingScore != null ? Math.min(100, Math.max(0, Number(passingScore))) : 60,
  });
  return await mapQuizFull(quiz.toObject());
}

export async function updateQuiz(user, quizId, body) {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw httpError(404, 'Không tìm thấy quiz');
  const { course } = await getCourseForModule(quiz.moduleId);
  assertCourseOwner(course, user);

  if (body.title !== undefined) quiz.title = String(body.title).trim();
  if (body.passingScore !== undefined) {
    quiz.passingScore = Math.min(100, Math.max(0, Number(body.passingScore) || 60));
  }
  if (body.lessonId !== undefined) {
    await assertLessonInModule(body.lessonId || null, quiz.moduleId);
    quiz.lessonId = body.lessonId || null;
  }
  if (body.questions !== undefined) quiz.questions = normalizeQuestions(body.questions);
  await quiz.save();
  return await mapQuizFull(quiz.toObject());
}

export async function deleteQuiz(user, quizId) {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw httpError(404, 'Không tìm thấy quiz');
  const { course } = await getCourseForModule(quiz.moduleId);
  assertCourseOwner(course, user);
  await QuizAttempt.deleteMany({ quizId: quiz._id });
  await Quiz.deleteOne({ _id: quiz._id });
  return { ok: true };
}

export async function getQuizForTake(quizId, viewer) {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw httpError(404, 'Không tìm thấy quiz');
  const { course } = await getCourseForModule(quiz.moduleId);
  if (!canReadCourse(course, viewer)) throw httpError(404, 'Không tìm thấy khóa học');
  return await mapQuizPublic(quiz);
}

export async function getQuizForEdit(quizId, viewer) {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw httpError(404, 'Không tìm thấy quiz');
  const { course } = await getCourseForModule(quiz.moduleId);
  const vid = uid(viewer);
  const isOwner = vid && (course.createdBy?.toString() === vid || viewer?.role === 'admin');
  if (!isOwner) return await mapQuizPublic(quiz);
  return await mapQuizFull(quiz);
}

export async function submitQuiz(user, quizId, answers) {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw httpError(404, 'Không tìm thấy quiz');
  const { course, module: mod } = await getCourseForModule(quiz.moduleId);
  if (!canReadCourse(course, user)) throw httpError(404, 'Không tìm thấy khóa học');

  const answerObj = answers && typeof answers === 'object' ? answers : {};
  let correct = 0;
  const n = quiz.questions.length;
  for (const q of quiz.questions) {
    const picked = answerObj[q.key];
    if (typeof picked === 'number' && picked === q.correctIndex) correct += 1;
  }
  const score = n === 0 ? 0 : Math.round((correct / n) * 100);
  const passed = score >= quiz.passingScore;

  const attempt = await QuizAttempt.create({
    userId: user._id,
    quizId: quiz._id,
    score,
    answers: answerObj,
    passed,
  });

  let moduleCompleted = false;
  if (passed) {
    const result = await progressService.recordQuizPass(user, quiz._id.toString(), mod, course);
    moduleCompleted = result.moduleCompleted;
  }

  return {
    attemptId: attempt._id.toString(),
    quizId: quiz._id.toString(),
    score,
    passed,
    passingScore: quiz.passingScore,
    correctCount: correct,
    totalQuestions: n,
    xpEarned: passed ? XP_QUIZ_PASS : 0,
    moduleCompleted,
    courseId: course._id.toString(),
    moduleId: mod._id.toString(),
    message: passed ? 'Chúc mừng! Bạn đã đạt yêu cầu.' : `Chưa đạt. Cần tối thiểu ${quiz.passingScore}%.`,
  };
}
