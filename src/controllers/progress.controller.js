import UserProgress from '../models/UserProgress.js';
import Course from '../models/Course.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

// Start a lesson
export const startLesson = asyncHandler(async (req, res) => {
  const { courseId, lessonKey } = req.body;
  const userId = req.user._id;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('Khóa học không tồn tại', 404);
  }

  // Start lesson
  const progress = await UserProgress.startLesson(userId, courseId, lessonKey);

  res.status(200).json({
    success: true,
    data: progress
  });
});

// Log practice session
export const logPractice = asyncHandler(async (req, res) => {
  const { lessonKey, minutes, bpm, notes } = req.body;
  const userId = req.user._id;

  const practiceData = {
    date: new Date(),
    minutes,
    bpm,
    notes
  };

  const progress = await UserProgress.logPractice(userId, lessonKey, practiceData);

  res.status(200).json({
    success: true,
    data: progress
  });
});

// Complete a lesson
export const completeLesson = asyncHandler(async (req, res) => {
  const { lessonKey, score, acquiredSkills } = req.body;
  const userId = req.user._id;

  const progress = await UserProgress.completeLesson(userId, lessonKey, score, acquiredSkills);

  res.status(200).json({
    success: true,
    data: progress
  });
});

// Get lesson progress
export const getLessonProgress = asyncHandler(async (req, res) => {
  const { lessonKey } = req.params;
  const userId = req.user._id;

  const progress = await UserProgress.getLessonProgress(userId, lessonKey);

  if (!progress) {
    return res.status(200).json({
      success: true,
      data: {
        status: 'not_started',
        score: 0,
        acquiredSkills: [],
        practiceLogs: [],
        timeSpent: 0
      }
    });
  }

  res.status(200).json({
    success: true,
    data: progress
  });
});

// Get course progress
export const getCourseProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user._id;

  const progress = await UserProgress.getUserCourseProgress(userId, courseId);
  const completionPercentage = await UserProgress.getCourseCompletionPercentage(userId, courseId);

  res.status(200).json({
    success: true,
    data: {
      progress,
      completionPercentage: completionPercentage[0]?.completionPercentage || 0
    }
  });
});

// Get next recommended lesson (adaptive learning)
export const getNextLesson = asyncHandler(async (req, res) => {
  const { course } = req.query;
  const userId = req.user._id;

  if (!course) {
    throw new AppError('Tham số course là bắt buộc', 400);
  }

  // Get course by slug
  const courseData = await Course.findOne({ slug: course });
  if (!courseData) {
    throw new AppError('Khóa học không tồn tại', 404);
  }

  // Get user's acquired skills
  const userSkills = await UserProgress.getUserSkills(userId);
  const acquiredSkills = userSkills.map(item => item.skill);

  // Get user's course progress
  const courseProgress = await UserProgress.getUserCourseProgress(userId, courseData._id);
  const completedLessons = courseProgress
    .filter(p => p.status === 'completed' && p.score >= 70)
    .map(p => p.lessonKey);

  // Find next lesson based on prerequisites and skills
  let nextLesson = null;
  let recommendation = null;

  for (const module of courseData.modules) {
    for (const lesson of module.lessons) {
      const lessonKey = `${courseData.slug}#${module.order}.${lesson.order}`;
      
      // Skip if already completed with good score
      if (completedLessons.includes(lessonKey)) {
        continue;
      }

      // Check prerequisites
      const hasPrerequisites = lesson.prerequisites.every(prereq => 
        acquiredSkills.includes(prereq)
      );

      if (hasPrerequisites) {
        nextLesson = {
          lessonKey,
          title: lesson.title,
          type: lesson.type,
          durationMin: lesson.durationMin,
          objectives: lesson.objectives,
          skills: lesson.skills,
          moduleTitle: module.title,
          moduleOrder: module.order,
          lessonOrder: lesson.order
        };
        break;
      } else {
        // Suggest practice lesson or song at same level
        if (!recommendation && lesson.type === 'PRACTICE') {
          recommendation = {
            lessonKey,
            title: lesson.title,
            type: lesson.type,
            reason: 'Luyện tập để đạt được kỹ năng cần thiết',
            moduleTitle: module.title
          };
        }
      }
    }
    if (nextLesson) break;
  }

  res.status(200).json({
    success: true,
    data: {
      nextLesson,
      recommendation,
      acquiredSkills,
      completedLessons: completedLessons.length
    }
  });
});
