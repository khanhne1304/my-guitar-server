import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listSongs,
  getSongBySlug,
  createSong,
  updateSong,
  deleteSong,
} from '../controllers/song.controller.js';
import { validateSongCreate, validateSongUpdate } from '../validators/song.validator.js';

const router = Router();

// Public
router.get('/', listSongs);
router.get('/:slug', getSongBySlug);

// Admin
router.post('/', protect, admin, validateSongCreate, createSong);
router.patch('/:id', protect, admin, validateSongUpdate, updateSong);
router.delete('/:id', protect, admin, deleteSong);

export default router;


