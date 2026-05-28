import multer from 'multer';

const allowedMime = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
]);

function fileFilter(_, file, cb) {
  if (allowedMime.has(file.mimetype)) return cb(null, true);
  const err = new Error('File không hợp lệ');
  err.statusCode = 400;
  return cb(err);
}

const storage = multer.memoryStorage();

export const forumUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

