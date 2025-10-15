import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesByLevel,
  searchCoursesByTitle,
  getCoursesByUser,
  getMyCourses,
  getBasicGuitarCourse,
  addModuleToCourse,
  updateModuleInCourse,
  removeModuleFromCourse,
  addLessonToModule,
  updateLessonInModule,
  removeLessonFromModule,
  handleValidationErrors
} from '../controllers/course.controller.js';
import {
  createCourseValidator,
  updateCourseValidator,
  getCourseValidator,
  deleteCourseValidator,
  getCoursesValidator,
  addModuleValidator,
  updateModuleValidator,
  removeModuleValidator,
  addLessonToModuleValidator,
  updateLessonInModuleValidator,
  removeLessonFromModuleValidator
} from '../validators/course.validator.js';

const router = express.Router();

// Public routes (no authentication required)
// GET /api/courses - Get all courses with filtering and pagination
router.get(
  '/',
  getCoursesValidator,
  handleValidationErrors,
  getAllCourses
);

// GET /api/courses/level/:level - Get courses by level
router.get(
  '/level/:level',
  getCoursesByLevel
);

// GET /api/courses/search/:searchTerm - Search courses by title
router.get(
  '/search/:searchTerm',
  searchCoursesByTitle
);

// GET /api/courses/basic-guitar - Get basic guitar course
router.get(
  '/basic-guitar',
  getBasicGuitarCourse
);

// GET /api/courses/:slug - Get course by slug
router.get(
  '/:slug',
  getCourseValidator,
  handleValidationErrors,
  getCourseById
);

// GET /api/courses/:slug/lessons/:ml - Get specific lesson (ml = "1.3")
router.get(
  '/:slug/lessons/:ml',
  getCourseValidator,
  handleValidationErrors,
  getCourseById
);

// Protected routes (authentication required)
// All routes below require authentication
router.use(protect);

// GET /api/courses/user/:userId - Get courses created by specific user
router.get(
  '/user/:userId',
  getCoursesByUser
);

// GET /api/courses/my-courses - Get current user's courses
router.get(
  '/my-courses',
  getMyCourses
);

// POST /api/courses - Create new course
router.post(
  '/',
  createCourseValidator,
  handleValidationErrors,
  createCourse
);

// PUT /api/courses/:id - Update course
router.put(
  '/:id',
  updateCourseValidator,
  handleValidationErrors,
  updateCourse
);

// DELETE /api/courses/:id - Delete course
router.delete(
  '/:id',
  deleteCourseValidator,
  handleValidationErrors,
  deleteCourse
);

// Module management routes
// POST /api/courses/:id/modules - Add module to course
router.post(
  '/:id/modules',
  addModuleValidator,
  handleValidationErrors,
  addModuleToCourse
);

// PUT /api/courses/:id/modules/:moduleId - Update module in course
router.put(
  '/:id/modules/:moduleId',
  updateModuleValidator,
  handleValidationErrors,
  updateModuleInCourse
);

// DELETE /api/courses/:id/modules/:moduleId - Remove module from course
router.delete(
  '/:id/modules/:moduleId',
  removeModuleValidator,
  handleValidationErrors,
  removeModuleFromCourse
);

// Lesson management routes
// POST /api/courses/:id/modules/:moduleId/lessons - Add lesson to module
router.post(
  '/:id/modules/:moduleId/lessons',
  addLessonToModuleValidator,
  handleValidationErrors,
  addLessonToModule
);

// PUT /api/courses/:id/modules/:moduleId/lessons/:lessonId - Update lesson in module
router.put(
  '/:id/modules/:moduleId/lessons/:lessonId',
  updateLessonInModuleValidator,
  handleValidationErrors,
  updateLessonInModule
);

// DELETE /api/courses/:id/modules/:moduleId/lessons/:lessonId - Remove lesson from module
router.delete(
  '/:id/modules/:moduleId/lessons/:lessonId',
  removeLessonFromModuleValidator,
  handleValidationErrors,
  removeLessonFromModule
);

export default router;
