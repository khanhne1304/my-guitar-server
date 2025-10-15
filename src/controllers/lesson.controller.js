import { validationResult } from 'express-validator';
import LessonProgress from '../models/Lesson.js';
import Course from '../models/Course.js';

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  next();
};

// Helper function to send success response
const sendSuccessResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

// Helper function to send error response
const sendErrorResponse = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

// GET /api/lessons/:id - Get lesson details
export const getLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find the course that contains this lesson
    const course = await Course.findOne({
      'modules.lessons._id': id
    });

    if (!course) {
      return sendErrorResponse(res, 'Không tìm thấy bài học', 404);
    }

    // Find the specific lesson
    let lesson = null;
    for (const module of course.modules) {
      const foundLesson = module.lessons.id(id);
      if (foundLesson) {
        lesson = foundLesson;
        break;
      }
    }

    if (!lesson) {
      return sendErrorResponse(res, 'Không tìm thấy bài học', 404);
    }

    // Get user progress if authenticated
    let userProgress = null;
    if (userId) {
      userProgress = await LessonProgress.getLessonProgress(userId, id);
    }

    const response = {
      lesson: {
        id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        youtubeVideoId: lesson.youtubeVideoId,
        tabContent: lesson.tabContent,
        instructions: lesson.instructions,
        contentType: lesson.contentType,
        order: lesson.order,
        practiceSettings: lesson.practiceSettings
      },
      course: {
        id: course._id,
        title: course.title,
        description: course.description
      },
      userProgress
    };

    return sendSuccessResponse(
      res,
      'Lấy thông tin bài học thành công',
      response
    );
  } catch (error) {
    console.error('Get lesson by ID error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// PATCH /api/lessons/:id/progress - Update lesson progress
export const updateLessonProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { isCompleted, timeSpent, notes, rating, progressData } = req.body;

    // Validate lesson exists
    const course = await Course.findOne({
      'modules.lessons._id': id
    });

    if (!course) {
      return sendErrorResponse(res, 'Không tìm thấy bài học', 404);
    }

    // Update or create lesson progress
    const lessonProgress = await LessonProgress.updateLessonProgress(userId, id, {
      courseId: course._id,
      isCompleted,
      timeSpent,
      notes,
      rating,
      progressData
    });

    return sendSuccessResponse(
      res,
      'Cập nhật tiến độ bài học thành công',
      lessonProgress
    );
  } catch (error) {
    console.error('Update lesson progress error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// GET /api/lessons/:id/progress - Get lesson progress
export const getLessonProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const progress = await LessonProgress.getLessonProgress(userId, id);

    if (!progress) {
      return sendSuccessResponse(
        res,
        'Chưa có tiến độ học tập',
        { progress: null }
      );
    }

    return sendSuccessResponse(
      res,
      'Lấy tiến độ bài học thành công',
      { progress }
    );
  } catch (error) {
    console.error('Get lesson progress error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// GET /api/courses/:courseId/progress - Get course progress
export const getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 'Không tìm thấy khóa học', 404);
    }

    // Get user progress for all lessons in the course
    const progress = await LessonProgress.getUserCourseProgress(userId, courseId);

    // Calculate completion percentage
    const totalLessons = course.lessonCount;
    const completedLessons = progress.filter(p => p.isCompleted).length;
    const completionPercentage = totalLessons > 0 ? 
      Math.round((completedLessons / totalLessons) * 100) : 0;

    const response = {
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        totalLessons,
        completedLessons,
        completionPercentage
      },
      progress
    };

    return sendSuccessResponse(
      res,
      'Lấy tiến độ khóa học thành công',
      response
    );
  } catch (error) {
    console.error('Get course progress error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// PATCH /api/lessons/:id/complete - Mark lesson as completed
export const markLessonCompleted = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate lesson exists
    const course = await Course.findOne({
      'modules.lessons._id': id
    });

    if (!course) {
      return sendErrorResponse(res, 'Không tìm thấy bài học', 404);
    }

    const progress = await LessonProgress.markLessonCompleted(userId, id);

    return sendSuccessResponse(
      res,
      'Đánh dấu bài học hoàn thành thành công',
      progress
    );
  } catch (error) {
    console.error('Mark lesson completed error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// POST /api/lessons/:id/practice - Add practice time
export const addPracticeTime = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { minutes } = req.body;

    if (!minutes || minutes <= 0) {
      return sendErrorResponse(res, 'Thời gian luyện tập phải lớn hơn 0', 400);
    }

    // Get or create lesson progress
    let progress = await LessonProgress.getLessonProgress(userId, id);
    
    if (!progress) {
      const course = await Course.findOne({
        'modules.lessons._id': id
      });
      
      if (!course) {
        return sendErrorResponse(res, 'Không tìm thấy bài học', 404);
      }

      progress = new LessonProgress({
        userId,
        courseId: course._id,
        lessonId: id,
        progressData: { practiceTime: 0 }
      });
    }

    await progress.addPracticeTime(minutes);

    return sendSuccessResponse(
      res,
      'Cập nhật thời gian luyện tập thành công',
      progress
    );
  } catch (error) {
    console.error('Add practice time error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// Export validation middleware
export { handleValidationErrors };
