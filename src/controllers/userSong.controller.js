import UserSong from '../models/UserSong.js';
import { deleteAudioFromCloudinary } from '../utils/cloudinary.js';

/**
 * Lấy danh sách bài hát của user (có pagination và search)
 */
export async function listUserSongs(req, res, next) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build query - chỉ lấy bài hát của user hiện tại
    const query = { 
      createdBy: req.user._id,
      isActive: true 
    };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [songs, total] = await Promise.all([
      UserSong.find(query)
        .populate('referenceSongId', 'title artist')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserSong.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        songs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách bài hát của user:', error);
    return next(error);
  }
}

/**
 * Lấy thông tin một bài hát của user theo ID
 */
export async function getUserSong(req, res, next) {
  try {
    const { id } = req.params;

    const song = await UserSong.findOne({
      _id: id,
      createdBy: req.user._id, // Chỉ lấy bài hát của user hiện tại
    })
      .populate('referenceSongId', 'title artist')
      .populate('createdBy', 'name email')
      .lean();

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài hát.',
      });
    }

    return res.json({
      success: true,
      data: song,
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy thông tin bài hát của user:', error);
    return next(error);
  }
}

/**
 * Tạo bài hát mới cho user
 * (Thường được gọi từ compareSong controller khi user upload và muốn lưu)
 */
export async function createUserSong(req, res, next) {
  try {
    const {
      title,
      description,
      audioFile,
      originalFilename,
      mimetype,
      referenceSongId,
      comparisonResult,
      tags,
    } = req.body || {};

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề bài hát là bắt buộc.',
      });
    }

    if (!audioFile || !audioFile.publicId || !audioFile.url) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin file audio không hợp lệ.',
      });
    }

    // Tạo record trong database
    const userSong = await UserSong.create({
      title: title.trim(),
      description: description?.trim() || '',
      audioFile: {
        publicId: audioFile.publicId,
        url: audioFile.url,
        format: audioFile.format,
        duration: audioFile.duration,
        size: audioFile.size,
      },
      originalFilename: originalFilename || '',
      mimetype: mimetype || '',
      createdBy: req.user._id,
      referenceSongId: referenceSongId || null,
      lastComparisonResult: comparisonResult || null,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      isActive: true,
    });

    const populated = await UserSong.findById(userSong._id)
      .populate('referenceSongId', 'title artist')
      .populate('createdBy', 'name email')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Đã lưu bài hát thành công.',
      data: populated,
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo bài hát của user:', error);
    return next(error);
  }
}

/**
 * Cập nhật thông tin bài hát của user
 */
export async function updateUserSong(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      tags,
      isActive,
    } = req.body || {};

    const song = await UserSong.findOne({
      _id: id,
      createdBy: req.user._id, // Chỉ cho phép user sửa bài hát của mình
    });

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài hát.',
      });
    }

    // Cập nhật các trường
    if (title !== undefined) song.title = title.trim();
    if (description !== undefined) song.description = description?.trim() || '';
    if (isActive !== undefined) song.isActive = isActive === 'true' || isActive === true || isActive === '1';

    // Parse tags
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        song.tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        song.tags = tags;
      }
    }

    await song.save();

    const populated = await UserSong.findById(song._id)
      .populate('referenceSongId', 'title artist')
      .populate('createdBy', 'name email')
      .lean();

    return res.json({
      success: true,
      message: 'Đã cập nhật bài hát thành công.',
      data: populated,
    });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật bài hát của user:', error);
    return next(error);
  }
}

/**
 * Xóa bài hát của user
 */
export async function deleteUserSong(req, res, next) {
  try {
    const { id } = req.params;

    const song = await UserSong.findOne({
      _id: id,
      createdBy: req.user._id, // Chỉ cho phép user xóa bài hát của mình
    });

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài hát.',
      });
    }

    // Xóa file từ Cloudinary
    if (song.audioFile?.publicId) {
      try {
        await deleteAudioFromCloudinary(song.audioFile.publicId);
        console.log(`✅ Đã xóa file từ Cloudinary: ${song.audioFile.publicId}`);
      } catch (deleteError) {
        console.error('❌ Lỗi khi xóa file từ Cloudinary:', deleteError);
        // Vẫn tiếp tục xóa record trong database
      }
    }

    // Xóa record trong database
    await UserSong.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Đã xóa bài hát thành công.',
    });
  } catch (error) {
    console.error('❌ Lỗi khi xóa bài hát của user:', error);
    return next(error);
  }
}

/**
 * Cập nhật kết quả so sánh cho bài hát
 */
export async function updateComparisonResult(req, res, next) {
  try {
    const { id } = req.params;
    const { comparisonResult, referenceSongId } = req.body || {};

    const song = await UserSong.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài hát.',
      });
    }

    if (comparisonResult !== undefined) {
      song.lastComparisonResult = comparisonResult;
    }
    if (referenceSongId !== undefined) {
      song.referenceSongId = referenceSongId || null;
    }
    song.comparisonCount = (song.comparisonCount || 0) + 1;

    await song.save();

    const populated = await UserSong.findById(song._id)
      .populate('referenceSongId', 'title artist')
      .lean();

    return res.json({
      success: true,
      message: 'Đã cập nhật kết quả so sánh thành công.',
      data: populated,
    });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật kết quả so sánh:', error);
    return next(error);
  }
}

