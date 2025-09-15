import { validationResult } from 'express-validator';
import {
  listSongsService,
  getSongBySlugService,
  createSongService,
  updateSongService,
  deleteSongService,
} from '../services/song.service.js';

export async function listSongs(req, res, next) {
  try {
    const songs = await listSongsService(req.query);
    res.json(songs);
  } catch (e) {
    next(e);
  }
}

export async function getSongBySlug(req, res, next) {
  try {
    const song = await getSongBySlugService(req.params.slug);
    if (!song) return res.status(404).json({ message: 'Không tìm thấy bài hát' });
    res.json(song);
  } catch (e) {
    next(e);
  }
}

export async function createSong(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const created = await createSongService(req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

export async function updateSong(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const updated = await updateSongService(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function deleteSong(req, res, next) {
  try {
    const removed = await deleteSongService(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã vô hiệu hoá', song: removed });
  } catch (e) {
    next(e);
  }
}


