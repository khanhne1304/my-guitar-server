import Course from '../../models/Course.js';
import Module from '../../models/Module.js';
import Lesson from '../../models/Lesson.js';
import Quiz from '../../models/Quiz.js';
import CourseProgress from '../../models/CourseProgress.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import PracticeRoutine from '../../models/PracticeRoutine.js';
import ChallengeSong from '../../models/ChallengeSong.js';
import User from '../../models/User.js';
import { httpError } from '../../utils/httpError.js';
import {
  uid,
  canReadCourse,
  assertCourseOwner,
  mapCourseBase,
} from './learning.helpers.js';
import { getPracticeRoutine } from './practiceRoutine.service.js';
import { getChallengeSong } from './challengeSong.service.js';

async function countLessonsInCourse(courseId) {
  const modules = await Module.find({ courseId }).select('_id').lean();
  let total = 0;
  for (const m of modules) {
    total += await Lesson.countDocuments({ moduleId: m._id });
  }
  return total;
}

async function progressFor(userId, courseId) {
  if (!userId) {
    return {
      completedLessons: [],
      completedModules: [],
      passedQuizIds: [],
      practiceLoggedModuleIds: [],
      xp: 0,
      progressPercent: 0,
      completedCount: 0,
      totalLessons: 0,
    };
  }
  const p = await CourseProgress.findOne({ userId, courseId }).lean();
  const completed = p?.completedLessons || [];
  const total = await countLessonsInCourse(courseId);
  const progressPercent = total === 0 ? 0 : Math.round((completed.length / total) * 100);
  return {
    completedLessons: completed,
    completedModules: p?.completedModules || [],
    passedQuizIds: p?.passedQuizIds || [],
    practiceLoggedModuleIds: p?.practiceLoggedModuleIds || [],
    xp: p?.xp || 0,
    progressPercent,
    completedCount: completed.length,
    totalLessons: total,
  };
}

async function creatorInfo(createdBy) {
  if (!createdBy) return null;
  const u = await User.findById(createdBy).select('username fullName avatarUrl').lean();
  if (!u) return null;
  return {
    id: u._id.toString(),
    username: u.username,
    fullName: u.fullName || u.username,
    avatarUrl: u.avatarUrl || null,
  };
}

async function buildModuleTree(courseId, prog, isOwner) {
  const modules = await Module.find({ courseId }).sort({ order: 1 }).lean();
  const completedLessons = new Set(prog.completedLessons);
  const completedModules = new Set(prog.completedModules);
  const passedQuizzes = new Set(prog.passedQuizIds);
  const practiceLogged = new Set(prog.practiceLoggedModuleIds);

  const out = [];
  for (const mod of modules) {
    const modId = mod._id.toString();
    const lessons = await Lesson.find({ moduleId: mod._id }).sort({ order: 1 }).lean();
    const quizzes = await Quiz.find({ moduleId: mod._id }).sort({ createdAt: 1 }).lean();
    const checkpoint = quizzes.find((q) => !q.lessonId) || null;
    const practiceRoutine = await getPracticeRoutine(mod._id);
    const challengeSong = await getChallengeSong(mod._id);

    const lessonsMapped = lessons.map((l) => ({
      id: l._id.toString(),
      moduleId: modId,
      title: l.title,
      content: l.content || '',
      youtubeVideoId: l.youtubeVideoId,
      duration: l.duration || 5,
      order: l.order,
      completed: completedLessons.has(l._id.toString()),
    }));

    const allLessonsDone =
      lessons.length === 0 || lessons.every((l) => completedLessons.has(l._id.toString()));
    const quizPassed = !checkpoint || passedQuizzes.has(checkpoint._id.toString());

    out.push({
      id: modId,
      courseId: courseId.toString(),
      title: mod.title,
      description: mod.description || '',
      order: mod.order,
      lessons: lessonsMapped,
      practiceRoutine,
      challengeSong,
      checkpointQuiz: checkpoint
        ? {
            id: checkpoint._id.toString(),
            moduleId: modId,
            title: checkpoint.title,
            passingScore: checkpoint.passingScore,
            questionCount: checkpoint.questions.length,
            passed: passedQuizzes.has(checkpoint._id.toString()),
            ...(isOwner
              ? {
                  questions: checkpoint.questions.map((x) => ({
                    key: x.key,
                    text: x.text,
                    options: x.options,
                    correctIndex: x.correctIndex,
                  })),
                }
              : {}),
          }
        : null,
      lessonQuizzes: quizzes
        .filter((q) => q.lessonId)
        .map((q) => ({
          id: q._id.toString(),
          lessonId: q.lessonId.toString(),
          title: q.title,
          passingScore: q.passingScore,
          questionCount: q.questions.length,
          passed: passedQuizzes.has(q._id.toString()),
        })),
      completed: completedModules.has(modId),
      practiceLogged: practiceLogged.has(modId),
      progressPercent:
        lessons.length === 0
          ? quizPassed && completedModules.has(modId)
            ? 100
            : 0
          : Math.round(
              (lessons.filter((l) => completedLessons.has(l._id.toString())).length / lessons.length) *
                100,
            ),
      readyToComplete: allLessonsDone && quizPassed && !completedModules.has(modId),
    });
  }
  return out;
}

