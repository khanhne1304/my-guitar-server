/**

 * Gợi ý luyện tập — LLM (OpenAI-compatible / Gemini) + fallback huấn luyện viên local.

 */

import '../loadEnv.js';

import { buildLocalPracticeAdvice } from './practiceAdviceLocal.js';

import {

  buildAdvancedAnalysis,

  computeSkillLevel,

  normalizeLevel,

} from './practiceAdviceAnalysis.js';

import {

  extractJsonBlock,

  looksLikeRawJson,

  sanitizeDisplayText,

  sanitizeStringList,

} from './practiceAdviceSanitize.js';

import {
  validateSongMatch,
  sanitizeSongAssessment,
  buildSongAssessmentFromValidation,
} from './songValidation.service.js';



const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';



const MAX_REF_CHORDS = 40;

const MAX_PRED_CHORDS = 25;

const MAX_TIMELINE = 12;



const SYSTEM_PROMPT = `Bạn là huấn luyện viên guitar cá nhân, dạy người Việt mới học đến trung cấp.



Nhiệm vụ: đánh giá buổi luyện tập guitar như một giáo viên thực tế — không phải báo cáo kỹ thuật.



Nguyên tắc bắt buộc:

- Luôn giải thích bằng ngôn ngữ đơn giản, dễ hiểu.

- KHÔNG nhắc trực tiếp số liệu kỹ thuật (%, BPM deviation, confidence score, matched/referenceLen...) trong phản hồi.

- Chuyển mọi số liệu thành nhận xét thực tế, dễ cảm nhận (vd: "bạn nhớ phần lớn hợp âm" thay vì "accuracy 78%").

- Luôn bắt đầu bằng điểm mạnh của người chơi.

- Chỉ tập trung tối đa 3 lỗi quan trọng nhất.

- Mỗi lỗi phải giải thích nguyên nhân có thể xảy ra.

- Mỗi lỗi phải kèm cách luyện tập cụ thể.

- Không làm người học cảm thấy bị chê trách — giọng điệu khích lệ, thân thiện.

- Khuyến khích người học tiếp tục luyện tập.

- Chỉ dùng tiếng Việt tự nhiên.

- Không markdown.

- Không thêm text ngoài JSON.

- Không bịa dữ liệu không có trong context.

- Nếu dữ liệu không chắc, dùng: "có xu hướng", "dường như", "khả năng cao".



Khi có advancedAnalysis trong context, hãy tham khảo (nếu available: true):

- Chuyển hợp âm (chordTransition)

- Độ ổn định nhịp (rhythmStability)

- Độ chính xác BPM (bpmAccuracy)

- Độ tự tin nhận diện hợp âm (chordConfidence)

- Khả năng nhớ hợp âm (chordMemory)

- Mức độ thành thạo bài hát (songMastery)



Khi có songValidation trong context:

- Ngoài đánh giá kỹ năng chơi guitar, xác định người chơi có đang chơi đúng bài hát tham chiếu hay không dựa trên songValidation.

- Nếu songValidation.isCorrectSong = false thì phải nêu rõ bản chơi hiện tại chưa khớp với bài hát tham chiếu (trong overview và songAssessment).

- Không được mô tả là người chơi đã nhớ phần lớn bài hát nếu songValidation.category là incorrect hoặc partially_correct.

- Nếu songValidation.isCorrectSong = true thì đánh giá kỹ năng như bình thường.



Trường level trong JSON phải khớp với skillLevel trong context (Beginner | Intermediate | Advanced).



Trả về đúng một JSON:



{

  "level": "Beginner | Intermediate | Advanced",

  "overview": "Tổng quan ngắn gọn, bắt đầu bằng điểm mạnh",

  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],

  "mainProblems": [

    {

      "problem": "Mô tả lỗi bằng ngôn ngữ dễ hiểu",

      "cause": "Nguyên nhân có thể xảy ra",

      "impact": "Ảnh hưởng đến cách nghe bài",

      "solution": "Cách luyện tập cụ thể"

    }

  ],

  "prioritySkill": "chord_transitions | chord_memory | rhythm | tone | dynamics",

  "practicePlan": [

    {

      "title": "Tên bài tập",

      "reason": "Vì sao cần luyện",

      "exercise": "Hướng dẫn cụ thể",

      "durationMinutes": 10

    }

  ],

  "nextGoal": "Mục tiêu cho buổi luyện tiếp theo",

  "encouragement": "Lời động viên ngắn gọn",

  "songAssessment": {

    "isCorrectSong": true,

    "summary": "Bạn đang chơi đúng bài hát với một số lỗi nhỏ."

  }

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



  const accuracyPercent = cmp.accuracyPercent;

  const bpmDeviation = tempo.deviationPercent;

  const skillLevel = computeSkillLevel(accuracyPercent, bpmDeviation);



  const baseContext = {

    song: {

      title: ref.title,

      artist: ref.artist,

      key: ref.key,

      capo: ref.capo,

      rhythm: ref.rhythm,

      tempo: ref.tempo,

    },

    skillLevel,

    chordMatch: {

      accuracyPercent,

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



  const fullRefSeq = cmp.referenceSequence || [];

  const fullPredSeq = cmp.predictedSequence?.length

    ? cmp.predictedSequence

    : cmp.predictedSequenceRaw || [];

  const songValidation = validateSongMatch(

    takeList(fullRefSeq, MAX_REF_CHORDS * 4),

    takeList(fullPredSeq, MAX_PRED_CHORDS * 4),

  );

  baseContext.songValidation = {

    isCorrectSong: songValidation.isCorrectSong,

    category: songValidation.category,

    matchPercent: songValidation.matchPercent,

    sequenceSimilarity: songValidation.sequenceSimilarity,

    coveragePercent: songValidation.coveragePercent,

    confidence: songValidation.confidence,

    assessment: songValidation.assessment,

  };



  baseContext.advancedAnalysis = buildAdvancedAnalysis(baseContext);



  return baseContext;

}



function sanitizeMainProblem(item) {

  if (!item || typeof item !== 'object') return null;

  const problem = sanitizeDisplayText(item.problem || item.loi || item.issue || '');

  const cause = sanitizeDisplayText(item.cause || item.nguyen_nhan || '');

  const impact = sanitizeDisplayText(item.impact || item.anh_huong || '');

  const solution = sanitizeDisplayText(

    item.solution || item.cach_sua || item.exercise || item.fix || '',

  );

  if (!problem) return null;

  return { problem, cause, impact, solution };

}



function sanitizePracticePlanItem(item) {

  if (!item || typeof item !== 'object') return null;

  const title = sanitizeDisplayText(item.title || item.ten || '');

  const reason = sanitizeDisplayText(item.reason || item.ly_do || '');

  const exercise = sanitizeDisplayText(item.exercise || item.bai_tap || item.huong_dan || '');

  const durationMinutes = Number(item.durationMinutes ?? item.duration ?? item.phut);

  if (!title && !exercise) return null;

  return {

    title: title || 'Bài tập luyện tập',

    reason,

    exercise,

    durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0

      ? Math.round(durationMinutes)

      : 10,

  };

}



function normalizeAdviceObject(parsed, context) {

  if (!parsed || typeof parsed !== 'object') return null;



  const fallbackAcc = context?.chordMatch?.accuracyPercent;

  const fallbackDev = context?.tempo?.deviationPercent;



  const level = normalizeLevel(parsed.level, fallbackAcc, fallbackDev);

  const overview = sanitizeDisplayText(

    parsed.overview || parsed.summary || parsed.tom_tat || parsed.tong_ket || '',

  );

  const strengths = sanitizeStringList(

    parsed.strengths ?? parsed.diem_manh ?? parsed.diem_tot,

  ).slice(0, 5);



  const rawProblems =

    parsed.mainProblems ??

    parsed.problems ??

    parsed.weaknesses ??

    parsed.improvements ??

    [];

  let mainProblems = [];

  if (Array.isArray(rawProblems)) {

    mainProblems = rawProblems

      .map((item) => {

        if (typeof item === 'string') {

          const text = sanitizeDisplayText(item);

          return text ? { problem: text, cause: '', impact: '', solution: '' } : null;

        }

        return sanitizeMainProblem(item);

      })

      .filter(Boolean)

      .slice(0, 3);

  }



  const prioritySkill = sanitizeDisplayText(

    parsed.prioritySkill || parsed.priority || parsed.uu_tien || '',

  );



  const rawPlan =

    parsed.practicePlan ?? parsed.practiceSteps ?? parsed.buoc_luyen ?? parsed.ke_hoach ?? [];

  let practicePlan = [];

  if (Array.isArray(rawPlan)) {

    practicePlan = rawPlan

      .map((item) => {

        if (typeof item === 'string') {

          const exercise = sanitizeDisplayText(item);

          return exercise

            ? { title: 'Bài tập', reason: '', exercise, durationMinutes: 10 }

            : null;

        }

        return sanitizePracticePlanItem(item);

      })

      .filter(Boolean)

      .slice(0, 5);

  }



  const nextGoal = sanitizeDisplayText(parsed.nextGoal || parsed.muc_tieu || parsed.goal || '');

  const encouragement = sanitizeDisplayText(

    parsed.encouragement || parsed.dong_vien || parsed.motivation || '',

  );



  const songAssessment = sanitizeSongAssessment(

    parsed.songAssessment ?? parsed.danh_gia_bai ?? parsed.song_assessment,

    context?.songValidation,

  );



  const hasContent =

    overview ||

    strengths.length ||

    mainProblems.length ||

    practicePlan.length ||

    nextGoal ||

    encouragement ||

    songAssessment?.summary;



  if (!hasContent) return null;



  return {

    level,

    overview,

    strengths,

    mainProblems,

    prioritySkill,

    practicePlan,

    nextGoal,

    encouragement,

    songAssessment,

  };

}



function parseAdviceJson(raw, context) {

  const block = extractJsonBlock(raw);

  try {

    return normalizeAdviceObject(JSON.parse(block), context);

  } catch {

    /* thử sửa trailing comma */

  }

  try {

    const fixed = block.replace(/,\s*([}\]])/g, '$1');

    return normalizeAdviceObject(JSON.parse(fixed), context);

  } catch {

    return null;

  }

}



/** Trích gợi ý từ văn bản tự do nếu model không trả JSON */

function parseAdviceFromPlainText(raw, context) {

  const text = String(raw || '').trim();

  if (!text || text.length < 40) return null;

  if (looksLikeRawJson(text)) {

    const fromJson = parseAdviceJson(text, context);

    if (fromJson) return fromJson;

  }



  const lines = text

    .split(/\n+/)

    .map((l) => sanitizeDisplayText(l.replace(/^[\s\-*•\d.)]+/, '')))

    .filter((l) => l.length > 8 && !looksLikeRawJson(l));



  if (lines.length < 2) return null;



  const strengths = lines.filter((l) => /tốt|mạnh|ổn|khá|giỏi|tự tin/i.test(l)).slice(0, 3);

  const problemLines = lines.filter((l) => /cần|lỗi|chưa|sai|khó|yếu/i.test(l)).slice(0, 3);

  const practiceLines = lines.filter((l) => /luyện|bước|metronome|tập|bài tập/i.test(l)).slice(0, 4);



  return {

    level: computeSkillLevel(

      context?.chordMatch?.accuracyPercent,

      context?.tempo?.deviationPercent,

    ),

    overview: lines[0],

    strengths,

    mainProblems: problemLines.map((p) => ({

      problem: p,

      cause: '',

      impact: '',

      solution: '',

    })),

    prioritySkill: '',

    practicePlan: practiceLines.map((ex) => ({

      title: 'Bài tập',

      reason: '',

      exercise: ex,

      durationMinutes: 10,

    })),

    nextGoal: '',

    encouragement: lines[lines.length - 1] || '',

  };

}



function mergeMainProblems(aiList, localList) {

  const out = [];

  const seen = new Set();



  for (const item of [...(aiList || []), ...(localList || [])]) {

    const key = item?.problem?.slice(0, 60);

    if (!key || seen.has(key)) continue;

    seen.add(key);

    out.push({

      problem: item.problem,

      cause: item.cause || '',

      impact: item.impact || '',

      solution: item.solution || '',

    });

    if (out.length >= 3) break;

  }

  return out;

}



function mergePracticePlan(aiList, localList) {

  const out = [];

  const seen = new Set();



  for (const item of [...(aiList || []), ...(localList || [])]) {

    const key = `${item?.title}|${item?.exercise}`.slice(0, 80);

    if (!key || seen.has(key)) continue;

    seen.add(key);

    out.push(item);

    if (out.length >= 5) break;

  }

  return out;

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



function mergeSongAssessment(aiPart, context, local) {

  const fromAi = aiPart?.songAssessment;

  const fromLocal = local?.songAssessment;

  if (fromAi?.summary) {

    return sanitizeSongAssessment(fromAi, context?.songValidation);

  }

  if (fromLocal?.summary) return fromLocal;

  return buildSongAssessmentFromValidation(context?.songValidation);

}



function mergeAdvice(context, aiPart, meta) {

  const local = buildLocalPracticeAdvice(context);

  const songAssessment = mergeSongAssessment(aiPart, context, local);



  if (!aiPart) {

    return {

      available: true,

      source: 'local',

      provider: 'analysis',

      model: 'rule-based',

      ...local,

      songAssessment,

    };

  }



  const overview = sanitizeDisplayText(aiPart.overview || local.overview);

  const strengths = mergeUniqueLists(aiPart.strengths, local.strengths).slice(0, 5);

  const mainProblems = mergeMainProblems(aiPart.mainProblems, local.mainProblems);

  const practicePlan = mergePracticePlan(aiPart.practicePlan, local.practicePlan);

  const level = normalizeLevel(

    aiPart.level,

    context?.chordMatch?.accuracyPercent,

    context?.tempo?.deviationPercent,

  );



  return {

    available: true,

    source: meta.source || 'ai',

    provider: meta.provider,

    model: meta.model,

    level,

    overview,

    strengths,

    mainProblems,

    prioritySkill: aiPart.prioritySkill || local.prioritySkill,

    practicePlan,

    nextGoal: sanitizeDisplayText(aiPart.nextGoal || local.nextGoal),

    encouragement: sanitizeDisplayText(aiPart.encouragement || local.encouragement),

    songAssessment,

  };

}



function formatApiError(errMsg, status) {

  const m = String(errMsg || '');

  if (/openai_error|bad_response_status_code/i.test(m) && status === 429) {

    return 'Dịch vụ AI tạm quá tải — vẫn có đánh giá từ buổi luyện của bạn bên dưới.';

  }

  if (/quota|exceeded|insufficient|无权访问/i.test(m) || status === 429) {

    return 'API AI hết hạn mức — vẫn hiển thị đánh giá từ buổi luyện.';

  }

  if (/无权访问|not authorized|does not have access/i.test(m)) {

    return 'Model không được phép — đổi GEMINI_PRACTICE_ADVICE_MODEL (vd. gemini-2.5-flash).';

  }

  if (/invalid.*key|authentication|401|403/i.test(m)) {

    return 'API key không hợp lệ — vẫn hiển thị đánh giá từ buổi luyện.';

  }

  return `AI: ${m || `HTTP ${status}`} — vẫn có đánh giá từ buổi luyện bên dưới.`;

}



function buildUserPrompt(context) {

  return `Hãy đánh giá buổi luyện tập guitar này như một giáo viên guitar thực tế.



