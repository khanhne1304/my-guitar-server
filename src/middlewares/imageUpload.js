import multer from 'multer';

const allowedMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function fileFilter(_, file, cb) {
  if (allowedMime.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Định dạng ảnh không được hỗ trợ.'));
  }
}

const storage = multer.memoryStorage();

export const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export default imageUpload;

