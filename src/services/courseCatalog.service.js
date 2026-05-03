import Course from '../models/Course.js';
import CourseModule from '../models/CourseModule.js';
import CourseLesson from '../models/CourseLesson.js';
import ModuleQuiz from '../models/ModuleQuiz.js';
import CourseUserProgress from '../models/CourseUserProgress.js';

export const QUIZ_PASS_PERCENT = 60;

/** Cho phép xem nội dung khóa: đã xuất bản, hoặc chủ khóa / admin xem bản nháp */
export function canReadCourseContent(course, viewer) {
  if (!course) return false;
  if (course.isPublished) return true;
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  const vid = viewer._id?.toString?.() || viewer.id?.toString?.();
  const owner = course.createdBy?.toString?.();
  if (owner && vid && owner === vid) return true;
  return false;
}

export function viewerId(viewer) {
  if (!viewer) return null;
  if (typeof viewer === 'string') return viewer;
  return viewer._id?.toString?.() || viewer.id?.toString?.() || null;
}

export function toYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (u.includes('/embed/')) return u.split('&')[0];
  try {
    const parsed = new URL(u);
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : u;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
  } catch {
    return u;
  }
  return u;
}

async function countLessonsForCourse(courseId) {
  const mods = await CourseModule.find({ course: courseId }).select('_id').lean();
  const mids = mods.map((m) => m._id);
  if (!mids.length) return 0;
  return CourseLesson.countDocuments({ module: { $in: mids } });
}

export async function listPublishedCourses() {
  return Course.find({ isPublished: true }).sort({ order: 1, title: 1 }).lean();
}

export async function getCourseSummaryForUser(courseId, viewer) {
  const course = await Course.findById(courseId).lean();
  if (!course || !canReadCourseContent(course, viewer)) return null;
  const uid = viewerId(viewer);
  const totalLessons = await countLessonsForCourse(course._id);
  let completed = 0;
  if (uid) {
    const p = await CourseUserProgress.findOne({ user: uid, course: course._id }).lean();
    completed = p?.completedLessonIds?.length || 0;
  }
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
  return {
    id: course._id.toString(),
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    levelLabel: course.levelLabel,
    level: course.level,
    thumbnail: course.thumbnail,
    tags: course.tags || [],
    price: course.price,
    isPublished: course.isPublished,
    createdBy: course.createdBy?.toString() || null,
    totalLessons,
    completedLessons: completed,
    progressPercent,
  };
}

export async function listCoursesWithProgress(viewer) {
  const courses = await listPublishedCourses();
  const out = [];
  for (const c of courses) {
    const summary = await getCourseSummaryForUser(c._id, viewer);
    if (summary) out.push(summary);
  }
  return out;
}

async function loadCourseUnlockContext(courseId, userId) {
  const modules = await CourseModule.find({ course: courseId }).sort({ order: 1 }).lean();
  const progress = userId
    ? await CourseUserProgress.findOne({ user: userId, course: courseId }).lean()
    : null;
  const quizByModule = {};
  for (const qs of progress?.quizScores || []) {
    const mid = qs.module?.toString?.() || String(qs.module);
    quizByModule[mid] = qs;
  }
  const unlockMap = {};
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    const id = m._id.toString();
    if (i === 0) unlockMap[id] = true;
    else {
      const prev = modules[i - 1];
      const prevScore = quizByModule[prev._id.toString()];
      unlockMap[id] =
        !!prevScore && prevScore.passed === true && prevScore.scorePercent >= QUIZ_PASS_PERCENT;
    }
  }
  return { modules, progress, quizByModule, unlockMap };
}

async function flattenCourseLessons(courseId) {
  const modules = await CourseModule.find({ course: courseId }).sort({ order: 1 }).lean();
  const flat = [];
  for (const mod of modules) {
    const lessons = await CourseLesson.find({ module: mod._id }).sort({ order: 1 }).lean();
    for (const les of lessons) {
      flat.push({
        lessonId: les._id.toString(),
        moduleId: mod._id.toString(),
        orderInCourse: flat.length,
      });
    }
  }
  return flat;
}

