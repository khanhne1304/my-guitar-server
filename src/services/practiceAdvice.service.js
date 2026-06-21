/**

 * Gợi ý luyện tập — LLM (DeepSeek / OpenAI-compatible / Gemini) + fallback huấn luyện viên local.

 */

import '../loadEnv.js';

import { buildLocalPracticeAdvice } from './practiceAdviceLocal.js';

import {

  buildAdvancedAnalysis,

  computeSkillLevel,

  normalizeLevel,

} from './practiceAdviceAnalysis.js';

import { buildPracticeMetrics } from './practiceMetrics.service.js';

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



const SYSTEM_PROMPT = `Bạn là một giáo viên guitar chuyên nghiệp với hơn 15 năm kinh nghiệm giảng dạy.

Nhiệm vụ:
- Đánh giá buổi luyện tập dựa trên dữ liệu phân tích được cung cấp.
- Chỉ nhận xét dựa trên dữ liệu thực tế trong context (chordAccuracy, wrongChords, transitionAnalysis, tempoAnalysis, sections, skillScores, songValidation).
- Không khen chung chung — mỗi điểm mạnh phải gắn với dữ liệu cụ thể.
- Không sử dụng nhận xét mơ hồ — nêu rõ hợp âm, đoạn, tempo khi có trong dữ liệu.
- Giải thích nguyên nhân gây lỗi dựa trên wrongChords, worstTransitions, sections accuracy thấp.
- Đề xuất bài tập sửa lỗi cụ thể (tên hợp âm, cặp chuyển, BPM cụ thể).
- Đề xuất tempo luyện tập tiếp theo trong recommendedTempo.
- Đưa mục tiêu rõ ràng cho buổi học kế tiếp trong nextSessionGoal.
- Nếu dữ liệu không đủ (null, mảng rỗng, available: false) thì ghi rõ "thiếu dữ liệu" thay vì suy đoán.
- Chỉ dùng tiếng Việt tự nhiên.
- Không markdown. Không thêm text ngoài JSON.

Khi songValidation.isCorrectSong = false: nêu rõ trong overview và songAssessment, không khen nhớ bài nếu category là incorrect/partially_correct.

performanceLevel phải là một trong: Beginner | Intermediate | Advanced — khớp skillLevel trong context.

Trả về đúng một JSON hợp lệ:

{
  "overview": "",
  "performanceLevel": "Beginner | Intermediate | Advanced",
  "strengths": [],
  "weaknesses": [],
  "mainProblems": [
    { "problem": "", "cause": "", "impact": "", "solution": "" }
  ],
  "practicePlan": [
    { "exercise": "", "durationMinutes": 10, "goal": "" }
  ],
  "sectionFeedback": [],
  "nextSessionGoal": "",
  "recommendedTempo": 0,
  "skillAssessment": {},
  "songAssessment": { "isCorrectSong": true, "summary": "" }
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



function getDeepSeekApiKey() {

  return String(process.env.DEEPSEEK_API_KEY || '').trim();

}



function getDeepSeekBaseUrl() {

  const base = String(process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1').trim();

  return base.replace(/\/$/, '');

}



function getDeepSeekModel() {

  return (

    process.env.DEEPSEEK_PRACTICE_ADVICE_MODEL ||

    process.env.DEEPSEEK_MODEL ||

    'deepseek-chat'

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

  if (forced === 'deepseek') return 'deepseek';

  if (forced === 'openai' || forced === 'openai-compatible') return 'openai';

  if (getOpenAiApiKey() && getOpenAiBaseUrl()) return 'openai';

  if (getDeepSeekApiKey()) return 'deepseek';

  if (getGeminiApiKey()) return 'gemini';

  return 'deepseek';

}



export function buildAnalysisContext(payload = {}) {

  const ref = payload.referenceSong || {};

  const cmp = payload.comparison || {};

  const tempo = payload.tempoComparison || {};

  const recognitionMetrics = payload.chordRecognition?.metrics || {};



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

      segmentCount: recognitionMetrics.n_chord_segments,

      meanConfidence: recognitionMetrics.mean_chord_confidence,

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

  const practiceMetrics =
    payload.practiceMetrics ||
    buildPracticeMetrics({
      comparison: cmp,
      tempoComparison: tempo,
      chordRecognition: payload.chordRecognition,
      beatAnalysis: payload.beatAnalysis,
      referenceSequence: cmp.referenceSequence || fullRefSeq,
      predictedSequence: fullPredSeq,
      predictedSegmentsRaw: payload.chordRecognition?.predicted_chords,
      transposeSemitones: cmp.transposeSemitones,
    });

  baseContext.referenceSong = {
    title: ref.title,
    artist: ref.artist,
    key: ref.key,
    capo: ref.capo,
    rhythm: ref.rhythm,
    tempo: ref.tempo,
    timeSignature: ref.timeSignature,
    url: ref.url,
    chordCount: ref.chordCount ?? cmp.referenceLen,
  };

  baseContext.comparison = {
    chordAccuracy: practiceMetrics.chordAccuracy,
    accuracyPercent,
    matched: cmp.matched,
    referenceLen: cmp.referenceLen,
    compareNote: cmp.compareNote,
    transposeSemitones: cmp.transposeSemitones,
    hopamCapo: cmp.hopamCapo,
    analyzedTranspose: cmp.analyzedTranspose,
  };

  baseContext.tempoAnalysis = practiceMetrics.tempoAnalysis;
  baseContext.transitionAnalysis = practiceMetrics.transitionAnalysis;
  baseContext.wrongChords = takeList(practiceMetrics.wrongChords, 20);
  baseContext.sections = practiceMetrics.sections;
  baseContext.skillScores = practiceMetrics.skillScores;

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

  const goal = sanitizeDisplayText(item.goal || item.muc_tieu || item.objective || '');

  const exercise = sanitizeDisplayText(item.exercise || item.bai_tap || item.huong_dan || '');

  const durationMinutes = Number(item.durationMinutes ?? item.duration ?? item.phut);

  if (!title && !exercise && !goal) return null;

  return {

    title: title || goal || 'Bài tập luyện tập',

    reason: reason || goal,

    goal: goal || reason,

    exercise,

    durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0

      ? Math.round(durationMinutes)

      : 10,

  };

}



function sanitizeSectionFeedbackItem(item) {

  if (!item || typeof item !== 'object') return null;

  const section = sanitizeDisplayText(item.section || item.name || item.doan || '');

  const feedback = sanitizeDisplayText(item.feedback || item.nhan_xet || item.comment || '');

  if (!section && !feedback) return null;

  return { section: section || 'Đoạn', feedback };

}



function sanitizeSkillAssessment(obj, context) {

  const fromContext = context?.skillScores || {};

  const src = obj && typeof obj === 'object' ? obj : {};

  const pick = (key) => {

    const v = Number(src[key] ?? fromContext[key]);

    return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fromContext[key] ?? 0;

  };

  return {

    chordAccuracy: pick('chordAccuracy'),

    rhythm: pick('rhythm'),

    tempoControl: pick('tempoControl'),

    transitionSkill: pick('transitionSkill'),

    overall: pick('overall'),

  };

}



function normalizeAdviceObject(parsed, context) {

  if (!parsed || typeof parsed !== 'object') return null;



  const fallbackAcc =

    context?.chordMatch?.accuracyPercent ?? context?.comparison?.chordAccuracy?.accuracy;

  const fallbackDev =

    context?.tempo?.deviationPercent ??

    (context?.tempoAnalysis?.tempoDifference != null

      ? Math.abs(context.tempoAnalysis.tempoDifference)

      : null);



  const performanceLevel = normalizeLevel(

    parsed.performanceLevel || parsed.level,

    fallbackAcc,

    fallbackDev,

  );

  const level = performanceLevel;

  const overview = sanitizeDisplayText(

    parsed.overview || parsed.summary || parsed.tom_tat || parsed.tong_ket || '',

  );

  const strengths = sanitizeStringList(

    parsed.strengths ?? parsed.diem_manh ?? parsed.diem_tot,

  ).slice(0, 5);

  const weaknesses = sanitizeStringList(parsed.weaknesses ?? parsed.diem_yeu ?? parsed.han_che).slice(

    0,

    5,

  );



  const rawProblems = parsed.mainProblems ?? parsed.problems ?? parsed.improvements ?? [];

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

  if (mainProblems.length === 0 && weaknesses.length > 0) {

    mainProblems = weaknesses

      .slice(0, 3)

      .map((w) => ({ problem: w, cause: '', impact: '', solution: '' }));

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

            ? { title: 'Bài tập', reason: '', goal: '', exercise, durationMinutes: 10 }

            : null;

        }

        return sanitizePracticePlanItem(item);

      })

      .filter(Boolean)

      .slice(0, 5);

  }



  const nextSessionGoal = sanitizeDisplayText(

    parsed.nextSessionGoal || parsed.nextGoal || parsed.muc_tieu || parsed.goal || '',

  );

  const nextGoal = nextSessionGoal;

  const encouragement = sanitizeDisplayText(

    parsed.encouragement || parsed.dong_vien || parsed.motivation || '',

  );



  let recommendedTempo = Number(parsed.recommendedTempo ?? parsed.tempoKhuyenNghi);

  if (!Number.isFinite(recommendedTempo) || recommendedTempo <= 0) {

    const refBpm = context?.tempoAnalysis?.expectedBPM ?? context?.tempo?.referenceBpm;

    const dev = context?.tempoAnalysis?.tempoDifference;

    if (refBpm && dev != null && dev < -3) {

      recommendedTempo = Math.max(60, Math.round(refBpm * 0.85));

    } else if (refBpm) {

      recommendedTempo = Math.round(refBpm);

    } else {

      recommendedTempo = 0;

    }

  }



  const rawSectionFeedback = parsed.sectionFeedback ?? parsed.section_feedback ?? [];

  let sectionFeedback = [];

  if (Array.isArray(rawSectionFeedback)) {

    sectionFeedback = rawSectionFeedback

      .map((item) => {

        if (typeof item === 'string') return { section: '', feedback: sanitizeDisplayText(item) };

        return sanitizeSectionFeedbackItem(item);

      })

      .filter(Boolean)

      .slice(0, 6);

  }



  const skillAssessment = sanitizeSkillAssessment(

    parsed.skillAssessment ?? parsed.skillScores,

    context,

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

    nextSessionGoal ||

    encouragement ||

    songAssessment?.summary ||

    weaknesses.length;



  if (!hasContent) return null;



  return {

    level,

    performanceLevel,

    overview,

    strengths,

    weaknesses,

    mainProblems,

    prioritySkill,

    practicePlan,

    nextGoal,

    nextSessionGoal,

    encouragement,

    recommendedTempo,

    sectionFeedback,

    skillAssessment,

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

      skillScores: context?.skillScores,

      practiceMetrics: {

        chordAccuracy: context?.comparison?.chordAccuracy,

        wrongChords: context?.wrongChords,

        transitionAnalysis: context?.transitionAnalysis,

        tempoAnalysis: context?.tempoAnalysis,

        sections: context?.sections,

        skillScores: context?.skillScores,

      },

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



  const weaknesses = mergeUniqueLists(aiPart.weaknesses, local.weaknesses).slice(0, 5);

  const sectionFeedback =

    (aiPart.sectionFeedback?.length ? aiPart.sectionFeedback : local.sectionFeedback) || [];

  const skillAssessment = aiPart.skillAssessment || local.skillAssessment || context?.skillScores;

  const recommendedTempo =

    aiPart.recommendedTempo || local.recommendedTempo || context?.tempoAnalysis?.expectedBPM || 0;



  return {

    available: true,

    source: meta.source || 'ai',

    provider: meta.provider,

    model: meta.model,

    level,

    performanceLevel: aiPart.performanceLevel || level,

    overview,

    strengths,

    weaknesses,

    mainProblems,

    prioritySkill: aiPart.prioritySkill || local.prioritySkill,

    practicePlan,

    nextGoal: sanitizeDisplayText(aiPart.nextGoal || aiPart.nextSessionGoal || local.nextGoal),

    nextSessionGoal: sanitizeDisplayText(

      aiPart.nextSessionGoal || aiPart.nextGoal || local.nextSessionGoal || local.nextGoal,

    ),

    encouragement: sanitizeDisplayText(aiPart.encouragement || local.encouragement),

    recommendedTempo,

    sectionFeedback,

    skillAssessment,

    songAssessment,

    skillScores: context?.skillScores,

    practiceMetrics: {

      chordAccuracy: context?.comparison?.chordAccuracy,

      wrongChords: context?.wrongChords,

      transitionAnalysis: context?.transitionAnalysis,

      tempoAnalysis: context?.tempoAnalysis,

      sections: context?.sections,

      skillScores: context?.skillScores,

    },

  };

}



function isQuotaExceededError(errMsg, status) {

  const m = String(errMsg || '');

  return (

    status === 429 ||

    /quota|exceeded|rate.?limit|resource.?exhausted|too many requests|insufficient.*quota/i.test(m)

  );

}



function buildAdviceErrorResponse(meta = {}, message, { quotaExceeded = false } = {}) {

  return {

    available: false,

    quotaExceeded,

    source: 'none',

    provider: meta.provider || null,

    model: meta.model || null,

    message: message || 'Không thể tạo gợi ý luyện tập. Vui lòng thử lại sau.',

  };

}



function buildQuotaExceededResponse(meta = {}) {

  return buildAdviceErrorResponse(

    meta,

    'Dịch vụ gợi ý AI đã hết hạn mức. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',

    { quotaExceeded: true },

  );

}



function shouldUseLocalFallback() {

  const v = String(process.env.PRACTICE_ADVICE_LOCAL_FALLBACK ?? 'true').toLowerCase();

  return v !== 'false' && v !== '0' && v !== 'no';

}



function buildLocalFallbackResponse(context, meta = {}, warning = '') {

  const local = buildLocalPracticeAdvice(context);

  const songAssessment = mergeSongAssessment(null, context, local);



  return {

    available: true,

    source: 'local',

    provider: meta.provider || 'analysis',

    model: 'rule-based',

    aiWarning:

      warning ||

      'Không kết nối được AI — hiển thị gợi ý từ phân tích buổi luyện (rule-based).',

    ...local,

    songAssessment,

    skillScores: context?.skillScores,

    practiceMetrics: {

      chordAccuracy: context?.comparison?.chordAccuracy,

      wrongChords: context?.wrongChords,

      transitionAnalysis: context?.transitionAnalysis,

      tempoAnalysis: context?.tempoAnalysis,

      sections: context?.sections,

      skillScores: context?.skillScores,

    },

  };

}



function formatApiError(errMsg, status) {

  const m = String(errMsg || '');

  if (isQuotaExceededError(m, status)) {

    return 'Dịch vụ gợi ý AI đã hết hạn mức. Vui lòng thử lại sau.';

  }

  if (/openai_error|bad_response_status_code/i.test(m) && status === 429) {

    return 'Dịch vụ AI tạm quá tải. Vui lòng thử lại sau.';

  }

  if (/denied access|project has been denied/i.test(m)) {

    return 'Tài khoản DeepSeek bị từ chối truy cập. Kiểm tra số dư và trạng thái tại platform.deepseek.com, tạo API key mới, hoặc đổi sang Gemini (PRACTICE_ADVICE_PROVIDER=gemini).';

  }

  if (/无权访问|not authorized|does not have access/i.test(m)) {

    return 'Model AI không được phép — kiểm tra cấu hình model AI (DEEPSEEK_PRACTICE_ADVICE_MODEL / GEMINI_PRACTICE_ADVICE_MODEL).';

  }

  if (/invalid.*key|authentication fails|incorrect api key/i.test(m) || status === 401) {

    return 'API key không hợp lệ hoặc đã hết hạn. Tạo key mới tại platform.deepseek.com.';

  }

  if (/insufficient balance|余额不足/i.test(m) || status === 402) {

    return 'Tài khoản DeepSeek hết số dư. Nạp thêm tại platform.deepseek.com hoặc đổi sang provider khác.';

  }

  return `Không thể tạo gợi ý AI: ${m || `HTTP ${status}`}. Vui lòng thử lại sau.`;

}



function buildUserPrompt(context) {

  const aiPayload = {

    referenceSong: context.referenceSong || context.song,

    comparison: context.comparison,

    tempoAnalysis: context.tempoAnalysis,

    transitionAnalysis: context.transitionAnalysis,

    wrongChords: context.wrongChords,

    sections: context.sections,

    skillScores: context.skillScores,

    songValidation: context.songValidation,

    skillLevel: context.skillLevel,

  };



  return `Đánh giá buổi luyện tập guitar dựa trên dữ liệu phân tích sau.

