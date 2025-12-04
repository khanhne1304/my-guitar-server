import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = path.resolve(process.cwd(), 'tmp', 'ai-audio');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const timestamp = Date.now();
    const safeOriginal = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}-${safeOriginal}`);
  },
});

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

export const audioUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

export default audioUpload;

