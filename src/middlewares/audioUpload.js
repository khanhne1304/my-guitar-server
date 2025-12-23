import multer from 'multer';

const allowedMime = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

function fileFilter(_, file, cb) {
  if (allowedMime.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Định dạng audio không được hỗ trợ.'));
  }
}

const storage = multer.memoryStorage();

export const audioUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

export default audioUpload;

