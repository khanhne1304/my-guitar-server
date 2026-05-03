import crypto from 'crypto';
import slugify from 'slugify';
import Course from '../models/Course.js';
import CourseModule from '../models/CourseModule.js';
import CourseLesson from '../models/CourseLesson.js';
import ModuleQuiz from '../models/ModuleQuiz.js';
import CourseUserProgress from '../models/CourseUserProgress.js';
import { toYouTubeEmbedUrl } from './courseCatalog.service.js';

function assertCanEditCourse(course, user) {
  if (!course) {
    const err = new Error('Không tìm thấy khóa học');
    err.status = 404;
    throw err;
  }
  if (user.role === 'admin') return;
  if (course.createdBy?.toString() === user._id.toString()) return;
  const err = new Error('Bạn không phải chủ khóa học này');
  err.status = 403;
  throw err;
}

function isValidYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return Boolean(toYouTubeEmbedUrl(url.trim()));
}

function makeUniqueSlug(title) {
  const base = slugify(String(title || 'khoa-hoc'), { lower: true, strict: true, trim: true });
  return `${base || 'khoa'}-${crypto.randomBytes(3).toString('hex')}`;
}

export async function listMyCourses(userId) {
  return Course.find({ createdBy: userId }).sort({ updatedAt: -1 }).lean();
}

export async function createCourse(user, body) {
  const { title, description, subtitle, thumbnail, level, levelLabel, price, tags } = body || {};
  if (!title || String(title).trim().length < 2) {
    const err = new Error('Tiêu đề khóa học quá ngắn');
    err.status = 400;
    throw err;
  }
  const slug = makeUniqueSlug(title);
  const course = await Course.create({
    slug,
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    subtitle: subtitle ? String(subtitle).trim() : '',
    thumbnail: thumbnail ? String(thumbnail).trim() : '',
    level: ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner',
    levelLabel: levelLabel ? String(levelLabel).trim() : '',
    price: price != null && price !== '' ? Math.max(0, Number(price)) : null,
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean) : [],
    isPublished: false,
    createdBy: user._id,
    order: 999,
  });
  return course.toObject();
}

export async function updateCourse(user, courseId, body) {
  const course = await Course.findById(courseId);
  assertCanEditCourse(course, user);
  const allowed = ['title', 'description', 'subtitle', 'thumbnail', 'level', 'levelLabel', 'price', 'tags'];
  const updates = {};
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === 'tags') {
      updates[k] = Array.isArray(body.tags)
        ? body.tags.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
        : [];
    } else if (k === 'price') {
      updates[k] = body.price != null && body.price !== '' ? Math.max(0, Number(body.price)) : null;
    } else if (k === 'level') {
      updates[k] = ['beginner', 'intermediate', 'advanced'].includes(body.level) ? body.level : course.level;
    } else {
      updates[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
    }
  }
  Object.assign(course, updates);
  await course.save();
  return course.toObject();
}

export async function deleteCourse(user, courseId) {
  const course = await Course.findById(courseId);
  assertCanEditCourse(course, user);
  const mods = await CourseModule.find({ course: course._id }).select('_id');
  const mids = mods.map((m) => m._id);
  await CourseLesson.deleteMany({ module: { $in: mids } });
  await ModuleQuiz.deleteMany({ module: { $in: mids } });
  await CourseModule.deleteMany({ course: course._id });
  await CourseUserProgress.deleteMany({ course: course._id });
  await Course.deleteOne({ _id: course._id });
  return { ok: true };
}

export async function validateCourseReadyToPublish(courseId) {
  const modules = await CourseModule.find({ course: courseId }).sort({ order: 1 }).lean();
  if (modules.length < 1) {
    return { ok: false, issues: ['Khóa học cần ít nhất một học phần'] };
  }
  let totalLessons = 0;
  const issues = [];
  for (const m of modules) {
    const n = await CourseLesson.countDocuments({ module: m._id });
    totalLessons += n;
    if (n > 0) {
      const quiz = await ModuleQuiz.findOne({ module: m._id }).lean();
      if (!quiz || !quiz.questions?.length || quiz.questions.length < 3) {
        issues.push(`Học phần "${m.title}" cần bài kiểm tra với ít nhất 3 câu hỏi`);
      }
    }
  }
  if (totalLessons < 1) issues.push('Cần ít nhất một bài học (có video)');
  if (issues.length) return { ok: false, issues };
  return { ok: true, issues: [] };
}

export async function publishCourse(user, courseId) {
  const course = await Course.findById(courseId);
  assertCanEditCourse(course, user);
  const check = await validateCourseReadyToPublish(course._id);
  if (!check.ok) {
    const err = new Error(check.issues[0] || 'Khóa học chưa đủ điều kiện xuất bản');
    err.status = 400;
    err.issues = check.issues || [];
    throw err;
  }
  course.isPublished = true;
  await course.save();
  return { ok: true, course: course.toObject() };
}

export async function addModule(user, body) {
  const { courseId, title, description, order } = body || {};
  if (!courseId || !title) {
    const err = new Error('Thiếu courseId hoặc title');
    err.status = 400;
    throw err;
  }
  const course = await Course.findById(courseId);
  assertCanEditCourse(course, user);
  let nextOrder = order;
  if (nextOrder == null) {
    const last = await CourseModule.findOne({ course: course._id }).sort({ order: -1 }).select('order');
    nextOrder = last ? last.order + 1 : 1;
  }
  const mod = await CourseModule.create({
    course: course._id,
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    order: nextOrder,
  });
  return mod.toObject();
}

