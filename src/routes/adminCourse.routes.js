import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
} from '../controllers/adminCourse.controller.js';

const router = Router();

router.use(protect);
router.use(admin);

router.get('/', listCourses);
router.post('/', createCourse);
router.patch('/:id/publish', publishCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
