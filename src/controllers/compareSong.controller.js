import fs from 'fs';
import path from 'path';
import { compareUserAudioWithReference, compareTwoSongs } from '../services/compareSong.service.js';
import { uploadAudioToCloudinary } from '../utils/cloudinary.js';
import UserSong from '../models/UserSong.js';
import ReferenceSong from '../models/ReferenceSong.js';

/**
 * So sánh audio của user với bài hát gốc
 * POST /api/compare/audio
 * Body: multipart/form-data
 *   - audio: file audio của user
 *   - referenceSongId: ID của bài hát gốc
 *   - saveToCloud: (optional) "true"/true/"1" nếu muốn lưu file lên Cloudinary folder "user"
 */
export async function compareAudio(req, res, next) {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Chưa nhận được file audio.',
      });
    }

    const { referenceSongId } = req.body || {};
    if (!referenceSongId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu ID bài hát gốc (referenceSongId).',
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

    // Tạo file tạm để so sánh
    const tempDir = path.resolve(process.cwd(), 'tmp', 'compare-audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const timestamp = Date.now();
    const safeOriginal = originalname.replace(/\s+/g, '_');
    tempFilePath = path.join(tempDir, `user_${timestamp}_${safeOriginal}`);

    // Lưu buffer vào file tạm
    try {
      fs.writeFileSync(tempFilePath, buffer);
    } catch (writeError) {
      throw new Error(`Không thể ghi file tạm: ${writeError.message}`);
    }

    // Kiểm tra file đã được tạo thành công
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Không thể tạo file tạm để so sánh');
    }

    const fileStats = fs.statSync(tempFilePath);
    if (fileStats.size === 0) {
      throw new Error('File tạm rỗng, không thể so sánh');
    }

    console.log(`✅ File tạm đã được tạo: ${tempFilePath} (${fileStats.size} bytes)`);

    // Kiểm tra xem user có muốn lưu file lên Cloudinary không
    const saveToCloud = req.body.saveToCloud === 'true' || req.body.saveToCloud === true || req.body.saveToCloud === '1';

    // Upload bản thu của user lên Cloudinary (folder "user") nếu user muốn lưu
    let cloudinaryResult = null;
    if (saveToCloud) {
      try {
        cloudinaryResult = await uploadAudioToCloudinary(
          buffer,
          originalname,
          'user' // Folder trên Cloudinary
        );
        console.log(`✅ Đã upload bản thu của user lên Cloudinary: ${cloudinaryResult.public_id}`);
      } catch (uploadError) {
        console.error('⚠️ Lỗi khi upload bản thu của user lên Cloudinary (tiếp tục so sánh):', uploadError);
        // Tiếp tục so sánh dù upload thất bại
      }
    } else {
      console.log('ℹ️ User không muốn lưu file lên Cloudinary, chỉ so sánh');
    }

    // Lấy options từ query hoặc body
    const options = {
      hop: req.body.hop ? parseInt(req.body.hop) : undefined,
      delta: req.body.delta ? parseFloat(req.body.delta) : undefined,
      match_window: req.body.match_window ? parseFloat(req.body.match_window) : undefined,
      sr: req.body.sr || undefined,
    };

    // So sánh audio
    const result = await compareUserAudioWithReference(referenceSongId, tempFilePath, options);

    // Lưu bài hát vào database nếu user muốn lưu và đã upload lên Cloudinary thành công
    let savedUserSong = null;
    if (saveToCloud && cloudinaryResult) {
      try {
        // Lấy thông tin bài hát gốc để làm title mặc định
        const referenceSong = await ReferenceSong.findById(referenceSongId).lean();
        const defaultTitle = referenceSong 
          ? `Bản thu - ${referenceSong.title}`
          : `Bản thu - ${originalname.replace(/\.[^/.]+$/, '')}`;

        savedUserSong = await UserSong.create({
          title: defaultTitle,
          description: `Bản thu so sánh với bài hát gốc`,
          audioFile: {
            publicId: cloudinaryResult.public_id,
            url: cloudinaryResult.secure_url,
            format: cloudinaryResult.format,
            duration: cloudinaryResult.duration,
            size: cloudinaryResult.bytes,
          },
          originalFilename: originalname,
          mimetype: mimetype,
          createdBy: req.user._id,
          referenceSongId: referenceSongId,
          lastComparisonResult: result,
          comparisonCount: 1,
          isActive: true,
        });

        console.log(`✅ Đã lưu bài hát của user vào database: ${savedUserSong._id}`);
      } catch (saveError) {
        console.error('⚠️ Lỗi khi lưu bài hát vào database (tiếp tục trả về kết quả):', saveError);
        // Tiếp tục trả về kết quả dù lưu database thất bại
      }
    }

    const userMeta = {
      requestedBy: req.user?._id?.toString() || null,
      requestedAt: new Date().toISOString(),
      originalFilename: originalname,
      mimetype,
      size,
      cloudinary: cloudinaryResult ? {
        publicId: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
      } : null,
      savedUserSongId: savedUserSong?._id?.toString() || null,
    };

    return res.json({
      success: true,
      data: {
        file: {
          originalname,
          mimetype,
          size,
        },
        comparison: result,
        metadata: userMeta,
        savedUserSong: savedUserSong ? {
          id: savedUserSong._id,
          title: savedUserSong.title,
        } : null,
      },
    });
  } catch (error) {
    console.error('❌ Lỗi trong compareAudio:', {
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
 * So sánh hai file audio trực tiếp
 * POST /api/compare/two-songs
 * Body: multipart/form-data
 *   - audio1: file audio thứ nhất
 *   - audio2: file audio thứ hai (hoặc referenceSongId để dùng bài hát gốc)
 *   - referenceSongId: (optional) ID của bài hát gốc thay cho audio2
 */
export async function compareTwoSongsAudio(req, res, next) {
  let tempFilePath1 = null;
  let tempFilePath2 = null;
  try {
    // Kiểm tra file audio1
    if (!req.files || !req.files.audio1 || !Array.isArray(req.files.audio1) || req.files.audio1.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Chưa nhận được file audio thứ nhất (audio1).',
      });
    }

    const audio1 = req.files.audio1[0];
    const { referenceSongId } = req.body || {};

    // Kiểm tra buffer audio1
    if (!audio1.buffer || audio1.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File audio1 rỗng hoặc không hợp lệ.',
      });
    }

    // Tạo thư mục temp
    const tempDir = path.resolve(process.cwd(), 'tmp', 'compare-audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const timestamp = Date.now();

    // Lưu file audio1
    const safeOriginal1 = audio1.originalname.replace(/\s+/g, '_');
    tempFilePath1 = path.join(tempDir, `audio1_${timestamp}_${safeOriginal1}`);
    try {
      fs.writeFileSync(tempFilePath1, audio1.buffer);
    } catch (writeError) {
      throw new Error(`Không thể ghi file audio1: ${writeError.message}`);
    }

    if (!fs.existsSync(tempFilePath1) || fs.statSync(tempFilePath1).size === 0) {
      throw new Error('File audio1 rỗng hoặc không hợp lệ.');
    }

    // Xử lý audio2: có thể là file upload hoặc reference song
    if (referenceSongId) {
      // Kiểm tra xem user có muốn lưu file lên Cloudinary không
      const saveToCloud = req.body.saveToCloud === 'true' || req.body.saveToCloud === true || req.body.saveToCloud === '1';

      // Upload bản thu của user (audio1) lên Cloudinary (folder "user") nếu user muốn lưu
      let cloudinaryResult = null;
      if (saveToCloud) {
        try {
          cloudinaryResult = await uploadAudioToCloudinary(
            audio1.buffer,
            audio1.originalname,
            'user' // Folder trên Cloudinary
          );
          console.log(`✅ Đã upload bản thu của user lên Cloudinary: ${cloudinaryResult.public_id}`);
        } catch (uploadError) {
          console.error('⚠️ Lỗi khi upload bản thu của user lên Cloudinary (tiếp tục so sánh):', uploadError);
          // Tiếp tục so sánh dù upload thất bại
        }
      } else {
        console.log('ℹ️ User không muốn lưu file lên Cloudinary, chỉ so sánh');
      }

      // Sử dụng reference song
      const result = await compareUserAudioWithReference(referenceSongId, tempFilePath1, {
        hop: req.body.hop ? parseInt(req.body.hop) : undefined,
        delta: req.body.delta ? parseFloat(req.body.delta) : undefined,
        match_window: req.body.match_window ? parseFloat(req.body.match_window) : undefined,
        sr: req.body.sr || undefined,
      });

      // Lưu bài hát vào database nếu user muốn lưu và đã upload lên Cloudinary thành công
      let savedUserSong = null;
      if (saveToCloud && cloudinaryResult) {
        try {
          // Lấy thông tin bài hát gốc để làm title mặc định
          const referenceSong = await ReferenceSong.findById(referenceSongId).lean();
          const defaultTitle = referenceSong 
            ? `Bản thu - ${referenceSong.title}`
            : `Bản thu - ${audio1.originalname.replace(/\.[^/.]+$/, '')}`;

          savedUserSong = await UserSong.create({
            title: defaultTitle,
            description: `Bản thu so sánh với bài hát gốc`,
            audioFile: {
              publicId: cloudinaryResult.public_id,
              url: cloudinaryResult.secure_url,
              format: cloudinaryResult.format,
              duration: cloudinaryResult.duration,
              size: cloudinaryResult.bytes,
            },
            originalFilename: audio1.originalname,
            mimetype: audio1.mimetype,
            createdBy: req.user._id,
            referenceSongId: referenceSongId,
            lastComparisonResult: result,
            comparisonCount: 1,
            isActive: true,
          });

          console.log(`✅ Đã lưu bài hát của user vào database: ${savedUserSong._id}`);
        } catch (saveError) {
          console.error('⚠️ Lỗi khi lưu bài hát vào database (tiếp tục trả về kết quả):', saveError);
          // Tiếp tục trả về kết quả dù lưu database thất bại
        }
      }

      return res.json({
        success: true,
        data: {
          file1: {
            originalname: audio1.originalname,
            mimetype: audio1.mimetype,
            size: audio1.size,
            cloudinary: cloudinaryResult ? {
              publicId: cloudinaryResult.public_id,
              url: cloudinaryResult.secure_url,
            } : null,
          },
          file2: {
            type: 'reference_song',
            referenceSongId,
          },
          comparison: result,
          savedUserSong: savedUserSong ? {
            id: savedUserSong._id,
            title: savedUserSong.title,
          } : null,
        },
      });
    } else {
      // Kiểm tra file audio2
      if (!req.files || !req.files.audio2 || !Array.isArray(req.files.audio2) || req.files.audio2.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Chưa nhận được file audio thứ hai (audio2) hoặc referenceSongId.',
        });
      }

      const audio2 = req.files.audio2[0];

      if (!audio2.buffer || audio2.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'File audio2 rỗng hoặc không hợp lệ.',
        });
      }

      // Lưu file audio2
      const safeOriginal2 = audio2.originalname.replace(/\s+/g, '_');
      tempFilePath2 = path.join(tempDir, `audio2_${timestamp}_${safeOriginal2}`);
      try {
        fs.writeFileSync(tempFilePath2, audio2.buffer);
      } catch (writeError) {
        throw new Error(`Không thể ghi file audio2: ${writeError.message}`);
      }

      if (!fs.existsSync(tempFilePath2) || fs.statSync(tempFilePath2).size === 0) {
        throw new Error('File audio2 rỗng hoặc không hợp lệ.');
      }

      // So sánh hai file
      const options = {
        hop: req.body.hop ? parseInt(req.body.hop) : undefined,
        delta: req.body.delta ? parseFloat(req.body.delta) : undefined,
        match_window: req.body.match_window ? parseFloat(req.body.match_window) : undefined,
        sr: req.body.sr || undefined,
      };

      const result = await compareTwoSongs(tempFilePath1, tempFilePath2, options);

      return res.json({
        success: true,
        data: {
          file1: {
            originalname: audio1.originalname,
            mimetype: audio1.mimetype,
            size: audio1.size,
          },
          file2: {
            originalname: audio2.originalname,
            mimetype: audio2.mimetype,
            size: audio2.size,
          },
          comparison: result,
        },
      });
    }
  } catch (error) {
    console.error('❌ Lỗi trong compareTwoSongsAudio:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return next(error);
  } finally {
    // Xóa file tạm sau khi xong
    [tempFilePath1, tempFilePath2].forEach((filePath) => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Lỗi khi xóa file tạm:', err);
        }
      }
    });
  }
}

