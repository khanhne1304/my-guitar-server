import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getCourses,
  getCourseById,
  getModules,
  getLessons,
  getModuleQuiz,
  postCompleteLesson,
  postQuizSubmit,
} from '../controllers/courseLearning.controller.js';
import * as inst from '../controllers/instructorCourse.controller.js';

const router = Router();

router.post('/courses', protect, inst.createCourse);
router.get('/instructor/my-courses', protect, inst.listMyCourses);
router.get('/instructor/courses/:courseId/builder', protect, inst.getBuilder);
router.patch(
  '/instructor/courses/:courseId/modules/reorder',
  protect,
  inst.reorderModules,
);

router.patch('/courses/:courseId/publish', protect, inst.publishCourse);
router.put('/courses/:courseId', protect, inst.updateCourse);
router.delete('/courses/:courseId', protect, inst.deleteCourse);

router.post('/modules', protect, inst.addModule);
router.post('/lessons', protect, inst.addLesson);
router.post('/quiz', protect, inst.upsertQuiz);

router.get('/courses', protect, getCourses);
router.get('/courses/:courseId', protect, getCourseById);
router.get('/modules/:courseId', protect, getModules);
router.get('/lessons/:moduleId', protect, getLessons);
router.get('/quiz/:moduleId', protect, getModuleQuiz);
router.post('/progress/complete-lesson', protect, postCompleteLesson);
router.post('/quiz/submit', protect, postQuizSubmit);

export default router;
