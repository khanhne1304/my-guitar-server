import {
  listCoursesWithProgress,
  getCourseSummaryForUser,
  getModulesForCourse,
  getLessonsForModule,
  getQuizForModule,
} from '../services/courseCatalog.service.js';
import { markLessonComplete, submitModuleQuiz } from '../services/courseProgress.service.js';

function sendErr(res, next, e) {
  if (e && typeof e.status === 'number') {
    return res.status(e.status).json({ message: e.message });
  }
  return next(e);
}

export async function getCourses(req, res, next) {
  try {
    const list = await listCoursesWithProgress(req.user);
    res.json({ courses: list });
  } catch (e) {
    next(e);
  }
}

export async function getCourseById(req, res, next) {
  try {
    const summary = await getCourseSummaryForUser(req.params.courseId, req.user);
    if (!summary) return res.status(404).json({ message: 'Không tìm thấy khóa học' });
    res.json(summary);
  } catch (e) {
    next(e);
  }
}

export async function getModules(req, res, next) {
  try {
    const data = await getModulesForCourse(req.params.courseId, req.user);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function getLessons(req, res, next) {
  try {
    const data = await getLessonsForModule(req.params.moduleId, req.user);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function getModuleQuiz(req, res, next) {
  try {
    const data = await getQuizForModule(req.params.moduleId, req.user);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function postCompleteLesson(req, res, next) {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) return res.status(400).json({ message: 'Thiếu lessonId' });
    const data = await markLessonComplete(req.user, lessonId);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function postQuizSubmit(req, res, next) {
  try {
    const { moduleId, answers } = req.body || {};
    if (!moduleId) return res.status(400).json({ message: 'Thiếu moduleId' });
    const data = await submitModuleQuiz(req.user, moduleId, answers);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}
