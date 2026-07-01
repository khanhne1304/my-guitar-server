import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import { listAdmin, create, update, remove } from '../controllers/banner.controller.js';

const router = Router();

router.use(protect);
router.use(admin);

router.get('/', listAdmin);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
