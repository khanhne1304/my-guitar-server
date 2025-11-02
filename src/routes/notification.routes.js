import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  list,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller.js';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(protect);

// GET /api/notifications - Lấy danh sách notifications cho user
router.get('/', list);

// GET /api/notifications/unread-count - Lấy số lượng thông báo chưa đọc
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/:id/read - Đánh dấu thông báo đã đọc
router.put('/:id/read', markNotificationAsRead);

// PUT /api/notifications/mark-all-read - Đánh dấu tất cả thông báo đã đọc
router.put('/mark-all-read', markAllNotificationsAsRead);

export default router;

