import { Router } from 'express';
import { searchHopam, getHopamSong } from '../controllers/hopam.controller.js';

const router = Router();

router.get('/search', searchHopam);
router.get('/song', getHopamSong);

export default router;