export async function getModulesForCourse(courseId, viewer) {
  const course = await Course.findById(courseId).lean();
  if (!course || !canReadCourseContent(course, viewer)) {
    const err = new Error('Không tìm thấy khóa học');
    err.status = 404;
    throw err;
  }

  const uid = viewerId(viewer);
  const { modules, progress, quizByModule, unlockMap } = await loadCourseUnlockContext(
    course._id,
    uid,
  );
  const completed = new Set(progress?.completedLessonIds || []);

  const modulePayloads = [];
  let totalLessons = 0;

  for (const mod of modules) {
    const mid = mod._id.toString();
    const lessons = await CourseLesson.find({ module: mod._id }).sort({ order: 1 }).lean();
    const lessonCount = lessons.length;
    totalLessons += lessonCount;
    const completedInModule = lessons.filter((l) => completed.has(l._id.toString())).length;
    const moduleProgressPercent =
      lessonCount === 0 ? 0 : Math.round((completedInModule / lessonCount) * 100);

    const scoreEntry = quizByModule[mid];
    const quizTaken = !!scoreEntry;
    const quizPassed =
      quizTaken && scoreEntry.passed && scoreEntry.scorePercent >= QUIZ_PASS_PERCENT;

    const moduleUnlocked = unlockMap[mid];
    const allLessonsDone = lessonCount > 0 && completedInModule === lessonCount;

    modulePayloads.push({
      id: mid,
      title: mod.title,
      description: mod.description,
      order: mod.order,
      locked: !moduleUnlocked,
      lessonCount,
      completedLessonCount: completedInModule,
      progressPercent: moduleProgressPercent,
      quizAvailable: moduleUnlocked && allLessonsDone,
      quizTaken,
      quizPassed,
      quizScorePercent: quizTaken ? scoreEntry.scorePercent : null,
    });
  }

  const completedTotal = progress?.completedLessonIds?.length || 0;
  const courseProgressPercent =
    totalLessons === 0 ? 0 : Math.round((completedTotal / totalLessons) * 100);

  return {
    course: {
      id: course._id.toString(),
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      levelLabel: course.levelLabel,
    },
    progressPercent: courseProgressPercent,
    modules: modulePayloads,
  };
}

export async function getLessonsForModule(moduleId, viewer) {
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
  const { unlockMap, progress } = await loadCourseUnlockContext(course._id, uid);
  const moduleUnlocked = unlockMap[mod._id.toString()];
  const flat = await flattenCourseLessons(course._id);
  const completed = new Set(progress?.completedLessonIds || []);

  const lessons = await CourseLesson.find({ module: mod._id }).sort({ order: 1 }).lean();
  const allLessonsDone =
    lessons.length > 0 && lessons.every((l) => completed.has(l._id.toString()));

  const lessonPayloads = lessons.map((les) => {
    const lid = les._id.toString();
    const idx = flat.findIndex((x) => x.lessonId === lid);
    const prevId = idx > 0 ? flat[idx - 1].lessonId : null;
    const prevDone = prevId === null || completed.has(prevId);
    const locked = !moduleUnlocked || !prevDone;

    return {
      id: lid,
      title: les.title,
      description: les.description,
      content: les.content || '',
      videoEmbedUrl: toYouTubeEmbedUrl(les.videoUrl),
      durationMinutes: les.durationMinutes,
      order: les.order,
      completed: completed.has(lid),
      locked,
    };
  });

  return {
    course: {
      id: course._id.toString(),
      title: course.title,
    },
    module: {
      id: mod._id.toString(),
      title: mod.title,
      description: mod.description,
      order: mod.order,
      locked: !moduleUnlocked,
      quizEligible: moduleUnlocked && allLessonsDone,
    },
    lessons: lessonPayloads,
  };
}

export async function getQuizForModule(moduleId, viewer) {
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
  const { unlockMap, progress } = await loadCourseUnlockContext(course._id, uid);
  if (!unlockMap[mod._id.toString()]) {
    const err = new Error('Học phần đang khóa');
    err.status = 403;
    throw err;
  }

  const lessons = await CourseLesson.find({ module: mod._id }).lean();
  const completed = new Set(progress?.completedLessonIds || []);
  const allDone = lessons.length > 0 && lessons.every((l) => completed.has(l._id.toString()));
  if (!allDone) {
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

  const questions = quiz.questions.map((q) => ({
    key: q.key,
    text: q.text,
    options: q.options,
  }));

  return {
    moduleId: mod._id.toString(),
    courseId: course._id.toString(),
    title: quiz.title || `Quiz: ${mod.title}`,
    passPercentRequired: QUIZ_PASS_PERCENT,
    questions,
  };
}
