import Lesson from '../../models/Lesson.js';
import Quiz from '../../models/Quiz.js';
import CourseProgress from '../../models/CourseProgress.js';
import { extractYouTubeVideoId } from '../../utils/youtube.js';
import { httpError } from '../../utils/httpError.js';
import { getCourseForModule, assertCourseOwner, canReadCourse } from './learning.helpers.js';

function mapLesson(l, extra = {}) {
  return {
    id: l._id.toString(),
    moduleId: l.moduleId.toString(),
    title: l.title,
    content: l.content || '',
    youtubeVideoId: l.youtubeVideoId,
    duration: l.duration || 5,
    order: l.order,
    ...extra,
  };
}

export async function createLesson(user, body) {
  const { moduleId, title, content, youtubeVideoId, duration, order } = body;
  const { course } = await getCourseForModule(moduleId);
  assertCourseOwner(course, user);

  const videoId = extractYouTubeVideoId(youtubeVideoId);
  if (!videoId) throw httpError(400, 'youtubeVideoId không hợp lệ');

  let nextOrder = order;
  if (nextOrder == null) {
    const last = await Lesson.findOne({ moduleId }).sort({ order: -1 }).select('order');
    nextOrder = last ? last.order + 1 : 1;
  }

  const lesson = await Lesson.create({
    moduleId,
    title: String(title).trim(),
    content: content != null ? String(content) : '',
    youtubeVideoId: videoId,
    duration: duration != null ? Math.max(1, Number(duration) || 5) : 5,
    order: nextOrder,
  });
  return mapLesson(lesson.toObject());
}

export async function updateLesson(user, lessonId, body) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw httpError(404, 'Không tìm thấy bài học');
  const { course } = await getCourseForModule(lesson.moduleId);
  assertCourseOwner(course, user);

  if (body.title !== undefined) lesson.title = String(body.title).trim();
  if (body.content !== undefined) lesson.content = String(body.content);
  if (body.duration !== undefined) lesson.duration = Math.max(1, Number(body.duration) || 5);
  if (body.youtubeVideoId !== undefined) {
    const videoId = extractYouTubeVideoId(body.youtubeVideoId);
    if (!videoId) throw httpError(400, 'youtubeVideoId không hợp lệ');
    lesson.youtubeVideoId = videoId;
  }
  if (body.order !== undefined) lesson.order = Math.max(1, Number(body.order) || 1);
  await lesson.save();
  return mapLesson(lesson.toObject());
}

export async function deleteLesson(user, lessonId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw httpError(404, 'Không tìm thấy bài học');
  const { course, module: mod } = await getCourseForModule(lesson.moduleId);
  assertCourseOwner(course, user);

  await Quiz.deleteMany({ lessonId: lesson._id });
  await CourseProgress.updateMany(
    { courseId: course._id },
    { $pull: { completedLessons: lesson._id.toString() } },
  );
  await Lesson.deleteOne({ _id: lesson._id });

  const remaining = await Lesson.find({ moduleId: mod._id }).sort({ order: 1, _id: 1 });
  for (let i = 0; i < remaining.length; i++) {
    remaining[i].order = i + 1;
    await remaining[i].save();
  }
  return { ok: true };
}

export async function getLessonForLearner(lessonId, viewer) {
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) throw httpError(404, 'Không tìm thấy bài học');
  const { course } = await getCourseForModule(lesson.moduleId);
  if (!canReadCourse(course, viewer)) throw httpError(404, 'Không tìm thấy khóa học');
  return mapLesson(lesson);
}

export { mapLesson };
