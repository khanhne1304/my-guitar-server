import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getUnreadMessagesCount,
  getConversations,
  getThread,
  postMessage,
  markThreadReadHandler,
} from '../controllers/message.controller.js';

const router = Router();

router.use(protect);

router.get('/unread-count', getUnreadMessagesCount);
router.get('/conversations', getConversations);
router.put('/with/:userId/read', markThreadReadHandler);
router.get('/with/:userId', getThread);
router.post('/with/:userId', postMessage);

export default router;
