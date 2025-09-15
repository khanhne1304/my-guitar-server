import Song from '../models/Song.js';

/**
 * Lấy danh sách bài hát với filter cơ bản + search theo q + phân trang
 */
export async function listSongsService(query) {
  const { q, page = 1, limit = 12, sort = '-createdAt' } = query;

  const find = { isActive: true };
  if (q) {
    const regex = new RegExp(q.trim(), 'i');
    Object.assign(find, {
      $or: [{ title: regex }, { subtitle: regex }, { artists: regex }, { slug: regex }],
    });
  }

  const pageNum = Number(page) || 1;
  const limitNum = Math.min(Number(limit) || 12, 100);
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  String(sort)
    .split(',')
    .filter(Boolean)
    .forEach((field) => {
      sortObj[field.replace('-', '')] = field.startsWith('-') ? -1 : 1;
    });

  const songs = await Song.find(find)
    .sort(Object.keys(sortObj).length ? sortObj : { createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .select('-__v');

  return songs;
}

export async function getSongBySlugService(slug) {
  return await Song.findOne({ slug, isActive: true }).select('-__v');
}

export async function createSongService(data) {
  return await Song.create(data);
}

export async function updateSongService(id, data) {
  return await Song.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteSongService(id) {
  return await Song.findByIdAndUpdate(id, { isActive: false }, { new: true });
}


