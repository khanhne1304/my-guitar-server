import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import { getStatistics } from '../controllers/statistics.controller.js';

const router = Router();

// Chỉ admin mới được xem thống kê
router.get('/', protect, admin, getStatistics);

export default router;

