import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import * as dashboardCtrl from '../controllers/learning/dashboard.controller.js';

const router = Router();

router.get('/', protect, dashboardCtrl.getDashboard);
router.get('/stats', protect, dashboardCtrl.getStats);

export default router;
