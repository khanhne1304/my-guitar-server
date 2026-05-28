import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  followUser,
  unfollowUser,
  followTag,
  unfollowTag,
  listFollowing,
} from '../controllers/follow.controller.js';

const router = Router();

router.use(protect);

router.post('/user/:id', followUser);
router.delete('/user/:id', unfollowUser);
router.post('/tag/:tag', followTag);
router.delete('/tag/:tag', unfollowTag);
router.get('/me', listFollowing);

export default router;
