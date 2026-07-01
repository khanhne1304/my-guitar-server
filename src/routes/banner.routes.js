import { Router } from 'express';
import { listPublic } from '../controllers/banner.controller.js';

const router = Router();

router.get('/', listPublic);

export default router;
