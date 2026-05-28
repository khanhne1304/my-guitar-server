import * as progressService from '../../services/learning/progress.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function completeLesson(req, res, next) {
  try {
    const data = await progressService.completeLesson(req.user, req.body.lessonId);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function getProgress(req, res, next) {
  try {
    const data = await progressService.getProgress(req.user, req.params.courseId);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function logPractice(req, res, next) {
  try {
    const { moduleId, minutes } = req.body;
    const data = await progressService.logPractice(req.user, moduleId, minutes);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
