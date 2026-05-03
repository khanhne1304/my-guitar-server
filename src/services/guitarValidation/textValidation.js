import { TEXT_GUITAR_KEYWORDS } from './constants.js';

/**
 * Returns true if combined text contains at least one guitar keyword.
 */
export function textMatchesGuitarKeywords(...parts) {
  const blob = parts
    .flat()
    .map((p) => String(p ?? ''))
    .join(' ')
    .toLowerCase();
  return TEXT_GUITAR_KEYWORDS.some((k) => blob.includes(String(k).toLowerCase()));
}

export function validateTextGuitarContent(title, content) {
  const combined = `${title || ''} ${content || ''}`;
  if (!combined.trim()) {
    return { ok: false, code: 'TEXT_EMPTY', message: 'Tiêu đề và nội dung không được để trống.' };
  }
  if (!textMatchesGuitarKeywords(title, content)) {
    return {
      ok: false,
      code: 'TEXT_KEYWORDS',
      message:
        'Nội dung chưa thể hiện chủ đề guitar. Hãy dùng ít nhất một từ khóa liên quan: guitar, chord, tab, fingerstyle, hợp âm (hoặc ngữ cảnh tương đương).',
    };
  }
  return { ok: true };
}
