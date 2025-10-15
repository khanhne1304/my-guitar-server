import UserProgress from '../models/UserProgress.js';
import Course from '../models/Course.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

// Submit assessment (quiz or recording)
export const submitAssessment = asyncHandler(async (req, res) => {
  const { lessonKey, assessmentType, answers, recordingUrl, score } = req.body;
  const userId = req.user._id;

  // Validate assessment type
  if (!['quiz', 'recording'].includes(assessmentType)) {
    throw new AppError('Loại đánh giá không hợp lệ', 400);
  }

  // Calculate score based on assessment type
  let finalScore = 0;
  let acquiredSkills = [];

  if (assessmentType === 'quiz') {
    // Simple quiz scoring (can be enhanced with more complex logic)
    if (answers && Array.isArray(answers)) {
      const correctAnswers = answers.filter(answer => answer.isCorrect).length;
      finalScore = Math.round((correctAnswers / answers.length) * 100);
    }
  } else if (assessmentType === 'recording') {
    // For recording, use provided score or default based on completion
    finalScore = score || 70; // Default score for recording submission
  }

  // Determine acquired skills based on score
  if (finalScore >= 70) {
    // Get lesson details to determine skills
    const [courseSlug, moduleLesson] = lessonKey.split('#');
    const [moduleOrder, lessonOrder] = moduleLesson.split('.');
    
    const course = await Course.findOne({ slug: courseSlug });
    if (course) {
      const module = course.modules.find(m => m.order === parseInt(moduleOrder));
      if (module) {
        const lesson = module.lessons.find(l => l.order === parseInt(lessonOrder));
        if (lesson) {
          acquiredSkills = lesson.skills || [];
        }
      }
    }
  }

  // Update progress
  const progress = await UserProgress.completeLesson(userId, lessonKey, finalScore, acquiredSkills);

  res.status(200).json({
    success: true,
    data: {
      progress,
      score: finalScore,
      acquiredSkills,
      passed: finalScore >= 70
    }
  });
});

// Get assessment results
export const getAssessmentResults = asyncHandler(async (req, res) => {
  const { lessonKey } = req.params;
  const userId = req.user._id;

  const progress = await UserProgress.getLessonProgress(userId, lessonKey);

  if (!progress) {
    throw new AppError('Không tìm thấy tiến độ bài học', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      lessonKey,
      score: progress.score,
      bestScore: progress.bestScore,
      status: progress.status,
      acquiredSkills: progress.acquiredSkills,
      completedAt: progress.completedAt,
      attempts: progress.attempts,
      timeSpent: progress.timeSpent
    }
  });
});
