/**
 * Gợi ý luyện tập — LLM (OpenAI-compatible / Gemini) + fallback từ số liệu phân tích.
 */
import '../loadEnv.js';
import { buildLocalPracticeAdvice } from './practiceAdviceLocal.js';
import {
  extractJsonBlock,
  looksLikeRawJson,
  sanitizeDisplayText,
  sanitizeStringList,
} from './practiceAdviceSanitize.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MAX_REF_CHORDS = 40;
const MAX_PRED_CHORDS = 25;
const MAX_TIMELINE = 12;

const SYSTEM_PROMPT = `Bạn là giáo viên guitar chuyên phân tích biểu diễn thực tế cho người Việt.

Dựa trên:
- kết quả detect hợp âm ChordMini
- BPM/tempo
- confidence score
- so sánh progression với HopAmChuan
- metadata audio nếu có

Hãy phân tích sâu đoạn guitar như một giáo viên thật:
- chỉ ra lỗi kỹ thuật
- giải thích nguyên nhân âm thanh
- đánh giá timing, groove, lực tay, độ sạch hợp âm
- đưa hướng luyện cụ thể

Quy tắc:
- Chỉ dùng tiếng Việt tự nhiên.
- Không markdown.
- Không thêm text ngoài JSON.
- Không bịa dữ liệu không có.
- Nhận xét phải gắn với biểu hiện âm thanh cụ thể.
- Nếu dữ liệu không chắc, dùng các cụm:
  “có xu hướng”, “dường như”, “khả năng cao”.

Bắt buộc phân tích:
1. Âm sắc & kỹ thuật:
- độ sạch nốt
- rè dây/buzz
- lực tay
- dynamic
- sustain
- độ đều khi quạt/fingerstyle
- consistency

2. Tempo & nhịp:
- BPM ổn định hay không
- rushing/dragging
- groove
- giữ nhịp khi chuyển hợp âm
- timing drift
- metronome accuracy

3. Hợp âm & chuyển đoạn:
- độ khớp với HopAmChuan
- hợp âm sai/missing
- chuyển sớm/muộn
- dead-air khi đổi hợp âm
- lệch tone/capo
- độ rõ chord voicing

4. Cảm giác biểu diễn:
- tự tin/do dự
- mechanical hay musical
- continuity
- expressive dynamics

5. Hướng luyện:
- bài tập cụ thể
- tempo luyện
- lỗi cần ưu tiên sửa

Trả về đúng một JSON:

{
  "overview":"Tổng quan ngắn gọn nhưng chuyên sâu",
  "toneAndTimbre":[
    "Nhận xét"
  ],
  "tempoAndRhythm":[
    "Nhận xét"
  ],
  "chordsAndTransitions":[
    "Nhận xét"
  ],
  "performanceFeel":[
    "Nhận xét"
  ],
  "strengths":[
    "Điểm mạnh"
  ],
  "weaknesses":[
    "Điểm yếu"
  ],
  "practiceSteps":[
    "Bài luyện cụ thể"
  ],
  "priority":"tempo|chords|tone|both"
}`;

function takeList(arr, max) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, max);
}

function getOpenAiApiKey() {
  return String(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '').trim();
}

function getOpenAiBaseUrl() {
  const base = String(
    process.env.LLM_API_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.OPENAI_API_BASE_URL ||
      '',
  ).trim();
  return base.replace(/\/$/, '');
}

function getOpenAiModel() {
  return (
    process.env.LLM_PRACTICE_ADVICE_MODEL ||
    process.env.OPENAI_PRACTICE_ADVICE_MODEL ||
    'gemini-2.5-flash'
  ).trim();
}

function getGeminiApiKey() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim();
}

function getGeminiModel() {
  return (
    process.env.GEMINI_PRACTICE_ADVICE_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-2.5-flash'
  ).trim();
}

function resolveProvider() {
  const forced = String(process.env.PRACTICE_ADVICE_PROVIDER || '').toLowerCase();
  if (forced === 'gemini') return 'gemini';
  if (forced === 'openai' || forced === 'openai-compatible') return 'openai';
  if (getOpenAiApiKey() && getOpenAiBaseUrl()) return 'openai';
  if (getGeminiApiKey()) return 'gemini';
  return 'openai';
}

