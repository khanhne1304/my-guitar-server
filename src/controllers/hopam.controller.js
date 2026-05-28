import { searchHopamSongs, fetchHopamSong } from '../services/hopam.service.js';

export async function searchHopam(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Nhập ít nhất 2 ký tự để tìm kiếm',
      });
    }
    const data = await searchHopamSongs(q);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

export async function getHopamSong(req, res, next) {
  try {
    const url = String(req.query.url || '').trim();
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số url',
      });
    }
    const data = await fetchHopamSong(url);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}