Yêu cầu:

- Xác định trình độ hiện tại (level phải khớp skillLevel trong dữ liệu).

- Nêu tối đa 3 lỗi quan trọng nhất.

- Giải thích lỗi bằng ngôn ngữ dễ hiểu.

- Không chỉ nói số liệu — chuyển số liệu thành nhận xét thực tế.

- Đưa bài tập cụ thể để sửa lỗi.

- Đề xuất mục tiêu cho lần luyện tập tiếp theo.

- Luôn bắt đầu bằng điểm mạnh.

- Giọng điệu khích lệ, không chê trách.



Dữ liệu buổi luyện:

${JSON.stringify(context, null, 2)}`;

}



function parseLlmRaw(raw, context) {

  if (!raw) return null;

  return parseAdviceJson(raw, context) || parseAdviceFromPlainText(raw, context);

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

      max_tokens: 1800,

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

    const parsed = parseLlmRaw(raw, context);

    if (!parsed) {

      console.warn('[practiceAdvice/openai] parse fail, raw:', raw.slice(0, 300));

      const merged = mergeAdvice(context, null, { provider: 'openai-compatible' });

      merged.aiWarning =

        'AI không trả JSON chuẩn — hiển thị đánh giá từ buổi luyện của bạn.';

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

          maxOutputTokens: 8192,

          responseMimeType: 'application/json',

          thinkingConfig: { thinkingBudget: 0 },

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

    const parsed = parseLlmRaw(raw, context);

    if (!parsed) {

      const merged = mergeAdvice(context, null, { provider: 'gemini' });

      merged.aiWarning = 'Gemini không trả JSON chuẩn — dùng đánh giá từ buổi luyện.';

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



export { computeSkillLevel, buildAdvancedAnalysis, validateSongMatch };