export async function addLesson(user, body) {
  const { moduleId, title, description, videoUrl, content, durationMinutes, order } = body || {};
  if (!moduleId || !title || !videoUrl) {
    const err = new Error('Thiếu moduleId, title hoặc videoUrl');
    err.status = 400;
    throw err;
  }
  if (!isValidYouTubeUrl(videoUrl)) {
    const err = new Error('videoUrl phải là liên kết YouTube hợp lệ');
    err.status = 400;
    throw err;
  }
  const mod = await CourseModule.findById(moduleId);
  if (!mod) {
    const err = new Error('Không tìm thấy học phần');
    err.status = 404;
    throw err;
  }
  const course = await Course.findById(mod.course);
  assertCanEditCourse(course, user);
  const dur = Math.max(1, Math.floor(Number(durationMinutes) || 10));
  let nextOrder = order;
  if (nextOrder == null) {
    const last = await CourseLesson.findOne({ module: mod._id }).sort({ order: -1 }).select('order');
    nextOrder = last ? last.order + 1 : 1;
  }
  const les = await CourseLesson.create({
    module: mod._id,
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    videoUrl: String(videoUrl).trim(),
    content: content != null ? String(content) : '',
    durationMinutes: dur,
    order: nextOrder,
  });
  return les.toObject();
}

export async function upsertQuiz(user, body) {
  const { moduleId, title, questions } = body || {};
  if (!moduleId || !Array.isArray(questions)) {
    const err = new Error('Thiếu moduleId hoặc questions');
    err.status = 400;
    throw err;
  }
  if (questions.length < 3 || questions.length > 5) {
    const err = new Error('Quiz cần từ 3 đến 5 câu hỏi');
    err.status = 400;
    throw err;
  }
  const mod = await CourseModule.findById(moduleId);
  if (!mod) {
    const err = new Error('Không tìm thấy học phần');
    err.status = 404;
    throw err;
  }
  const course = await Course.findById(mod.course);
  assertCanEditCourse(course, user);

  const normalized = questions.map((q, i) => {
    const key = q.key || `q${i + 1}`;
    const text = q.text || q.question;
    const options = q.options;
    const correctIndex = q.correctIndex ?? q.correct;
    if (!text || !Array.isArray(options) || options.length !== 4) {
      const err = new Error(`Câu ${i + 1}: cần đủ nội dung và 4 phương án`);
      err.status = 400;
      throw err;
    }
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex > 3) {
      const err = new Error(`Câu ${i + 1}: correctIndex từ 0 đến 3`);
      err.status = 400;
      throw err;
    }
    return {
      key: String(key),
      text: String(text).trim(),
      options: options.map((o) => String(o).trim()),
      correctIndex,
    };
  });

  const existing = await ModuleQuiz.findOne({ module: mod._id });
  if (existing) {
    existing.title = title ? String(title).trim() : existing.title;
    existing.questions = normalized;
    await existing.save();
    return existing.toObject();
  }
  const quiz = await ModuleQuiz.create({
    module: mod._id,
    title: title ? String(title).trim() : `Kiểm tra: ${mod.title}`,
    questions: normalized,
  });
  return quiz.toObject();
}

export async function reorderModules(user, courseId, orderedModuleIds) {
  if (!Array.isArray(orderedModuleIds) || !orderedModuleIds.length) {
    const err = new Error('orderedModuleIds không hợp lệ');
    err.status = 400;
    throw err;
  }
  const course = await Course.findById(courseId);
  assertCanEditCourse(course, user);
  const mods = await CourseModule.find({ course: course._id }).select('_id').lean();
  const set = new Set(mods.map((m) => m._id.toString()));
  if (orderedModuleIds.length !== set.size || orderedModuleIds.some((id) => !set.has(String(id)))) {
    const err = new Error('Danh sách học phần không khớp');
    err.status = 400;
    throw err;
  }
  for (let i = 0; i < orderedModuleIds.length; i++) {
    await CourseModule.updateOne({ _id: orderedModuleIds[i], course: course._id }, { $set: { order: i + 1 } });
  }
  return { ok: true };
}

export async function getCourseBuilder(user, courseId) {
  const course = await Course.findById(courseId).lean();
  assertCanEditCourse(course, user);
  const modules = await CourseModule.find({ course: course._id }).sort({ order: 1 }).lean();
  const out = [];
  for (const m of modules) {
    const lessons = await CourseLesson.find({ module: m._id }).sort({ order: 1 }).lean();
    const quiz = await ModuleQuiz.findOne({ module: m._id }).lean();
    out.push({
      ...m,
      id: m._id.toString(),
      lessons: lessons.map((l) => ({
        ...l,
        id: l._id.toString(),
        module: undefined,
      })),
      quiz: quiz
        ? {
            ...quiz,
            id: quiz._id.toString(),
            module: undefined,
          }
        : null,
    });
  }
  return {
    course: {
      ...course,
      id: course._id.toString(),
    },
    modules: out,
    publishCheck: await validateCourseReadyToPublish(course._id),
  };
}
