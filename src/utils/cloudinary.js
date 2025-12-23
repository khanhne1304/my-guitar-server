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
 * Upload file buffer lên Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} originalname - Tên file gốc
 * @param {string} folder - Thư mục trên Cloudinary (ví dụ: "ref", "user"). 
 *                          Folder sẽ được tạo tự động nếu chưa tồn tại.
 *                          Để null/undefined để lưu ở root.
 * @returns {Promise<Object>} Kết quả upload từ Cloudinary
 */
export async function uploadAudioToCloudinary(buffer, originalname, folder = null) {
  // Config lại mỗi lần upload để đảm bảo biến môi trường được load đúng
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const safeOriginal = originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    // Bỏ extension từ tên file
    const nameWithoutExt = safeOriginal.replace(/\.[^/.]+$/, '');
    // Tạo public_id không chứa folder (folder sẽ được set riêng)
    const publicId = `${timestamp}-${nameWithoutExt}`;

    console.log(`📤 Đang upload file lên Cloudinary: ${publicId} (folder: ${folder || 'root'})`);

    // Tạo upload options
    const uploadOptions = {
      resource_type: 'video', // Cloudinary dùng 'video' cho audio files
      public_id: publicId,
      overwrite: false,
    };

    // Thêm folder option nếu có
    if (folder && folder.trim() !== '') {
      uploadOptions.folder = folder.trim();
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error(`❌ Lỗi khi upload file ${publicId}:`, error.message);
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Upload thất bại: không nhận được kết quả từ Cloudinary'));
        }
        console.log(`✅ Upload thành công: ${result.public_id} (${result.bytes} bytes)`);
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
  configureCloudinary();
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
    }, (error, result) => {
      if (error) {
        console.error('❌ Lỗi khi xóa file từ Cloudinary:', {
          publicId,
          message: error.message,
          http_code: error.http_code,
        });
        return reject(error);
      }
      console.log(`✅ Đã xóa file từ Cloudinary: ${publicId}`, result);
      resolve(result);
    });
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

export default cloudinary;