Yêu cầu:
- performanceLevel khớp skillLevel.
- Tối đa 3 mainProblems, mỗi mục có problem/cause/impact/solution cụ thể.
- practicePlan: exercise + durationMinutes + goal.
- sectionFeedback: nhận xét từng đoạn trong sections (nếu có).
- recommendedTempo: BPM đề xuất cho buổi kế tiếp.
- skillAssessment: phản ánh skillScores, có thể điều chỉnh nhẹ nếu có lý do từ dữ liệu.
- Nếu thiếu dữ liệu, ghi rõ trong overview — không suy đoán.

Dữ liệu phân tích:

${JSON.stringify(aiPayload, null, 2)}`;

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



async function callOpenAiCompatible(context, { apiKey, baseUrl, model }) {

  const url = `${baseUrl}/chat/completions`;



  const res = await fetch(url, {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${apiKey}`,

    },

    body: JSON.stringify({

      model,

      temperature: 0.3,

      max_tokens: 2200,

      response_format: { type: 'json_object' },

      messages: [

        { role: 'system', content: SYSTEM_PROMPT },

        { role: 'user', content: buildUserPrompt(context) },

      ],

    }),

  });



  const data = await res.json().catch(() => ({}));

  return { res, data, model };

}



function handleLlmFailure(context, meta, message, { quotaExceeded = false } = {}) {

  if (shouldUseLocalFallback()) {

    return buildLocalFallbackResponse(context, meta, message);

  }

  return buildAdviceErrorResponse(meta, message, { quotaExceeded });

}



