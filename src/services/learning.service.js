import User from '../models/User.js';
import LearningProgress from '../models/LearningProgress.js';
import {
  PLACEMENT_QUESTIONS,
  MODULES,
  stripLessonForClient,
} from '../data/learningCurriculum.js';

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

/** Admin xem toàn bộ module (client không bắt admin làm onboarding) */
function curriculumGoalsForUser(user) {
  if (user.role === 'admin') return ['strumming', 'solo', 'fingerstyle'];
  return Array.isArray(user.guitarGoals) ? user.guitarGoals : [];
}

function startOfWeekMondayUTC(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

function weekYMDsUTC() {
  const mon = startOfWeekMondayUTC();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(mon);
    t.setUTCDate(mon.getUTCDate() + i);
    days.push(t.toISOString().slice(0, 10));
  }
  return days;
}

function computeLevelFromAnswers(answers) {
  let sum = 0;
  let n = 0;
  for (const q of PLACEMENT_QUESTIONS) {
    const idx = answers?.[q.id];
    if (typeof idx !== 'number' || idx < 0 || idx >= q.options.length) continue;
    const w = Array.isArray(q.weights) ? q.weights[idx] : idx;
    sum += typeof w === 'number' ? w : 0;
    n += 1;
  }
  if (n === 0) return 'none';
  const avg = sum / n;
  if (avg < 0.85) return 'none';
  if (avg < 1.65) return 'basic';
  return 'advanced';
}

function moduleVisible(mod, userGoals) {
  if (!mod.goalTags || mod.goalTags.length === 0) return true;
  const set = new Set(userGoals || []);
  return mod.goalTags.some((g) => set.has(g));
}

/** Danh sách module + lesson đã lọc */
export function getFilteredCurriculum(userGoals) {
  const goals = Array.isArray(userGoals) ? userGoals : [];
  return MODULES.filter((m) => moduleVisible(m, goals)).map((m) => ({
    ...m,
    lessons: [...m.lessons],
  }));
}

function flattenLessonIds(curriculum) {
  const ids = [];
  for (const mod of curriculum) {
    for (const les of mod.lessons) ids.push(les.id);
  }
  return ids;
}

function findLessonInCurriculum(curriculum, lessonId) {
  for (const mod of curriculum) {
    const les = mod.lessons.find((l) => l.id === lessonId);
    if (les) return { module: mod, lesson: les };
  }
  return null;
}

function quizAllCorrect(lesson, quizAnswers, kind) {
  const quiz = kind === 'video' ? lesson.videoQuiz : lesson.quiz;
  if (!quiz?.questions?.length) return true;
  const answers = quizAnswers || {};
  for (const q of quiz.questions) {
    const picked = answers[q.id];
    if (typeof picked !== 'number' || picked !== q.correctIndex) return false;
  }
  return true;
}

function lastActivityDay(practiceMap, videoMap) {
  const keys = new Set([...Object.keys(practiceMap || {}), ...Object.keys(videoMap || {})]);
  let best = null;
  for (const k of keys) {
    const p = Number(practiceMap[k]) || 0;
    const v = Number(videoMap[k]) || 0;
    if (p + v <= 0) continue;
    if (!best || k > best) best = k;
  }
  return best;
}

function streakEndingAt(lastYmd, combinedDayMinutes) {
  if (!lastYmd || !combinedDayMinutes) return 0;
  let y = lastYmd;
  let streak = 0;
  const parse = (s) => {
    const [Y, M, D] = s.split('-').map(Number);
    return new Date(Date.UTC(Y, M - 1, D));
  };
  const fmt = (d) => d.toISOString().slice(0, 10);
  let cur = parse(y);
  while (true) {
    const key = fmt(cur);
    if ((combinedDayMinutes[key] || 0) > 0) {
      streak += 1;
      cur.setUTCDate(cur.getUTCDate() - 1);
    } else break;
  }
  return streak;
}

function combinedMinutesByDay(practiceMap, videoMap) {
  const out = {};
  const keys = new Set([...Object.keys(practiceMap || {}), ...Object.keys(videoMap || {})]);
  for (const k of keys) {
    out[k] = (Number(practiceMap[k]) || 0) + (Number(videoMap[k]) || 0);
  }
  return out;
}

async function getOrCreateProgress(userId) {
  let p = await LearningProgress.findOne({ user: userId });
  if (!p) {
    p = await LearningProgress.create({ user: userId });
  }
  return p;
}

export async function getPlacementTest() {
  const questions = PLACEMENT_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
  }));
  return { questions };
}

export async function submitOnboarding(userId, body) {
  const goals = Array.isArray(body?.goals) ? body.goals.filter((g) => typeof g === 'string') : [];
  if (goals.length === 0) {
    const err = new Error('Chọn ít nhất một mục tiêu.');
    err.status = 400;
    throw err;
  }

  const level = computeLevelFromAnswers(body?.answers || {});

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        guitarGoals: goals,
        guitarLevel: level,
        guitarPlacementAnswers: body?.answers || {},
        guitarOnboardingCompleted: true,
      },
    },
    { new: true, runValidators: true },
  ).select('-password');

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return { user };
}