export { canReadCourse, assertCourseOwner };

export async function listPublishedCourses(viewer) {
  const courses = await Course.find({ isPublished: true }).sort({ updatedAt: -1 }).lean();
  const vid = uid(viewer);
  const out = [];
  for (const c of courses) {
    const prog = await progressFor(vid, c._id);
    const creator = await creatorInfo(c.createdBy);
    out.push({
      ...mapCourseBase(c),
      moduleCount: await Module.countDocuments({ courseId: c._id }),
      lessonCount: prog.totalLessons,
      progressPercent: prog.progressPercent,
      creator,
    });
  }
  return out;
}

export async function listMyCourses(userId) {
  const courses = await Course.find({ createdBy: userId }).sort({ updatedAt: -1 }).lean();
  const out = [];
  for (const c of courses) {
    const total = await countLessonsInCourse(c._id);
    const moduleCount = await Module.countDocuments({ courseId: c._id });
    out.push({
      ...mapCourseBase(c),
      moduleCount,
      lessonCount: total,
    });
  }
  return out;
}

export async function getCourseDetail(courseId, viewer, { includeQuizAnswers = false } = {}) {
  const course = await Course.findById(courseId).lean();
  if (!course || !canReadCourse(course, viewer)) {
    throw httpError(404, 'Không tìm thấy khóa học');
  }

  const vid = uid(viewer);
  const isOwner = vid && (course.createdBy?.toString() === vid || viewer?.role === 'admin');
  const prog = await progressFor(vid, course._id);
  const creator = await creatorInfo(course.createdBy);
  const modules = await buildModuleTree(course._id, prog, isOwner && includeQuizAnswers);

  return {
    course: {
      ...mapCourseBase(course),
      moduleCount: modules.length,
      lessonCount: prog.totalLessons,
      completedLessons: prog.completedCount,
      totalLessons: prog.totalLessons,
      progressPercent: prog.progressPercent,
      xp: prog.xp,
      creator,
    },
    modules,
    progress: {
      completedLessons: prog.completedLessons,
      completedModules: prog.completedModules,
      passedQuizIds: prog.passedQuizIds,
      practiceLoggedModuleIds: prog.practiceLoggedModuleIds,
      xp: prog.xp,
    },
  };
}

export async function createCourse(user, body) {
  const { title, description, thumbnail, level, tags } = body;
  const course = await Course.create({
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    thumbnail: thumbnail ? String(thumbnail).trim() : '',
    level: ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner',
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
    isPublished: false,
    createdBy: user._id,
  });
  return mapCourseBase(course.toObject());
}

export async function updateCourse(user, courseId, body) {
  const course = await Course.findById(courseId);
  assertCourseOwner(course, user);
  const allowed = ['title', 'description', 'thumbnail', 'level', 'tags'];
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === 'tags') {
      course.tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [];
    } else if (k === 'level') {
      course.level = ['beginner', 'intermediate', 'advanced'].includes(body.level) ? body.level : course.level;
    } else {
      course[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
    }
  }
  await course.save();
  return mapCourseBase(course.toObject());
}

export async function deleteCourse(user, courseId) {
  const course = await Course.findById(courseId);
  assertCourseOwner(course, user);

  const modules = await Module.find({ courseId: course._id }).select('_id').lean();
  const moduleIds = modules.map((m) => m._id);
  const lessons = await Lesson.find({ moduleId: { $in: moduleIds } }).select('_id').lean();
  const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } }).select('_id').lean();
  const quizIds = quizzes.map((q) => q._id);

  if (quizIds.length) await QuizAttempt.deleteMany({ quizId: { $in: quizIds } });
  await Quiz.deleteMany({ moduleId: { $in: moduleIds } });
  await Lesson.deleteMany({ moduleId: { $in: moduleIds } });
  await PracticeRoutine.deleteMany({ moduleId: { $in: moduleIds } });
  await ChallengeSong.deleteMany({ moduleId: { $in: moduleIds } });
  await Module.deleteMany({ courseId: course._id });
  await CourseProgress.deleteMany({ courseId: course._id });
  await Course.deleteOne({ _id: course._id });
  return { ok: true };
}

export async function publishCourse(user, courseId) {
  const course = await Course.findById(courseId);
  assertCourseOwner(course, user);

  const moduleCount = await Module.countDocuments({ courseId: course._id });
  if (moduleCount < 1) {
    throw httpError(400, 'Cần ít nhất một module trước khi xuất bản', { issues: ['Thiếu module'] });
  }

  const modules = await Module.find({ courseId: course._id }).select('_id').lean();
  let hasLesson = false;
  for (const m of modules) {
    const c = await Lesson.countDocuments({ moduleId: m._id });
    if (c > 0) {
      hasLesson = true;
      break;
    }
  }
  if (!hasLesson) {
    throw httpError(400, 'Cần ít nhất một bài học trước khi xuất bản', { issues: ['Thiếu bài học'] });
  }

  course.isPublished = true;
  await course.save();
  return { ok: true, course: mapCourseBase(course.toObject()) };
}