async function generateWithLlmProvider(

  context,

  { apiKey, baseUrl, model, provider, logTag, missingKeyMessage, invalidResponseMessage },

) {

  if (!apiKey || !baseUrl) {

    return handleLlmFailure(context, { provider }, missingKeyMessage);

  }



  try {

    const { res, data, model: usedModel } = await callOpenAiCompatible(context, {

      apiKey,

      baseUrl,

      model,

    });



    if (!res.ok) {

      const errMsg = data?.error?.message || `HTTP ${res.status}`;

      console.warn(`[practiceAdvice/${logTag}]`, errMsg);

      if (isQuotaExceededError(errMsg, res.status)) {

        return handleLlmFailure(

          context,

          { provider, model: usedModel },

          'Dịch vụ gợi ý AI đã hết hạn mức. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',

          { quotaExceeded: true },

        );

      }

      return handleLlmFailure(

        context,

        { provider, model: usedModel },

        formatApiError(errMsg, res.status),

      );

    }



    const raw = data?.choices?.[0]?.message?.content?.trim() || '';

    const parsed = parseLlmRaw(raw, context);

    if (!parsed) {

      console.warn(`[practiceAdvice/${logTag}] parse fail, raw:`, raw.slice(0, 300));

      return handleLlmFailure(

        context,

        { provider, model: usedModel },

        invalidResponseMessage,

      );

    }



    return mergeAdvice(context, parsed, { source: 'ai', provider, model: usedModel });

  } catch (err) {

    console.warn(`[practiceAdvice/${logTag}]`, err?.message);

    return handleLlmFailure(

      context,

      { provider, model },

      `Lỗi kết nối AI: ${err.message}`,

    );

  }

}



