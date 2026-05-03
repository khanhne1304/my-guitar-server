import { classifyImageBuffer, MSG_IMAGE_NOT_GUITAR } from '../services/guitarValidation/imageVisionValidation.js';
import { textMatchesGuitarKeywords } from '../services/guitarValidation/textValidation.js';

/**
 * Post-multer: classify images with Vision when configured.
 * - not_guitar → 400 (friendly message only)
 * - guitar / indeterminate → allow; set req.forumUploadPendingReview for UX hint on indeterminate
 *
 * Audio/PDF: filename keyword check unchanged.
 */
export async function validateImageContent(req, res, next) {
  try {
    const file = req.file;
    if (!file) return next();

    const mt = String(file.mimetype || '').toLowerCase();
    const name = String(file.originalname || '');
    req.forumUploadPendingReview = false;

    if (mt.startsWith('image/')) {
      const c = await classifyImageBuffer(file.buffer);
      if (c.outcome === 'not_guitar') {
        return res.status(400).json({
          message: MSG_IMAGE_NOT_GUITAR,
          code: 'IMAGE_NOT_GUITAR',
        });
      }
      if (c.outcome === 'indeterminate') {
        req.forumUploadPendingReview = true;
      }
      return next();
    }

    if (mt.startsWith('audio/')) {
      if (!textMatchesGuitarKeywords(name)) {
        return res.status(400).json({
          message:
            'Tên file âm thanh phải chứa ít nhất một từ khóa liên quan guitar (guitar, chord, tab, fingerstyle, hợp âm…). Khi đăng bài cần thêm mô tả và tag.',
          code: 'UPLOAD_AUDIO_NAME',
        });
      }
      return next();
    }

    if (mt === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      if (!textMatchesGuitarKeywords(name)) {
        return res.status(400).json({
          message:
            'Tên file PDF cần chứa từ khóa liên quan guitar (guitar, chord, tab, fingerstyle, hợp âm…).',
          code: 'UPLOAD_PDF_NAME',
        });
      }
      return next();
    }

    return next();
  } catch (e) {
    next(e);
  }
}
