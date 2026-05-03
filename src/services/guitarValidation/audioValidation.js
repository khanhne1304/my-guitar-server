import { textMatchesGuitarKeywords } from './textValidation.js';

/**
 * Audio attachments: require thread to have tags + description fields passing keyword check.
 */
export function validateAudioAttachmentRules({ title, content, tags = [] }) {
  const tagArr = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  if (tagArr.length === 0) {
    return {
      ok: false,
      code: 'AUDIO_TAGS',
      message: 'Bài có file âm thanh: vui lòng thêm ít nhất một tag (ví dụ: fingerstyle, tab, acoustic).',
    };
  }

  const descBlob = `${title || ''} ${content || ''}`;
  if (!String(content || '').trim()) {
    return {
      ok: false,
      code: 'AUDIO_DESC',
      message: 'Bài có file âm thanh: phần mô tả (content) không được để trống.',
    };
  }

  if (!textMatchesGuitarKeywords(title, content, tagArr)) {
    return {
      ok: false,
      code: 'AUDIO_KEYWORDS',
      message:
        'Bài có file âm thanh: tiêu đề, mô tả hoặc tag phải chứa từ khóa liên quan guitar (guitar, chord, tab, fingerstyle, hợp âm…).',
    };
  }

  return { ok: true };
}