export function buildAnalysisContext(payload = {}) {
  const ref = payload.referenceSong || {};
  const cmp = payload.comparison || {};
  const tempo = payload.tempoComparison || {};
  const metrics = payload.chordRecognition?.metrics || {};

  const refSeq = takeList(cmp.referenceSequence, MAX_REF_CHORDS);
  const predAligned = takeList(cmp.predictedSequence, MAX_PRED_CHORDS);
  const predRaw = takeList(cmp.predictedSequenceRaw, MAX_PRED_CHORDS);
  const timeline = takeList(payload.chordRecognition?.predicted_chords, MAX_TIMELINE).map(
    (s) => ({
      time: s.time,
      chord: s.predicted_chord,
      confidence: s.confidence,
    }),
  );

  return {
    song: {
      title: ref.title,
      artist: ref.artist,
      key: ref.key,
      capo: ref.capo,
      rhythm: ref.rhythm,
      tempo: ref.tempo,
    },
    chordMatch: {
      accuracyPercent: cmp.accuracyPercent,
      matched: cmp.matched,
      referenceLen: cmp.referenceLen,
      compareNote: cmp.compareNote,
      transposeSemitones: cmp.transposeSemitones,
      hopamCapo: cmp.hopamCapo,
      analyzedTranspose: cmp.analyzedTranspose,
    },
    sequences: {
      referenceSample: refSeq.join(' → '),
      detectedAlignedSample: predAligned.join(' → '),
      detectedRawSample: predRaw.join(' → '),
    },
    tempo: {
      referenceBpm: tempo.referenceBpm,
      detectedBpm: tempo.detectedBpm,
      deviationPercent: tempo.deviationPercent,
      direction: tempo.direction,
      rating: tempo.rating,
    },
    recognition: {
      segmentCount: metrics.n_chord_segments,
      meanConfidence: metrics.mean_chord_confidence,
    },
    timeline,
  };
}

function normalizeAdviceObject(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  const overview = sanitizeDisplayText(
    parsed.overview || parsed.summary || parsed.tom_tat || parsed.tong_ket || '',
  );

  const toneAndTimbre = sanitizeStringList(
    parsed.toneAndTimbre ?? parsed.am_sac ?? parsed.amSac ?? parsed.timbre,
  );
  const tempoAndRhythm = sanitizeStringList(
    parsed.tempoAndRhythm ?? parsed.tempo ?? parsed.nhip ?? parsed.rhythm,
  );
  const chordsAndTransitions = sanitizeStringList(
    parsed.chordsAndTransitions ??
      parsed.hop_am ??
      parsed.chords ??
      parsed.improvements,
  );

  const strengths = sanitizeStringList(
    parsed.strengths ?? parsed.diem_manh ?? parsed.diem_tot,
  );
  const practiceSteps = sanitizeStringList(
    parsed.practiceSteps ?? parsed.buoc_luyen ?? parsed.ke_hoach ?? parsed.steps,
  );

  const improvements = sanitizeStringList(
    parsed.improvements ?? parsed.can_cai_thien ?? parsed.ky_nang_thieu,
  );

  let priority = String(parsed.priority || parsed.uu_tien || 'both').toLowerCase();
  if (!['tempo', 'chords', 'both'].includes(priority)) priority = 'both';

  const hasContent =
    overview ||
    toneAndTimbre.length ||
    tempoAndRhythm.length ||
    chordsAndTransitions.length ||
    practiceSteps.length;

  if (!hasContent) return null;

  return {
    overview,
    summary: overview,
    toneAndTimbre,
    tempoAndRhythm,
    chordsAndTransitions,
    strengths,
    improvements: improvements.length ? improvements : chordsAndTransitions,
    practiceSteps,
    priority,
  };
}

function parseAdviceJson(raw) {
  const block = extractJsonBlock(raw);
  try {
    return normalizeAdviceObject(JSON.parse(block));
  } catch {
    /* thử sửa trailing comma */
  }
  try {
    const fixed = block.replace(/,\s*([}\]])/g, '$1');
    return normalizeAdviceObject(JSON.parse(fixed));
  } catch {
    return null;
  }
}

