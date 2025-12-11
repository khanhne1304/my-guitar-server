import fs from 'fs';
import path from 'path';
import { uploadAudioToCloudinary, listAudioFilesFromCloudinary } from '../utils/cloudinary.js';
import {
  sanitizeFeaturePayload,
  scorePracticeWithAI,
  saveAiPracticeResult,
  fetchAiPracticeHistory,
  fetchUserAudioFiles,
  deleteUserAudioFile,
  extractFeaturesFromAudio,
} from '../services/aiPractice.service.js';

export async function scorePracticeClip(req, res, next) {
  try {
    const {
      features,
      metadata = {},
      lessonId,
      lessonTitle,
      level,
      bpm,
      targetBpm,
      practiceDuration,
      saveResult = false,
    } = req.body ?? {};

    if (!features || typeof features !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu features để chấm điểm.',
      });
    }

    const { normalized, missingOrInvalid } = sanitizeFeaturePayload(features);
    if (missingOrInvalid.length) {
      return res.status(400).json({
        success: false,
        message: `Thiếu hoặc sai định dạng các trường: ${missingOrInvalid.join(', ')}`,
      });
    }

    const metaPayload =
      metadata && typeof metadata === 'object'
        ? { ...metadata }
        : {};

    const userMeta = {
      ...metaPayload,
      requestedBy: req.user?._id?.toString() || null,
      requestedAt: new Date().toISOString(),
    };

    const scores = await scorePracticeWithAI(normalized, userMeta);

    let savedEntry = null;
    if (saveResult) {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      savedEntry = await saveAiPracticeResult(userId, {
        lessonId,
        lessonTitle,
        level,
        bpm,
        targetBpm,
        practiceDuration,
        metadata: userMeta,
        features: normalized,
        scores,
      });
    }

    return res.json({
      success: true,
      data: {
        scores,
        features: normalized,
        metadata: userMeta,
        saved: savedEntry
          ? {
              id: savedEntry._id,
              createdAt: savedEntry.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAiPracticeHistory(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { limit, lessonId } = req.query ?? {};
    const result = await fetchAiPracticeHistory(userId, { limit, lessonId });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Lấy danh sách audio files đã upload của user
 */
export async function getUserAudioFiles(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { limit, lessonId, includeMetadata } = req.query ?? {};
    
    console.log(`📋 Lấy danh sách audio cho user ${userId}, limit: ${limit}, lessonId: ${lessonId}`);
    
    const audioFiles = await fetchUserAudioFiles(userId, {
      limit,
      lessonId,
      includeMetadata: includeMetadata === 'true' || includeMetadata === '1',
    });

    console.log(`✅ Tìm thấy ${audioFiles.length} audio files`);

    return res.json({
      success: true,
      data: {
        audios: audioFiles || [],
        count: audioFiles?.length || 0,
      },
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách audio:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách audio',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Lấy danh sách audio files từ Cloudinary (tất cả users)
 * Chỉ dùng cho admin hoặc debug
 */
export async function listCloudinaryAudioFiles(req, res, next) {
  try {
    // Không dùng folder mặc định, lấy tất cả ở root
    const { folder, maxResults = 50, nextCursor } = req.query ?? {};

    console.log(`📋 Lấy danh sách audio từ Cloudinary, folder: ${folder || '(root - tất cả)'}, maxResults: ${maxResults}`);

    const result = await listAudioFilesFromCloudinary(folder || null, {
      maxResults: Number(maxResults) || 50,
      nextCursor,
    });

    // Xử lý trường hợp result.resources không tồn tại hoặc không phải array
    const resources = result?.resources || [];
    
    const audioFiles = resources.map((resource) => ({
      publicId: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      bytes: resource.bytes,
      duration: resource.duration,
      createdAt: resource.created_at,
      folder: resource.folder,
    }));

    console.log(`✅ Trả về ${audioFiles.length} audio files`);

    return res.json({
      success: true,
      data: {
        audios: audioFiles,
        count: audioFiles.length,
        total: result?.total_count || 0,
        nextCursor: result?.next_cursor || null,
      },
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách từ Cloudinary:', {
      message: error.message,
      stack: error.stack,
      http_code: error.http_code,
    });
    return res.status(error.http_code || 500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách audio từ Cloudinary',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Xóa audio file của user
 */
export async function deleteUserAudio(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu audio ID.' });
    }

    console.log(`🗑️ User ${userId} yêu cầu xóa audio ${id}`);

    const result = await deleteUserAudioFile(userId, id);

    console.log(`✅ Đã xóa audio ${id} thành công`);

    return res.json({
      success: true,
      message: 'Đã xóa audio thành công.',
      data: result,
    });
  } catch (error) {
    console.error('❌ Lỗi khi xóa audio:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      audioId: req.params?.id,
    });
    
    if (error.message === 'Không tìm thấy audio hoặc bạn không có quyền xóa.') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa audio',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Phân tích audio chỉ để tính điểm, không upload lên Cloudinary
 */
export async function analyzePracticeAudio(req, res, next) {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Chưa nhận được file audio.',
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Kiểm tra buffer có tồn tại không
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File audio rỗng hoặc không hợp lệ.',
      });
    }

    // Tạo file tạm để extract features (Python script cần file local)
    const tempDir = path.resolve(process.cwd(), 'tmp', 'ai-audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const timestamp = Date.now();
    const safeOriginal = originalname.replace(/\s+/g, '_');
    tempFilePath = path.join(tempDir, `${timestamp}-${safeOriginal}`);

    // Lưu buffer vào file tạm
    try {
      fs.writeFileSync(tempFilePath, buffer);
    } catch (writeError) {
      throw new Error(`Không thể ghi file tạm: ${writeError.message}`);
    }

    // Kiểm tra file đã được tạo thành công và có kích thước > 0
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Không thể tạo file tạm để extract features');
    }
    
    const fileStats = fs.statSync(tempFilePath);
    if (fileStats.size === 0) {
      throw new Error('File tạm rỗng, không thể extract features');
    }

    console.log(`✅ File tạm đã được tạo: ${tempFilePath} (${fileStats.size} bytes)`);

    // Chỉ extract features, không upload lên Cloudinary
    const features = await extractFeaturesFromAudio(tempFilePath);

    const userMeta = {
      requestedBy: req.user?._id?.toString() || null,
      requestedAt: new Date().toISOString(),
      originalFilename: originalname,
      mimetype,
      size,
    };

    const scores = await scorePracticeWithAI(features, userMeta);

    return res.json({
      success: true,
      data: {
        file: {
          originalname,
          mimetype,
          size,
        },
        features,
        scores,
        metadata: userMeta,
        saved: null, // Chưa lưu
      },
    });
  } catch (error) {
    console.error('❌ Lỗi trong analyzePracticeAudio:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return next(error);
  } finally {
    // Xóa file tạm sau khi xong
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('Lỗi khi xóa file tạm:', err);
      }
    }
  }
}

/**
 * Upload audio lên Cloudinary và lưu kết quả vào database
 */
export async function uploadPracticeAudio(req, res, next) {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Chưa nhận được file audio.',
      });
    }

    const {
      lessonId,
      lessonTitle,
      level,
      bpm,
      targetBpm,
      practiceDuration,
    } = req.body ?? {};

    const { buffer, originalname, mimetype, size } = req.file;

    // Kiểm tra buffer có tồn tại không
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File audio rỗng hoặc không hợp lệ.',
      });
    }

    // Tạo file tạm để extract features (Python script cần file local)
    const tempDir = path.resolve(process.cwd(), 'tmp', 'ai-audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const timestamp = Date.now();
    const safeOriginal = originalname.replace(/\s+/g, '_');
    tempFilePath = path.join(tempDir, `${timestamp}-${safeOriginal}`);

    // Lưu buffer vào file tạm
    try {
      fs.writeFileSync(tempFilePath, buffer);
    } catch (writeError) {
      throw new Error(`Không thể ghi file tạm: ${writeError.message}`);
    }

    // Kiểm tra file đã được tạo thành công và có kích thước > 0
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Không thể tạo file tạm để extract features');
    }
    
    const fileStats = fs.statSync(tempFilePath);
    if (fileStats.size === 0) {
      throw new Error('File tạm rỗng, không thể extract features');
    }

    console.log(`✅ File tạm đã được tạo: ${tempFilePath} (${fileStats.size} bytes)`);

    // Upload lên Cloudinary và extract features song song để tối ưu
    let cloudinaryResult, features;
    try {
      [cloudinaryResult, features] = await Promise.all([
        uploadAudioToCloudinary(buffer, originalname).catch((err) => {
          console.error('❌ Lỗi Cloudinary upload:', {
            message: err.message,
            http_code: err.http_code,
            name: err.name,
            error: err,
          });
          const errorMsg = err.message || err.toString() || 'Unknown error';
          throw new Error(`Lỗi upload Cloudinary: ${errorMsg}`);
        }),
        extractFeaturesFromAudio(tempFilePath).catch((err) => {
          console.error('❌ Lỗi extract features:', {
            message: err.message,
            filePath: tempFilePath,
            fileExists: fs.existsSync(tempFilePath),
            fileSize: fs.existsSync(tempFilePath) ? fs.statSync(tempFilePath).size : 0,
          });
          throw new Error(`Lỗi extract features: ${err.message || err.toString()}`);
        }),
      ]);
    } catch (uploadError) {
      console.error('❌ Lỗi khi upload hoặc extract features:', uploadError);
      throw uploadError;
    }

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      throw new Error('Cloudinary upload không trả về URL hợp lệ');
    }

    const cloudinaryUrl = cloudinaryResult.secure_url;
    const cloudinaryPublicId = cloudinaryResult.public_id;

    const userMeta = {
      requestedBy: req.user?._id?.toString() || null,
      requestedAt: new Date().toISOString(),
      audioFile: cloudinaryPublicId,
      cloudinaryUrl,
      cloudinaryPublicId,
      originalFilename: originalname,
      mimetype,
      size,
    };

    const scores = await scorePracticeWithAI(features, userMeta);

    // Luôn lưu vào database khi upload (vì đã upload lên Cloudinary)
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const savedEntry = await saveAiPracticeResult(userId, {
      lessonId,
      lessonTitle,
      level,
      bpm: bpm ? Number(bpm) : undefined,
      targetBpm: targetBpm ? Number(targetBpm) : undefined,
      practiceDuration: practiceDuration ? Number(practiceDuration) : undefined,
      metadata: userMeta,
      features,
      scores,
    });

    return res.json({
      success: true,
      data: {
        file: {
          originalname,
          mimetype,
          size,
          cloudinaryUrl,
          cloudinaryPublicId,
        },
        features,
        scores,
        metadata: userMeta,
        saved: {
          id: savedEntry._id,
          createdAt: savedEntry.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('❌ Lỗi trong uploadPracticeAudio:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return next(error);
  } finally {
    // Xóa file tạm sau khi xong
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('Lỗi khi xóa file tạm:', err);
      }
    }
  }
}

