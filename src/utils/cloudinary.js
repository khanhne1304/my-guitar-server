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
 * @param {string} folder - Thư mục trên Cloudinary (không dùng folder mặc định, để null/undefined để lưu ở root)
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
    // Lưu trực tiếp ở root, không dùng folder
    const publicId = folder ? `${folder}/${timestamp}-${nameWithoutExt}` : `${timestamp}-${nameWithoutExt}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Cloudinary dùng 'video' cho audio files
        public_id: publicId, // public_id không có folder
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

/**
 * Lấy danh sách file audio từ Cloudinary
 * @param {string} folder - Thư mục trên Cloudinary (mặc định: null - lấy tất cả ở root)
 * @param {Object} options - Tùy chọn: maxResults, nextCursor
 * @returns {Promise<Object>} Danh sách files và pagination info
 */
export async function listAudioFilesFromCloudinary(folder = null, options = {}) {
  configureCloudinary();

  const { maxResults = 50, nextCursor } = options;
  
  // Nếu không có folder, lấy tất cả files ở root
  let prefix = undefined;
  if (folder && folder.trim() !== '') {
    prefix = folder.endsWith('/') ? folder : `${folder}/`;
  }

  console.log(`🔍 Lấy danh sách audio từ Cloudinary: ${prefix || '(root - tất cả)'}, maxResults: ${maxResults}`);

  return new Promise((resolve, reject) => {
    const apiOptions = {
      type: 'upload',
      resource_type: 'video',
      max_results: maxResults,
    };
    
    // Chỉ thêm prefix nếu có
    if (prefix) {
      apiOptions.prefix = prefix;
    }
    
    // Chỉ thêm next_cursor nếu có
    if (nextCursor) {
      apiOptions.next_cursor = nextCursor;
    }
    
    cloudinary.api.resources(
      apiOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Lỗi Cloudinary API:', {
            message: error.message,
            http_code: error.http_code,
            name: error.name,
          });
          return reject(error);
        }
        
        // Đảm bảo result có cấu trúc đúng
        if (!result) {
          console.warn('⚠️ Cloudinary API trả về null/undefined');
          return resolve({
            resources: [],
            total_count: 0,
            next_cursor: null,
          });
        }
        
        // Đảm bảo resources là một array
        if (!Array.isArray(result.resources)) {
          console.warn('⚠️ result.resources không phải là array:', typeof result.resources);
          result.resources = [];
        }
        
        console.log(`✅ Tìm thấy ${result.resources?.length || 0} files trong folder ${prefix}`);
        resolve(result);
      }
    );
  });
}

/**
 * Kiểm tra file có tồn tại trên Cloudinary không
 * @param {string} publicId - Public ID của file
 * @returns {Promise<boolean>} true nếu file tồn tại, false nếu không
 */
export async function checkCloudinaryFileExists(publicId) {
  if (!publicId) return false;
  
  configureCloudinary();
  
  return new Promise((resolve) => {
    cloudinary.api.resource(publicId, {
      resource_type: 'video',
    }, (error, result) => {
      if (error) {
        // File không tồn tại hoặc đã bị xóa
        if (error.http_code === 404) {
          console.log(`⚠️ File không tồn tại trên Cloudinary: ${publicId}`);
          return resolve(false);
        }
        // Lỗi khác
        console.error(`❌ Lỗi khi kiểm tra file Cloudinary ${publicId}:`, error.message);
        return resolve(false);
      }
      // File tồn tại
      resolve(!!result);
    });
  });
}

export default cloudinary;

