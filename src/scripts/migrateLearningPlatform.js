/**
 * Migrate legacy learning collections to the new platform schema.
 * Run: node src/scripts/migrateLearningPlatform.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { extractYouTubeVideoId } from '../utils/youtube.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const legacyLesson = db.collection('courselessons');
  const legacyQuiz = db.collection('lessonquizzes');
  const legacyProgress = db.collection('courseuserprogresses');
  const legacyModuleQuiz = db.collection('modulequizzes');

  const Course = (await import('../models/Course.js')).default;
  const Lesson = (await import('../models/Lesson.js')).default;
  const Quiz = (await import('../models/Quiz.js')).default;
  const CourseProgress = (await import('../models/CourseProgress.js')).default;

  const lessonCount = await legacyLesson.countDocuments();
  console.log(`Migrating ${lessonCount} legacy lessons...`);

  const lessons = await legacyLesson.find({}).toArray();
  const idMap = new Map();

  for (const les of lessons) {
    const courseId = les.course || les.courseId;
    if (!courseId) continue;
    const videoId = extractYouTubeVideoId(les.videoUrl || les.youtubeVideoId || '');
    if (!videoId) {
      console.warn(`Skip lesson ${les._id}: invalid video`);
      continue;
    }
    const existing = await Lesson.findOne({ _id: les._id });
    if (existing) {
      idMap.set(les._id.toString(), existing._id.toString());
      continue;
    }
    const doc = await Lesson.create({
      _id: les._id,
      courseId,
      title: les.title,
      content: les.content || '',
      youtubeVideoId: videoId,
      order: les.order || 1,
    });
    idMap.set(les._id.toString(), doc._id.toString());
  }

  const quizzes = await legacyQuiz.find({}).toArray();
  console.log(`Migrating ${quizzes.length} lesson quizzes...`);
  for (const q of quizzes) {
    const lesson = await legacyLesson.findOne({ _id: q.lesson });
    if (!lesson) continue;
    const courseId = lesson.course || lesson.courseId;
    const exists = await Quiz.findOne({ _id: q._id });
    if (exists) continue;
    await Quiz.create({
      _id: q._id,
      courseId,
      lessonId: q.lesson,
      title: q.title || 'Quiz',
      questions: q.questions || [],
      passingScore: 60,
    });
  }

  const progresses = await legacyProgress.find({}).toArray();
  console.log(`Migrating ${progresses.length} progress records...`);
  for (const p of progresses) {
    const exists = await CourseProgress.findOne({ userId: p.user, courseId: p.course });
    if (exists) continue;
    await CourseProgress.create({
      userId: p.user,
      courseId: p.course,
      completedLessonIds: (p.completedLessonIds || []).map(String),
    });
  }

  console.log('Migration complete. Optional cleanup: drop coursemodules, modulequizzes, learningprogresses');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
