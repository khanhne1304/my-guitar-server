import { Router } from 'express';
import { listStores } from '../controllers/store.controller.js';

const router = Router();

router.get('/', listStores);

export default router;



