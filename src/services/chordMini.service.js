/**
 * ChordMini API — https://www.chordmini.me/docs
 * POST /api/recognize-chords (multipart: file, model)
 */
import fs from 'fs';
import path from 'path';
import { Blob } from 'buffer';

/** Cloud (chordmini.me) yêu cầu Firebase App Check — không gọi được từ server Node. */
const LOCAL_BASE_URL = 'http://localhost:5001';
const DEFAULT_MODEL = 'chord-cnn-lstm';

export function isAppCheckTokenError(message) {
  return /missing app check token/i.test(String(message || ''));
}

const MIME_BY_EXT = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
};

function getBaseUrl() {
  const configured = process.env.CHORDMINI_API_URL?.replace(/\/$/, '');
  if (configured) return configured;
  // Mặc định local — cloud cần App Check token (chỉ có trên web ChordMini)
  return LOCAL_BASE_URL;
}

function getModel() {
  return process.env.CHORDMINI_MODEL || DEFAULT_MODEL;
}

/** Chuyển nhãn ChordMini (C:maj, A:min, N) → ký hiệu HopAmChuan (C, Am). */
export function normalizeChordMiniLabel(raw) {
  let c = String(raw || '').trim();
  if (!c || /^N$/i.test(c) || /^no[_-]?chord$/i.test(c) || c === 'X') {
    return null;
  }

  if (c.includes('/')) {
    c = c.split('/')[0].trim();
  }

  if (c.includes(':')) {
    const [root, qual = ''] = c.split(':');
    const q = qual.toLowerCase();
    if (q === 'maj' || q === 'major' || q === '') return root;
    if (q === 'min' || q === 'minor') return `${root}m`;
    if (q === '7') return `${root}7`;
    if (q === 'maj7' || q === 'major7') return `${root}maj7`;
    if (q === 'min7' || q === 'minor7') return `${root}m7`;
    return `${root}${qual}`;
  }

  // Abmaj, C#maj3 → Ab, C#
  c = c.replace(/maj\d*$/i, '').replace(/min\d*$/i, 'm').replace(/major$/i, '').trim();

  return c;
}

function guessMime(filePath) {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function extractChordList(data) {
  if (Array.isArray(data?.chords)) return data.chords;
  if (Array.isArray(data?.results?.chords)) return data.results.chords;
  if (Array.isArray(data?.data?.chords)) return data.data.chords;
  return [];
}

function chordLabel(entry) {
  return entry?.chord ?? entry?.label ?? entry?.chord_label ?? entry?.name ?? '';
}

function chordTime(entry) {
  const t = entry?.time ?? entry?.start ?? entry?.start_time ?? 0;
  return Number(t) || 0;
}

function chordEnd(entry) {
  const e = entry?.end ?? entry?.end_time;
  return e != null ? Number(e) : null;
}

function chordConfidence(entry) {
  const c = entry?.confidence ?? entry?.prob ?? entry?.probability;
  return c != null ? Number(c) : 0.5;
}

/**
 * Gọi ChordMini recognize-chords.
 * @param {string} audioPath
 * @param {{ model?: string }} options
 */
export async function recognizeChordsFromFile(audioPath, options = {}) {
  const baseUrl = getBaseUrl();
  const model = options.model || getModel();
  const buffer = fs.readFileSync(audioPath);
  const filename = path.basename(audioPath) || 'audio.mp3';
  const mime = guessMime(audioPath);

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mime }), filename);
  formData.append('model', model);

  const url = `${baseUrl}/api/recognize-chords`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    throw new Error(
      `Không kết nối được ChordMini (${baseUrl}). ` +
        `Chạy local: http://localhost:5001 hoặc kiểm tra mạng. Chi tiết: ${err.message}`,
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    throw new Error(`ChordMini trả về không phải JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (res.status === 429) {
    throw new Error(
      'ChordMini giới hạn 2 lần/phút cho nhận diện hợp âm. Vui lòng đợi hoặc chạy ChordMini local (localhost:5001).',
    );
  }

  if (!res.ok || data?.success === false) {
    const msg =
      data?.error ||
      data?.message ||
      data?.detail ||
      `ChordMini API lỗi HTTP ${res.status}`;

    if (isAppCheckTokenError(msg)) {
      const err = new Error(
        'API cloud ChordMini (chordmini.me) yêu cầu Firebase App Check — không gọi được từ server backend. ' +
          'Cách xử lý: đặt CHORDMINI_API_URL=http://localhost:5001 và chạy ChordMini local (Docker).',
      );
      err.code = 'CHORDMINI_APP_CHECK';
      throw err;
    }
    throw new Error(msg);
  }

  const rawChords = extractChordList(data);
  const sorted = [...rawChords].sort((a, b) => chordTime(a) - chordTime(b));

  const predicted = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const entry = sorted[i];
    const label = normalizeChordMiniLabel(chordLabel(entry));
    if (!label) continue;

    const start = chordTime(entry);
    const explicitEnd = chordEnd(entry);
    const nextStart = i + 1 < sorted.length ? chordTime(sorted[i + 1]) : null;
    const duration =
      explicitEnd != null && explicitEnd > start
        ? explicitEnd - start
        : nextStart != null && nextStart > start
          ? nextStart - start
          : 2;

    predicted.push({
      time: Math.round(start * 1000) / 1000,
      duration: Math.round(duration * 1000) / 1000,
      predicted_chord: label,
      confidence: Math.round(chordConfidence(entry) * 1000) / 1000,
    });
  }

  const confidences = predicted.map((p) => p.confidence);
  const meanConf =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  return {
    predicted_chords: predicted,
    metrics: {
      n_chord_segments: predicted.length,
      mean_chord_confidence: Math.round(meanConf * 1000) / 1000,
    },
    processing_info: {
      engine: 'chordmini',
      api_url: baseUrl,
      model: data?.model_used || data?.model || model,
    },
  };
}

/**
 * POST /api/detect-beats — BPM từ audio (ChordMini local).
 */
export async function detectBeatsFromFile(audioPath, options = {}) {
  const baseUrl = getBaseUrl();
  const detector = options.detector || process.env.CHORDMINI_BEAT_DETECTOR || 'madmom';
  const buffer = fs.readFileSync(audioPath);
  const filename = path.basename(audioPath) || 'audio.mp3';
  const mime = guessMime(audioPath);

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mime }), filename);
  formData.append('detector', detector);

  const url = `${baseUrl}/api/detect-beats`;
  let res;
  try {
    res = await fetch(url, { method: 'POST', body: formData });
  } catch (err) {
    throw new Error(
      `Không kết nối ChordMini beat API (${baseUrl}). Chi tiết: ${err.message}`,
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    throw new Error(`ChordMini beats: không phải JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || `Beat detection HTTP ${res.status}`);
  }

  const bpm = Number(data.bpm ?? data.tempo);
  return {
    bpm: Number.isFinite(bpm) && bpm > 0 ? bpm : null,
    beats: data.beats || [],
    downbeats: data.downbeats || [],
    model_used: data.model_used || detector,
    processing_info: { engine: 'chordmini', api_url: baseUrl, endpoint: 'detect-beats' },
  };
}

export async function checkChordMiniHealth() {
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/model-info`);
    if (!res.ok) return { ok: false, baseUrl, status: res.status };
    const data = await res.json();
    return { ok: data?.success !== false, baseUrl, data };
  } catch (err) {
    return { ok: false, baseUrl, error: err.message };
  }
}
