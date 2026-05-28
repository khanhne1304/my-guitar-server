import UserStats from '../../models/UserStats.js';
import CourseProgress from '../../models/CourseProgress.js';
import Course from '../../models/Course.js';
import Module from '../../models/Module.js';
import Lesson from '../../models/Lesson.js';
import { uid } from './learning.helpers.js';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isYesterday(date, today = new Date()) {
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  return isSameDay(date, y);
}

export async function getOrCreateUserStats(userId) {
  let stats = await UserStats.findOne({ userId });
  if (!stats) {
    stats = await UserStats.create({ userId });
  }
  return stats;
}

export async function recordActivity(userId, { practiceMinutes = 0, xpGain = 0 } = {}) {
  const stats = await getOrCreateUserStats(userId);
  const now = new Date();
  const today = startOfDay(now);

  if (stats.lastActiveDate) {
    const last = startOfDay(stats.lastActiveDate);
    if (last.getTime() === today.getTime()) {
      // same day
    } else if (isYesterday(stats.lastActiveDate, now)) {
      stats.streakDays = (stats.streakDays || 0) + 1;
    } else {
      stats.streakDays = 1;
    }
  } else {
    stats.streakDays = 1;
  }

  stats.lastActiveDate = now;
  if (practiceMinutes > 0) {
    stats.totalPracticeMinutes = (stats.totalPracticeMinutes || 0) + practiceMinutes;
  }
  if (xpGain > 0) {
    stats.xp = (stats.xp || 0) + xpGain;
  }
  await stats.save();
  return stats;
}

export async function addGlobalXp(userId, amount) {
  if (!amount) return getOrCreateUserStats(userId);
  return recordActivity(userId, { xpGain: amount });
}

export async function getUserStats(userId) {
  const stats = await getOrCreateUserStats(userId);
  return {
    streakDays: stats.streakDays || 0,
    totalPracticeMinutes: stats.totalPracticeMinutes || 0,
    xp: stats.xp || 0,
  };
}

export async function getDashboard(user) {
  const userId = uid(user);
  if (!userId) {
    return {
      stats: { streakDays: 0, totalPracticeMinutes: 0, xp: 0 },
      continueLearning: null,
      dailyPracticeMinutes: 0,
    };
  }

  const stats = await getUserStats(userId);
  const progresses = await CourseProgress.find({ userId }).sort({ updatedAt: -1 }).lean();

  let continueLearning = null;
  for (const p of progresses) {
    const course = await Course.findById(p.courseId).lean();
    if (!course?.isPublished) continue;
    const modules = await Module.find({ courseId: course._id }).sort({ order: 1 }).lean();
    const completedLessons = new Set(p.completedLessons || []);
    const completedModules = new Set(p.completedModules || []);

    for (const mod of modules) {
      if (completedModules.has(mod._id.toString())) continue;
      const lessons = await Lesson.find({ moduleId: mod._id }).sort({ order: 1 }).lean();
      const nextLesson = lessons.find((l) => !completedLessons.has(l._id.toString()));
      if (nextLesson) {
        continueLearning = {
          courseId: course._id.toString(),
          courseTitle: course.title,
          moduleId: mod._id.toString(),
          moduleTitle: mod.title,
          lessonId: nextLesson._id.toString(),
          lessonTitle: nextLesson.title,
          progressPercent: await calcCoursePercent(course._id, p),
        };
        break;
      }
    }
    if (continueLearning) break;
  }

  if (!continueLearning) {
    const published = await Course.find({ isPublished: true }).sort({ updatedAt: -1 }).limit(1).lean();
    if (published[0]) {
      const mod = await Module.findOne({ courseId: published[0]._id }).sort({ order: 1 }).lean();
      const lesson = mod ? await Lesson.findOne({ moduleId: mod._id }).sort({ order: 1 }).lean() : null;
      if (mod && lesson) {
        continueLearning = {
          courseId: published[0]._id.toString(),
          courseTitle: published[0].title,
          moduleId: mod._id.toString(),
          moduleTitle: mod.title,
          lessonId: lesson._id.toString(),
          lessonTitle: lesson.title,
          progressPercent: 0,
        };
      }
    }
  }

  return {
    stats,
    continueLearning,
    dailyPracticeMinutes: 0,
  };
}

async function calcCoursePercent(courseId, progress) {
  const modules = await Module.find({ courseId }).lean();
  let totalLessons = 0;
  for (const m of modules) {
    totalLessons += await Lesson.countDocuments({ moduleId: m._id });
  }
  const completed = (progress?.completedLessons || []).length;
  return totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
}