async function generateWithDeepSeek(context) {

  return generateWithLlmProvider(context, {

    apiKey: getDeepSeekApiKey(),

    baseUrl: getDeepSeekBaseUrl(),

    model: getDeepSeekModel(),

    provider: 'deepseek',

    logTag: 'deepseek',

    missingKeyMessage: 'Chưa cấu hình DEEPSEEK_API_KEY cho gợi ý luyện tập.',

    invalidResponseMessage: 'DeepSeek không trả dữ liệu hợp lệ. Vui lòng thử lại sau.',

  });

}



async function generateWithOpenAiCompatible(context) {

  return generateWithLlmProvider(context, {

    apiKey: getOpenAiApiKey(),

    baseUrl: getOpenAiBaseUrl(),

    model: getOpenAiModel(),

    provider: 'openai-compatible',

    logTag: 'openai',

    missingKeyMessage: 'Chưa cấu hình API gợi ý luyện tập (LLM_API_KEY / LLM_API_BASE_URL).',

    invalidResponseMessage: 'AI không trả dữ liệu hợp lệ. Vui lòng thử lại sau.',

  });

}



async function generateWithGemini(context) {

  const apiKey = getGeminiApiKey();

  if (!apiKey) {

    return handleLlmFailure(

      context,

      { provider: 'gemini' },

      'Chưa cấu hình GEMINI_API_KEY cho gợi ý luyện tập.',

    );

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

          temperature: 0.3,

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

      if (isQuotaExceededError(errMsg, res.status)) {

        return handleLlmFailure(

          context,

          { provider: 'gemini', model },

          'Dịch vụ gợi ý AI đã hết hạn mức. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',

          { quotaExceeded: true },

        );

      }

      return handleLlmFailure(

        context,

        { provider: 'gemini', model },

        formatApiError(errMsg, res.status),

      );

    }



    const raw = extractGeminiText(data);

    const parsed = parseLlmRaw(raw, context);

    if (!parsed) {

      return handleLlmFailure(

        context,

        { provider: 'gemini', model },

        'Gemini không trả dữ liệu hợp lệ. Vui lòng thử lại sau.',

      );

    }



    return mergeAdvice(context, parsed, { source: 'ai', provider: 'gemini', model });

  } catch (err) {

    return handleLlmFailure(

      context,

      { provider: 'gemini', model: getGeminiModel() },

      `Lỗi Gemini: ${err.message}`,

    );

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

  if (provider === 'deepseek') {

    return generateWithDeepSeek(context);

  }

  return generateWithOpenAiCompatible(context);

}



export function getPracticeAdviceConfigStatus() {

  const provider = resolveProvider();

  return {

    provider,

    openaiConfigured: Boolean(getOpenAiApiKey() && getOpenAiBaseUrl()),

    deepseekConfigured: Boolean(getDeepSeekApiKey()),

    geminiConfigured: Boolean(getGeminiApiKey()),

    model:

      provider === 'gemini'

        ? getGeminiModel()

        : provider === 'deepseek'

          ? getDeepSeekModel()

          : getOpenAiModel(),

    baseUrl:

      provider === 'openai'

        ? getOpenAiBaseUrl()

        : provider === 'deepseek'

          ? getDeepSeekBaseUrl()

          : null,

    localFallback: shouldUseLocalFallback(),

  };

}



export { computeSkillLevel, buildAdvancedAnalysis, validateSongMatch };


