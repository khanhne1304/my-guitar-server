import * as courseService from '../services/learning/course.service.js';
import { sendHttpError } from '../utils/httpError.js';

export async function listCourses(req, res, next) {
  try {
    const courses = await courseService.listAllCoursesForAdmin();
    res.json({ courses });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function createCourse(req, res, next) {
  try {
    const { title, description, thumbnail, level, tags } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Tiêu đề khóa học là bắt buộc' });
    }
    const course = await courseService.createCourse(req.user, {
      title,
      description,
      thumbnail,
      level,
      tags,
    });
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
