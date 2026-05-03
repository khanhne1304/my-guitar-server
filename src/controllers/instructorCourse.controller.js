import * as svc from '../services/instructorCourse.service.js';

function sendErr(res, next, e) {
  if (e && typeof e.status === 'number') {
    const payload = { message: e.message };
    if (e.issues) payload.issues = e.issues;
    return res.status(e.status).json(payload);
  }
  return next(e);
}

export async function listMyCourses(req, res, next) {
  try {
    const courses = await svc.listMyCourses(req.user._id);
    res.json({
      courses: courses.map((c) => ({
        id: c._id.toString(),
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        isPublished: c.isPublished,
        level: c.level,
        thumbnail: c.thumbnail,
        tags: c.tags,
        price: c.price,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function getBuilder(req, res, next) {
  try {
    const data = await svc.getCourseBuilder(req.user, req.params.courseId);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function createCourse(req, res, next) {
  try {
    const course = await svc.createCourse(req.user, req.body);
    res.status(201).json(course);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const course = await svc.updateCourse(req.user, req.params.courseId, req.body);
    res.json(course);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const data = await svc.deleteCourse(req.user, req.params.courseId);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function publishCourse(req, res, next) {
  try {
    const data = await svc.publishCourse(req.user, req.params.courseId);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function addModule(req, res, next) {
  try {
    const mod = await svc.addModule(req.user, req.body);
    res.status(201).json(mod);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function addLesson(req, res, next) {
  try {
    const les = await svc.addLesson(req.user, req.body);
    res.status(201).json(les);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function upsertQuiz(req, res, next) {
  try {
    const quiz = await svc.upsertQuiz(req.user, req.body);
    res.json(quiz);
  } catch (e) {
    sendErr(res, next, e);
  }
}

export async function reorderModules(req, res, next) {
  try {
    const { courseId } = req.params;
    const { orderedModuleIds } = req.body || {};
    const data = await svc.reorderModules(req.user, courseId, orderedModuleIds);
    res.json(data);
  } catch (e) {
    sendErr(res, next, e);
  }
}
