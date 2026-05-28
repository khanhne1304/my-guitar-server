import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { recognizeChordsFromFile as chordMiniRecognize } from './chordMini.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..', '..');
const tempDir = path.join(serverRoot, 'tmp', 'chord-audio');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Phân tích hợp âm — chỉ qua ChordMini local (Docker :5001).
 * @see CHORDMINI_SETUP.md
 */
export async function analyzeChordsFromFile(audioPath, options = {}) {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`File audio không tồn tại: ${audioPath}`);
  }

  return chordMiniRecognize(audioPath, { model: options.chordMiniModel });
}

export function saveTempAudio(file) {
  const ext = path.extname(file.originalname || '') || '.wav';
  const name = `chord-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dest = path.join(tempDir, name);
  fs.writeFileSync(dest, file.buffer);
  return dest;
}

export function removeTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}
