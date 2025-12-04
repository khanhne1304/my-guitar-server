import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

/**
 * Cấu hình lại Cloudinary từ environment variables
 * Gọi hàm này mỗi lần upload để đảm bảo biến môi trường được load đúng
 */
function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary chưa được cấu hình. Vui lòng thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, và CLOUDINARY_API_SECRET vào file .env'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

// KHÔNG gọi configureCloudinary() ở đây vì dotenv.config() chưa chạy
// Sẽ được gọi trong hàm uploadAudioToCloudinary()

/**
 * Kiểm tra xem Cloudinary đã được cấu hình chưa
 */
function validateCloudinaryConfig() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary chưa được cấu hình. Vui lòng thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, và CLOUDINARY_API_SECRET vào file .env'
    );
  }
}

/**
 * Upload file buffer lên Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} originalname - Tên file gốc
 * @param {string} folder - Thư mục trên Cloudinary (mặc định: 'ai-audio')
 * @returns {Promise<Object>} Kết quả upload từ Cloudinary
 */
export async function uploadAudioToCloudinary(buffer, originalname, folder = 'ai-audio') {
  // Config lại mỗi lần upload để đảm bảo biến môi trường được load đúng
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const safeOriginal = originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    // Bỏ extension từ tên file
    const nameWithoutExt = safeOriginal.replace(/\.[^/.]+$/, '');
    const publicId = `${folder}/${timestamp}-${nameWithoutExt}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Cloudinary dùng 'video' cho audio files
        public_id: publicId, // public_id đã bao gồm folder
        // Không set format, để Cloudinary tự động detect từ file
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Upload thất bại: không nhận được kết quả từ Cloudinary'));
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Xóa file từ Cloudinary
 * @param {string} publicId - Public ID của file trên Cloudinary
 * @returns {Promise<Object>} Kết quả xóa
 */
export async function deleteAudioFromCloudinary(publicId) {
  validateCloudinaryConfig();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'video',
  });
}

/**
 * Lấy URL của file từ Cloudinary
 * @param {string} publicId - Public ID của file
 * @param {Object} options - Tùy chọn transform
 * @returns {string} URL của file
 */
export function getCloudinaryUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    ...options,
  });
}

/**
 * Lấy danh sách file audio từ Cloudinary folder
 * @param {string} folder - Thư mục trên Cloudinary (mặc định: 'ai-audio')
 * @param {Object} options - Tùy chọn: maxResults, nextCursor
 * @returns {Promise<Object>} Danh sách files và pagination info
 */
export async function listAudioFilesFromCloudinary(folder = 'ai-audio', options = {}) {
  configureCloudinary();

  const { maxResults = 50, nextCursor } = options;

  return new Promise((resolve, reject) => {
    cloudinary.api.resources(
      {
        type: 'upload',
        resource_type: 'video',
        prefix: folder,
        max_results: maxResults,
        next_cursor: nextCursor,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
}

export default cloudinary;