function attachLessonState(curriculum, completedSet, orderedIds) {
  const modulesOut = curriculum.map((mod) => {
    const lessonsOut = mod.lessons.map((les) => {
      const idx = orderedIds.indexOf(les.id);
      const prevNeeded = idx;
      let prevDone = 0;
      for (let i = 0; i < idx; i++) {
        if (completedSet.has(orderedIds[i])) prevDone += 1;
      }
      const unlocked = idx === 0 || prevDone === prevNeeded;
      const locked = !unlocked;
      let unlockProgress = null;
      if (locked && idx > 0) {
        unlockProgress = { current: prevDone, total: prevNeeded };
      }

      const lesStripped = stripLessonForClient({ ...les });
      const done = completedSet.has(les.id);
      return {
        ...lesStripped,
        completed: done,
        locked,
        unlockProgress,
      };
    });

    const progressPercent =
      lessonsOut.length === 0
        ? 0
        : Math.round(
            (lessonsOut.filter((l) => l.completed).length / lessonsOut.length) * 100,
          );

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      progressPercent,
      lessons: lessonsOut,
    };
  });

  return { modules: modulesOut, orderedIds };
}

export async function getRoadmapForUser(user) {
  if (user.role !== 'admin' && user.guitarOnboardingCompleted !== true) {
    const err = new Error('Hoàn tất onboarding để xem lộ trình.');
    err.status = 403;
    err.code = 'ONBOARDING_REQUIRED';
    throw err;
  }

  const curriculum = getFilteredCurriculum(curriculumGoalsForUser(user));
  const orderedIds = flattenLessonIds(curriculum);
  const progress = await getOrCreateProgress(user._id);
  const completedSet = new Set(progress.completedLessonIds || []);

  const { modules } = attachLessonState(curriculum, completedSet, orderedIds);

  const lessonsTotal = orderedIds.length;
  const lessonsCompleted = orderedIds.filter((id) => completedSet.has(id)).length;
  const coursePercent =
    lessonsTotal === 0 ? 0 : Math.round((lessonsCompleted / lessonsTotal) * 100);

  const pm = progress.practiceMinutesByDay || {};
  const vm = progress.videoMinutesByDay || {};
  const combined = combinedMinutesByDay(pm, vm);
  const lastStudy = lastActivityDay(pm, vm);
  const streak = streakEndingAt(lastStudy, combined);

  const weekDays = weekYMDsUTC();
  const dailyPractice = weekDays.map((day) => ({
    day,
    minutes: Math.round(combined[day] || 0),
  }));

  const stats = {
    coursePercent,
    lessonsCompleted,
    lessonsTotal,
    totalPracticeMinutes: Math.round(progress.totalPracticeMinutes || 0),
    todayVideoWatchMinutes: Math.round(Number(vm[todayYMD()]) || 0),
    currentStreak: streak,
    lastStudyDate: lastStudy || null,
    dailyPractice,
  };

  return {
    level: user.guitarLevel || 'none',
    goals: curriculumGoalsForUser(user),
    modules,
    stats,
  };
}

export async function addPracticeMinutes(userId, minutesRaw) {
  const minutes = Math.max(0, Math.floor(Number(minutesRaw) || 0));
  if (minutes <= 0) return { ok: true };

  const progress = await getOrCreateProgress(userId);
  const day = todayYMD();
  const pm = { ...(progress.practiceMinutesByDay || {}) };
  pm[day] = (Number(pm[day]) || 0) + minutes;

  progress.practiceMinutesByDay = pm;
  progress.markModified('practiceMinutesByDay');
  progress.totalPracticeMinutes = (progress.totalPracticeMinutes || 0) + minutes;
  await progress.save();
  return { ok: true };
}

export async function addVideoWatchMinutes(userId, minutesRaw) {
  const minutes = Math.max(0, Math.floor(Number(minutesRaw) || 0));
  if (minutes <= 0) return { ok: true };

  const progress = await getOrCreateProgress(userId);
  const day = todayYMD();
  const vm = { ...(progress.videoMinutesByDay || {}) };
  vm[day] = (Number(vm[day]) || 0) + minutes;

  progress.videoMinutesByDay = vm;
  progress.markModified('videoMinutesByDay');
  progress.totalVideoMinutes = (progress.totalVideoMinutes || 0) + minutes;
  await progress.save();
  return { ok: true };
}

export async function completeLesson(userId, lessonId, quizAnswers) {
  const user = await User.findById(userId);
  if (!user || (user.role !== 'admin' && user.guitarOnboardingCompleted !== true)) {
    const err = new Error('Hoàn tất onboarding trước.');
    err.status = 403;
    err.code = 'ONBOARDING_REQUIRED';
    throw err;
  }

  const curriculum = getFilteredCurriculum(curriculumGoalsForUser(user));
  const orderedIds = flattenLessonIds(curriculum);
  const found = findLessonInCurriculum(curriculum, lessonId);
  if (!found) {
    const err = new Error('Không tìm thấy bài học.');
    err.status = 404;
    throw err;
  }

  const { lesson } = found;
  const idx = orderedIds.indexOf(lessonId);
  const progress = await getOrCreateProgress(userId);
  const completedSet = new Set(progress.completedLessonIds || []);

  for (let i = 0; i < idx; i++) {
    if (!completedSet.has(orderedIds[i])) {
      const err = new Error('Hoàn thành bài trước trong lộ trình để mở khóa.');
      err.status = 400;
      throw err;
    }
  }

  if (lesson.type === 'quiz') {
    if (!quizAllCorrect(lesson, quizAnswers, 'quiz')) {
      const err = new Error('Đáp án chưa đúng hoặc chưa trả lời hết.');
      err.status = 400;
      throw err;
    }
  } else if (lesson.type === 'video' && lesson.videoQuiz?.questions?.length) {
    if (!quizAllCorrect(lesson, quizAnswers, 'video')) {
      const err = new Error('Đáp án chưa đúng hoặc chưa trả lời hết.');
      err.status = 400;
      throw err;
    }
  }

  if (!completedSet.has(lessonId)) {
    progress.completedLessonIds = [...(progress.completedLessonIds || []), lessonId];
    await progress.save();
  }

  return getRoadmapForUser(user);
}
