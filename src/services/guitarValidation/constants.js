/**
 * Keyword sets for guitar-related content validation.
 * TEXT (required): at least one match in title + content (case-insensitive).
 */
export const TEXT_GUITAR_KEYWORDS = [
  'guitar',
  'chord',
  'tab',
  'fingerstyle',
  'hợp âm',
  // Giữ tương thích nội dung tiếng Việt / thuật ngữ phổ biến đã dùng trong forum cũ
  'đàn',
  'strumming',
  'scale',
];

/** Labels accepted from Vision API (substring match, lowercased) */
export const VISION_ACCEPT_LABEL_SUBSTRINGS = ['guitar', 'instrument'];

/** YouTube snippet must mention guitar (substring) */
export const YOUTUBE_GUITAR_MARKERS = ['guitar', 'guitarra'];
