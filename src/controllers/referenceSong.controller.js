import ReferenceSong from '../models/ReferenceSong.js';
import { uploadAudioToCloudinary, deleteAudioFromCloudinary } from '../utils/cloudinary.js';

/**
 * Lấy danh sách bài hát gốc (có pagination và search)
 */
export async function listReferenceSongs(req, res, next) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '',
      difficulty,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
      ];
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === '1';
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [songs, total] = await Promise.all([
      ReferenceSong.find(query)
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ReferenceSong.countDocuments(query),
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
    console.error('❌ Lỗi khi lấy danh sách bài hát gốc:', error);
    return next(error);
  }
}

/**
 * Lấy danh sách bài hát gốc công khai (cho user thường, chỉ lấy bài isActive = true)
 */
export async function listPublicReferenceSongs(req, res, next) {
  try {
    console.log('📥 Request đến /public - listPublicReferenceSongs');
    const { 
      limit = 100, 
      search = '',
      difficulty,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

    // Build query - chỉ lấy bài isActive = true
    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
      ];
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    console.log('🔍 Query:', JSON.stringify(query));
    console.log('📊 Sort:', JSON.stringify(sort));
    console.log('📏 Limit:', limitNum);

    // Execute query - không populate createdBy để bảo mật
    const songs = await ReferenceSong.find(query)
      .select('-createdBy') // Không trả về thông tin người tạo
      .sort(sort)
      .limit(limitNum)
      .lean();

    console.log(`✅ Tìm thấy ${songs.length} bài hát gốc`);

    return res.json({
      success: true,
      data: {
        songs,
        count: songs.length,
      },
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách bài hát gốc công khai:', error);
    return next(error);
  }
}

/**
 * Lấy thông tin một bài hát gốc theo ID
 */
export async function getReferenceSong(req, res, next) {
  try {
    const { id } = req.params;

    const song = await ReferenceSong.findById(id)
      .populate('createdBy', 'name email')
      .lean();

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài hát gốc.',
      });
    }

    return res.json({
      success: true,
      data: song,
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy thông tin bài hát gốc:', error);
    return next(error);
  }
}

/**
 * Upload bài hát gốc mới (chỉ admin)
 */
export async function createReferenceSong(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Chưa nhận được file audio.',
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const {
      title,
      description,
      artist,
      tempo,
      timeSignature,
      key,
      difficulty = 'intermediate',
      tags,
    } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề bài hát là bắt buộc.',
      });
    }

    // Kiểm tra buffer
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File audio rỗng hoặc không hợp lệ.',
      });
    }

    // Upload lên Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadAudioToCloudinary(
        buffer,
        originalname,
        'ref' // Folder trên Cloudinary
      );
    } catch (uploadError) {
      console.error('❌ Lỗi khi upload lên Cloudinary:', uploadError);
      return res.status(500).json({
        success: false,
        message: `Lỗi khi upload file: ${uploadError.message || 'Unknown error'}`,
      });
    }

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary upload không trả về URL hợp lệ',
      });
    }

    // Parse tags nếu là string
    let tagsArray = [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Tạo record trong database
    const referenceSong = await ReferenceSong.create({
      title: title.trim(),
      description: description?.trim() || '',
      artist: artist?.trim() || '',
      audioFile: {
        publicId: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        format: cloudinaryResult.format,
        duration: cloudinaryResult.duration,
        size: cloudinaryResult.bytes,
      },
      originalFilename: originalname,
      mimetype,
      tempo: tempo ? Number(tempo) : undefined,
      timeSignature: timeSignature || '4/4',
      key: key?.trim() || undefined,
      difficulty: difficulty || 'intermediate',
      tags: tagsArray,
      createdBy: req.user._id,
      isActive: true,
    });

    const populated = await ReferenceSong.findById(referenceSong._id)
      .populate('createdBy', 'name email')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Đã tạo bài hát gốc thành công.',
      data: populated,
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo bài hát gốc:', error);
    return next(error);
  }
}

/**
 * Cập nhật thông tin bài hát gốc (chỉ admin)
 */
export async function updateReferenceSong(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      artist,
      tempo,
      timeSignature,
      key,
      difficulty,
      tags,
      isActive,
    } = req.body || {};

    const song = await ReferenceSong.findById(id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài hát gốc.',
      });
    }

    // Cập nhật các trường
    if (title !== undefined) song.title = title.trim();
    if (description !== undefined) song.description = description?.trim() || '';
    if (artist !== undefined) song.artist = artist?.trim() || '';
    if (tempo !== undefined) song.tempo = tempo ? Number(tempo) : undefined;
    if (timeSignature !== undefined) song.timeSignature = timeSignature;
    if (key !== undefined) song.key = key?.trim() || undefined;
    if (difficulty !== undefined) song.difficulty = difficulty;
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

    const populated = await ReferenceSong.findById(song._id)
      .populate('createdBy', 'name email')
      .lean();

    return res.json({
      success: true,
      message: 'Đã cập nhật bài hát gốc thành công.',
      data: populated,
    });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật bài hát gốc:', error);
    return next(error);
  }
}

/**
 * Xóa bài hát gốc (chỉ admin)
 */
export async function deleteReferenceSong(req, res, next) {
  try {
    const { id } = req.params;

    const song = await ReferenceSong.findById(id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài hát gốc.',
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
    await ReferenceSong.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Đã xóa bài hát gốc thành công.',
    });
  } catch (error) {
    console.error('❌ Lỗi khi xóa bài hát gốc:', error);
    return next(error);
  }
}