/** Trích gợi ý từ văn bản tự do nếu model không trả JSON */
function parseAdviceFromPlainText(raw) {
  const text = String(raw || '').trim();
  if (!text || text.length < 40) return null;
  if (looksLikeRawJson(text)) {
    const fromJson = parseAdviceJson(text);
    if (fromJson) return fromJson;
  }

  const lines = text
    .split(/\n+/)
    .map((l) => sanitizeDisplayText(l.replace(/^[\s\-*•\d.)]+/, '')))
    .filter((l) => l.length > 8 && !looksLikeRawJson(l));

  if (lines.length < 2) return null;

  return {
    overview: lines[0],
    summary: lines[0],
    toneAndTimbre: lines.filter((l) => /âm|sắc|tiếng|rõ|dyn|pick|strum|buzz/i.test(l)),
    tempoAndRhythm: lines.filter((l) => /tempo|bpm|nhịp|phách|nhanh|chậm|metronome/i.test(l)),
    chordsAndTransitions: lines.filter((l) => /hợp âm|chuyển|progression|capo|tone/i.test(l)),
    strengths: lines.filter((l) => /tốt|mạnh|ổn|khá/i.test(l)).slice(0, 3),
    improvements: [],
    practiceSteps: lines.filter((l) => /luyện|bước|metronome|tập/i.test(l)).slice(0, 4),
    priority: 'both',
  };
}

