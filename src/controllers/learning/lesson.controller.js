import * as lessonService from '../../services/learning/lesson.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function createLesson(req, res, next) {
  try {
    const lesson = await lessonService.createLesson(req.user, req.body);
    res.status(201).json({ lesson });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function updateLesson(req, res, next) {
  try {
    const lesson = await lessonService.updateLesson(req.user, req.params.id, req.body);
    res.json({ lesson });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function deleteLesson(req, res, next) {
  try {
    const data = await lessonService.deleteLesson(req.user, req.params.id);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
