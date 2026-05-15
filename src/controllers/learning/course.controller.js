import * as courseService from '../../services/learning/course.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function listCourses(req, res, next) {
  try {
    const mine = req.query.mine === '1' || req.query.mine === 'true';
    if (mine) {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const courses = await courseService.listMyCourses(req.user._id);
      return res.json({ courses });
    }
    const courses = await courseService.listPublishedCourses(req.user || null);
    res.json({ courses });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function getCourse(req, res, next) {
  try {
    const data = await courseService.getCourseDetail(req.params.id, req.user || null, {
      includeQuizAnswers: true,
    });
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function createCourse(req, res, next) {
  try {
    const course = await courseService.createCourse(req.user, req.body);
    res.status(201).json({ course });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const course = await courseService.updateCourse(req.user, req.params.id, req.body);
    res.json({ course });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const data = await courseService.deleteCourse(req.user, req.params.id);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function publishCourse(req, res, next) {
  try {
    const data = await courseService.publishCourse(req.user, req.params.id);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