function mergeUniqueLists(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    for (const item of list || []) {
      const t = sanitizeDisplayText(item);
      if (!t || seen.has(t) || looksLikeRawJson(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function mergeAdvice(context, aiPart, meta) {
  const local = buildLocalPracticeAdvice(context);

  if (!aiPart) {
    return {
      available: true,
      source: 'local',
      provider: 'analysis',
      model: 'rule-based',
      ...local,
    };
  }

  const overview = sanitizeDisplayText(aiPart.overview || aiPart.summary || local.overview);
  const toneAndTimbre = mergeUniqueLists(
    aiPart.toneAndTimbre,
    local.toneAndTimbre,
  ).slice(0, 5);
  const tempoAndRhythm = mergeUniqueLists(
    aiPart.tempoAndRhythm,
    local.tempoAndRhythm,
  ).slice(0, 5);
  const chordsAndTransitions = mergeUniqueLists(
    aiPart.chordsAndTransitions,
    local.chordsAndTransitions,
  ).slice(0, 5);
  const strengths = mergeUniqueLists(aiPart.strengths, local.strengths).slice(0, 5);
  const practiceSteps = mergeUniqueLists(
    aiPart.practiceSteps,
    local.practiceSteps,
  ).slice(0, 5);
  const improvements = mergeUniqueLists(
    aiPart.improvements,
    chordsAndTransitions.slice(0, 2),
    local.improvements,
  ).slice(0, 5);

  return {
    available: true,
    source: meta.source || 'ai',
    provider: meta.provider,
    model: meta.model,
    overview,
    summary: overview,
    toneAndTimbre,
    tempoAndRhythm,
    chordsAndTransitions,
    strengths,
    improvements,
    practiceSteps,
    priority: aiPart.priority || local.priority,
    skillFocus: local.skillFocus,
  };
}

function formatApiError(errMsg, status) {
  const m = String(errMsg || '');
  if (/openai_error|bad_response_status_code/i.test(m) && status === 429) {
    return 'Dịch vụ LLM tạm quá tải (429) — vẫn có gợi ý từ phân tích số liệu bên dưới.';
  }
  if (/quota|exceeded|insufficient|无权访问/i.test(m) || status === 429) {
    return 'API AI hết hạn mức — vẫn hiển thị gợi ý từ kết quả phân tích.';
  }
  if (/无权访问|not authorized|does not have access/i.test(m)) {
    return `Model không được phép — đổi LLM_PRACTICE_ADVICE_MODEL (vd. gemini-2.5-flash).`;
  }
  if (/invalid.*key|authentication|401|403/i.test(m)) {
    return 'API key không hợp lệ — vẫn hiển thị gợi ý từ phân tích số liệu.';
  }
  return `AI: ${m || `HTTP ${status}`} — vẫn có gợi ý từ phân tích bên dưới.`;
}

function buildUserPrompt(context) {
  return (
    'Phân tích kỹ năng guitar còn thiếu và đưa gợi ý luyện tập. Dữ liệu:\n' +
    JSON.stringify(context, null, 2)
  );
}

function parseLlmRaw(raw) {
  if (!raw) return null;
  return parseAdviceJson(raw) || parseAdviceFromPlainText(raw);
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text || '')
    .join('')
    .trim();
}

async function callOpenAiCompatible(context) {
  const apiKey = getOpenAiApiKey();
  const baseUrl = getOpenAiBaseUrl();
  const model = getOpenAiModel();
  const url = `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 1400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(context) },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data, model };
}

async function generateWithOpenAiCompatible(context) {
  const apiKey = getOpenAiApiKey();
  const baseUrl = getOpenAiBaseUrl();

  if (!apiKey || !baseUrl) {
    return mergeAdvice(context, null, { provider: 'analysis' });
  }

  try {
    const { res, data, model } = await callOpenAiCompatible(context);

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      console.warn('[practiceAdvice/openai]', errMsg);
      const merged = mergeAdvice(context, null, { provider: 'openai-compatible' });
      merged.aiWarning = formatApiError(errMsg, res.status);
      return merged;
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    const parsed = parseLlmRaw(raw);
    if (!parsed) {
      console.warn('[practiceAdvice/openai] parse fail, raw:', raw.slice(0, 300));
      const merged = mergeAdvice(context, null, { provider: 'openai-compatible' });
      merged.aiWarning =
        'AI không trả JSON chuẩn — hiển thị gợi ý từ kết quả phân tích hợp âm & nhịp.';
      return merged;
    }

    return mergeAdvice(context, parsed, {
      source: 'ai',
      provider: 'openai-compatible',
      model,
    });
  } catch (err) {
    console.warn('[practiceAdvice/openai]', err?.message);
    const merged = mergeAdvice(context, null, { provider: 'openai-compatible' });
    merged.aiWarning = `Lỗi kết nối AI: ${err.message}`;
    return merged;
  }
}

async function generateWithGemini(context) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return mergeAdvice(context, null, { provider: 'analysis' });
  }

  const model = getGeminiModel();
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(context) }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data?.error?.message || `Gemini HTTP ${res.status}`;
      console.warn('[practiceAdvice/gemini]', errMsg);
      const merged = mergeAdvice(context, null, { provider: 'gemini' });
      merged.aiWarning = formatApiError(errMsg, res.status);
      return merged;
    }

    const raw = extractGeminiText(data);
    const parsed = parseLlmRaw(raw);
    if (!parsed) {
      const merged = mergeAdvice(context, null, { provider: 'gemini' });
      merged.aiWarning = 'Gemini không trả JSON chuẩn — dùng gợi ý từ phân tích số liệu.';
      return merged;
    }

    return mergeAdvice(context, parsed, { source: 'ai', provider: 'gemini', model });
  } catch (err) {
    const merged = mergeAdvice(context, null, { provider: 'gemini' });
    merged.aiWarning = `Lỗi Gemini: ${err.message}`;
    return merged;
  }
}

/**
 * @param {object} payload — kết quả phân tích từ /chord-practice/analyze (data)
 */
export async function generatePracticeAdvice(payload) {
  const context = buildAnalysisContext(payload);
  const provider = resolveProvider();

  if (provider === 'gemini') {
    return generateWithGemini(context);
  }
  return generateWithOpenAiCompatible(context);
}

export function getPracticeAdviceConfigStatus() {
  const provider = resolveProvider();
  return {
    provider,
    openaiConfigured: Boolean(getOpenAiApiKey() && getOpenAiBaseUrl()),
    geminiConfigured: Boolean(getGeminiApiKey()),
    model: provider === 'gemini' ? getGeminiModel() : getOpenAiModel(),
    baseUrl: provider === 'openai' ? getOpenAiBaseUrl() : null,
    localFallback: true,
  };
}
