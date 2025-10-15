import { validationResult } from 'express-validator';
import {
  getAllCoursesService,
  getCourseByIdService,
  createCourseService,
  updateCourseService,
  deleteCourseService,
  getCoursesByLevelService,
  searchCoursesByTitleService,
  getCoursesByUserService,
  addModuleToCourseService,
  updateModuleInCourseService,
  removeModuleFromCourseService,
  addLessonToModuleService,
  updateLessonInModuleService,
  removeLessonFromModuleService
} from '../services/course.service.js';

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

// GET /api/courses - Get all courses with filtering and pagination
export const getAllCourses = async (req, res, next) => {
  try {
    const result = await getAllCoursesService(req.query);
    
    return sendSuccessResponse(
      res,
      'Lấy danh sách khóa học thành công',
      result
    );
  } catch (error) {
    console.error('Get all courses error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// GET /api/courses/:slug - Get course by slug
export const getCourseById = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { ml } = req.params; // For lesson endpoint
    
    // If ml parameter exists, get specific lesson
    if (ml) {
      const [moduleOrder, lessonOrder] = ml.split('.');
      const course = await getCourseByIdService(slug, true); // Get by slug
      
      if (!course) {
        return sendErrorResponse(res, 'Khóa học không tồn tại', 404);
      }
      
      const module = course.modules.find(m => m.order === parseInt(moduleOrder));
      if (!module) {
        return sendErrorResponse(res, 'Module không tồn tại', 404);
      }
      
      const lesson = module.lessons.find(l => l.order === parseInt(lessonOrder));
      if (!lesson) {
        return sendErrorResponse(res, 'Bài học không tồn tại', 404);
      }
      
      return sendSuccessResponse(res, 'Lấy thông tin bài học thành công', {
        course: {
          _id: course._id,
          title: course.title,
          slug: course.slug
        },
        module: {
          _id: module._id,
          title: module.title,
          order: module.order
        },
        lesson: {
          _id: lesson._id,
          title: lesson.title,
          type: lesson.type,
          durationMin: lesson.durationMin,
          objectives: lesson.objectives,
          skills: lesson.skills,
          prerequisites: lesson.prerequisites,
          content: lesson.content,
          practice: lesson.practice,
          assessment: lesson.assessment,
          order: lesson.order
        }
      });
    }
    
    // Regular course endpoint
    const course = await getCourseByIdService(slug, true); // Get by slug
    
    return sendSuccessResponse(
      res,
      'Lấy thông tin khóa học thành công',
      course
    );
  } catch (error) {
    console.error('Get course by slug error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// POST /api/courses - Create new course
export const createCourse = async (req, res, next) => {
  try {
    const course = await createCourseService(req.body, req.user.id);
    
    return sendSuccessResponse(
      res,
      'Tạo khóa học thành công',
      course,
      201
    );
  } catch (error) {
    console.error('Create course error:', error);
    
    if (error.message.includes('Đã tồn tại')) {
      return sendErrorResponse(res, error.message, 409);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// PUT /api/courses/:id - Update course
export const updateCourse = async (req, res, next) => {
  try {
    const course = await updateCourseService(req.params.id, req.body, req.user.id);
    
    return sendSuccessResponse(
      res,
      'Cập nhật khóa học thành công',
      course
    );
  } catch (error) {
    console.error('Update course error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    if (error.message.includes('Đã tồn tại')) {
      return sendErrorResponse(res, error.message, 409);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// DELETE /api/courses/:id - Delete course
export const deleteCourse = async (req, res, next) => {
  try {
    await deleteCourseService(req.params.id, req.user.id);
    
    return sendSuccessResponse(
      res,
      'Xóa khóa học thành công'
    );
  } catch (error) {
    console.error('Delete course error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// POST /api/courses/:id/modules - Add module to course
export const addModuleToCourse = async (req, res, next) => {
  try {
    const course = await addModuleToCourseService(
      req.params.id,
      req.body,
      req.user.id
    );
    
    return sendSuccessResponse(
      res,
      'Thêm module vào khóa học thành công',
      course
    );
  } catch (error) {
    console.error('Add module to course error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// PUT /api/courses/:id/modules/:moduleId - Update module in course
export const updateModuleInCourse = async (req, res, next) => {
  try {
    const course = await updateModuleInCourseService(
      req.params.id,
      req.params.moduleId,
      req.body,
      req.user.id
    );
    
    return sendSuccessResponse(
      res,
      'Cập nhật module thành công',
      course
    );
  } catch (error) {
    console.error('Update module in course error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// DELETE /api/courses/:id/modules/:moduleId - Remove module from course
export const removeModuleFromCourse = async (req, res, next) => {
  try {
    const course = await removeModuleFromCourseService(
      req.params.id,
      req.params.moduleId,
      req.user.id
    );
    
    return sendSuccessResponse(
      res,
      'Xóa module khỏi khóa học thành công',
      course
    );
  } catch (error) {
    console.error('Remove module from course error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// POST /api/courses/:id/modules/:moduleId/lessons - Add lesson to module
export const addLessonToModule = async (req, res, next) => {
  try {
    const course = await addLessonToModuleService(
      req.params.id,
      req.params.moduleId,
      req.body,
      req.user.id
    );
    
    return sendSuccessResponse(
      res,
      'Thêm bài học vào module thành công',
      course
    );
  } catch (error) {
    console.error('Add lesson to module error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// PUT /api/courses/:id/modules/:moduleId/lessons/:lessonId - Update lesson in module
export const updateLessonInModule = async (req, res, next) => {
  try {
    const course = await updateLessonInModuleService(
      req.params.id,
      req.params.moduleId,
      req.params.lessonId,
      req.body,
      req.user.id
    );
    
    return sendSuccessResponse(
      res,
      'Cập nhật bài học thành công',
      course
    );
  } catch (error) {
    console.error('Update lesson in module error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// DELETE /api/courses/:id/modules/:moduleId/lessons/:lessonId - Remove lesson from module
export const removeLessonFromModule = async (req, res, next) => {
  try {
    const course = await removeLessonFromModuleService(
      req.params.id,
      req.params.moduleId,
      req.params.lessonId,
      req.user.id
    );
    
    return sendSuccessResponse(
      res,
      'Xóa bài học khỏi module thành công',
      course
    );
  } catch (error) {
    console.error('Remove lesson from module error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    if (error.message.includes('không có quyền')) {
      return sendErrorResponse(res, error.message, 403);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// GET /api/courses/level/:level - Get courses by level
export const getCoursesByLevel = async (req, res, next) => {
  try {
    const courses = await getCoursesByLevelService(req.params.level);
    
    return sendSuccessResponse(
      res,
      `Lấy danh sách khóa học level ${req.params.level} thành công`,
      courses
    );
  } catch (error) {
    console.error('Get courses by level error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// GET /api/courses/search/:searchTerm - Search courses by title
export const searchCoursesByTitle = async (req, res, next) => {
  try {
    const courses = await searchCoursesByTitleService(req.params.searchTerm);
    
    return sendSuccessResponse(
      res,
      `Tìm kiếm khóa học với từ khóa "${req.params.searchTerm}" thành công`,
      courses
    );
  } catch (error) {
    console.error('Search courses by title error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};
// GET /api/courses/user/:userId - Get courses created by user
export const getCoursesByUser = async (req, res, next) => {
  try {
    const courses = await getCoursesByUserService(req.params.userId);
    
    return sendSuccessResponse(
      res,
      'Lấy danh sách khóa học của người dùng thành công',
      courses
    );
  } catch (error) {
    console.error('Get courses by user error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// GET /api/courses/my-courses - Get current user's courses
export const getMyCourses = async (req, res, next) => {
  try {
    const courses = await getCoursesByUserService(req.user.id);
    
    return sendSuccessResponse(
      res,
      'Lấy danh sách khóa học của bạn thành công',
      courses
    );
  } catch (error) {
    console.error('Get my courses error:', error);
    return sendErrorResponse(res, error.message, 500);
  }
};

// GET /api/courses/basic-guitar - Get basic guitar course
export const getBasicGuitarCourse = async (req, res, next) => {
  try {
    const course = await getCourseByIdService('basic-guitar');
    
    return sendSuccessResponse(
      res,
      'Lấy thông tin khóa học guitar cơ bản thành công',
      course
    );
  } catch (error) {
    console.error('Get basic guitar course error:', error);
    
    if (error.message.includes('không hợp lệ') || error.message.includes('Không tìm thấy')) {
      return sendErrorResponse(res, error.message, 404);
    }
    
    return sendErrorResponse(res, error.message, 500);
  }
};

// Export validation middleware
export { handleValidationErrors };

