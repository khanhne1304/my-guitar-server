import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  hideNotification
} from '../controllers/notification.controller.js';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(protect);

// Routes cho user notifications
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.put('/:notificationId/read', markNotificationAsRead);
router.put('/mark-all-read', markAllNotificationsAsRead);
router.delete('/:notificationId/hide', hideNotification);

export default router;
