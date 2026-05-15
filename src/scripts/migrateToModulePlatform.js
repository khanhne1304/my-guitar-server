/**
 * Migrate flat Course → Lesson structure to Course → Module → Lesson.
 * Also migrates completedLessonIds → completedLessons on CourseProgress.
 * Run: npm run migrate:modules
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const Course = (await import('../models/Course.js')).default;
  const Module = (await import('../models/Module.js')).default;
  const Lesson = (await import('../models/Lesson.js')).default;
  const Quiz = (await import('../models/Quiz.js')).default;
  const CourseProgress = (await import('../models/CourseProgress.js')).default;

  const lessonColl = db.collection('lessons');
  const sampleLesson = await lessonColl.findOne({});
  const hasCourseIdOnLesson = sampleLesson && sampleLesson.courseId != null;
  const hasModuleIdOnLesson = sampleLesson && sampleLesson.moduleId != null;

  if (hasModuleIdOnLesson && !hasCourseIdOnLesson) {
    console.log('Lessons already use moduleId. Migrating progress field names only...');
    const progresses = await CourseProgress.find({});
    for (const p of progresses) {
      let changed = false;
      if (p.completedLessonIds?.length && !p.completedLessons?.length) {
        p.completedLessons = p.completedLessonIds.map(String);
        p.completedLessonIds = undefined;
        changed = true;
      }
      if (!p.completedModules) {
        p.completedModules = [];
        changed = true;
      }
      if (!p.passedQuizIds) {
        p.passedQuizIds = [];
        changed = true;
      }
      if (p.xp == null) {
        p.xp = 0;
        changed = true;
      }
      if (changed) await p.save();
    }
    console.log('Progress migration done.');
    await mongoose.disconnect();
    return;
  }

  if (!hasCourseIdOnLesson) {
    console.log('No lessons with courseId found. Nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  const courses = await Course.find({});
  console.log(`Migrating ${courses.length} courses to module structure...`);

  for (const course of courses) {
    const existingModules = await Module.countDocuments({ courseId: course._id });
    if (existingModules > 0) {
      console.log(`Skip course ${course._id}: already has modules`);
      continue;
    }

    const legacyLessons = await lessonColl.find({ courseId: course._id }).sort({ order: 1 }).toArray();
    if (!legacyLessons.length) continue;

    const mod = await Module.create({
      courseId: course._id,
      title: 'Module 1',
      description: 'Migrated from legacy flat lessons',
      order: 1,
    });

    for (const les of legacyLessons) {
      await Lesson.create({
        _id: les._id,
        moduleId: mod._id,
        title: les.title,
        content: les.content || '',
        youtubeVideoId: les.youtubeVideoId,
        duration: les.duration || 5,
        order: les.order || 1,
      });
    }

    const legacyQuizzes = await Quiz.find({ courseId: course._id }).lean();
    for (const q of legacyQuizzes) {
      await Quiz.updateOne(
        { _id: q._id },
        {
          $set: { moduleId: mod._id },
          $unset: { courseId: '' },
        },
      );
    }

    console.log(`Course ${course.title}: ${legacyLessons.length} lessons → module ${mod._id}`);
  }

  const quizzesWithCourse = await db.collection('quizzes').countDocuments({ courseId: { $exists: true } });
  if (quizzesWithCourse) {
    console.log(`Warning: ${quizzesWithCourse} quizzes still have courseId — review manually`);
  }

  const progresses = await CourseProgress.find({});
  for (const p of progresses) {
    if (p.completedLessonIds?.length) {
      p.completedLessons = p.completedLessonIds.map(String);
    }
    if (!p.completedLessons) p.completedLessons = [];
    if (!p.completedModules) p.completedModules = [];
    if (!p.passedQuizIds) p.passedQuizIds = [];
    if (p.xp == null) p.xp = 0;
    await p.save();
  }

  console.log('Module platform migration complete.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
