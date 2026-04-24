import { Router } from 'express';
import { chatRecommend, reindexProducts } from '../controllers/chat.controller.js';
import { protect, admin } from '../middlewares/auth.js';

const router = Router();

// Chatbot recommend endpoint (public)
router.post('/', chatRecommend);

// Admin: force rebuild embeddings index
router.post('/reindex', protect, admin, reindexProducts);

export default router;


