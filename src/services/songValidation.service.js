/**
 * Song Validation — đánh giá người chơi có đang thể hiện đúng bài hát tham chiếu hay không.
 *
 * So sánh progression hợp âm (hoặc chuỗi sự kiện nhạc cụ khác) bằng:
 * - LCS (Longest Common Subsequence) với so khớp phần tử mềm
 * - Khoảng cách Levenshtein (substitute / insert / delete)
 * - Coverage — độ dài bản ghi so với bài gốc
 *
 * Thiết kế generic: mọi hàm nhận mảng chuỗi + optional matcher/normalizer.
 */

import {
  chordsMatch,
  collapseConsecutive,
  normalizeChordLabel,
} from '../utils/chordCompare.js';

const CATEGORY_THRESHOLDS = [
  { min: 85, category: 'correct', isCorrectSong: true },
  { min: 70, category: 'mostly_correct', isCorrectSong: false },
  { min: 50, category: 'partially_correct', isCorrectSong: false },
  { min: 0, category: 'incorrect', isCorrectSong: false },
];

const ASSESSMENTS = {
  correct:
    'Người chơi đang thể hiện đúng bài hát, chỉ xuất hiện một vài lỗi nhỏ.',
  mostly_correct:
    'Người chơi đã bám sát phần lớn cấu trúc bài hát nhưng vẫn còn một số đoạn chưa chính xác.',
  partially_correct:
    'Người chơi mới tái hiện được một phần bài hát và cần luyện thêm để hoàn thiện.',
  incorrect:
    'Chuỗi hợp âm hiện tại khác đáng kể so với bài hát tham chiếu.',
};

const SONG_ASSESSMENT_SUMMARIES = {
  correct: 'Bạn đang bám sát cấu trúc bài hát.',
  mostly_correct:
    'Bạn đã bám sát phần lớn cấu trúc bài hát nhưng vẫn còn một số đoạn chưa chính xác.',
  partially_correct:
    'Bạn mới tái hiện được một phần bài hát — hãy luyện thêm để hoàn thiện progression.',
  incorrect: 'Chuỗi hợp âm hiện tại khác đáng kể so với bài hát gốc.',
};

/** Chuẩn hóa và gộp phần tử liên tiếp trùng nhau (progression guitar). */
export function normalizeSequence(raw, { normalize = defaultNormalize, collapse = true } = {}) {
  const mapped = (Array.isArray(raw) ? raw : [])
    .map((item) => normalize(item))
    .filter(Boolean);
  return collapse ? collapseConsecutive(mapped) : mapped;
}

function defaultNormalize(chord) {
  return normalizeChordLabel(chord, { loose: true });
}

function defaultElementsMatch(a, b, options = {}) {
  return chordsMatch(a, b, { loose: true, ...options });
}

/**
 * LCS với so khớp phần tử tùy chỉnh (DP O(n·m)).
 * @returns {number} độ dài LCS
 */
export function longestCommonSubsequenceLength(seqA, seqB, elementsMatch = defaultElementsMatch) {
  const n = seqA.length;
  const m = seqB.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (elementsMatch(seqA[i - 1], seqB[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m];
}

/**
 * Độ tương đồng từ LCS — Dice coefficient trên hai chuỗi (0–100).
 * Công thức: 2·|LCS| / (|A| + |B|) — phản ánh giống nhau toàn progression, không chỉ matched/refLen.
 */
export function computeSequenceSimilarityFromLcs(reference, detected, elementsMatch = defaultElementsMatch) {
  const refLen = reference.length;
  const detLen = detected.length;
  if (refLen === 0 && detLen === 0) return 100;
  if (refLen === 0 || detLen === 0) return 0;

  const lcs = longestCommonSubsequenceLength(reference, detected, elementsMatch);
  return Math.round((2 * lcs) / (refLen + detLen) * 100);
}

/**
 * Levenshtein với chi phí 0 khi phần tử khớp (so khớp mềm), 1 khi thay/insert/delete.
 * @returns {number} similarity 0–100
 */
export function computeSequenceSimilarityFromLevenshtein(
  reference,
  detected,
  elementsMatch = defaultElementsMatch,
) {
  const n = reference.length;
  const m = detected.length;
  if (n === 0 && m === 0) return 100;
  const maxLen = Math.max(n, m, 1);

  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i][0] = i;
  for (let j = 0; j <= m; j += 1) dp[0][j] = j;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = elementsMatch(reference[i - 1], detected[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  const distance = dp[n][m];
  return Math.round((1 - distance / maxLen) * 100);
}

/** Trung bình LCS-Dice và Levenshtein — ưu tiên cả hai như yêu cầu. */
export function computeSequenceSimilarity(reference, detected, elementsMatch = defaultElementsMatch) {
  const lcsScore = computeSequenceSimilarityFromLcs(reference, detected, elementsMatch);
  const levScore = computeSequenceSimilarityFromLevenshtein(reference, detected, elementsMatch);
  return Math.round((lcsScore + levScore) / 2);
}

/**
 * Phần trăm bản ghi đã cover bài gốc (theo độ dài chuỗi sau chuẩn hóa).
 * coveragePercent = min(|detected|, |reference|) / |reference| × 100
 */
export function computeCoveragePercent(referenceLength, detectedLength) {
  const refLen = Number(referenceLength);
  const detLen = Number(detectedLength);
  if (!Number.isFinite(refLen) || refLen <= 0) return 0;
  if (!Number.isFinite(detLen) || detLen < 0) return 0;
  return Math.round((Math.min(detLen, refLen) / refLen) * 100);
}

export function resolveCategory(matchPercent) {
  const score = Number(matchPercent);
  for (const row of CATEGORY_THRESHOLDS) {
    if (score >= row.min) return row;
  }
  return CATEGORY_THRESHOLDS[CATEGORY_THRESHOLDS.length - 1];
}

export function buildAssessment(category) {
  return ASSESSMENTS[category] || ASSESSMENTS.incorrect;
}

export function buildConfidence(matchPercent, coveragePercent, sequenceSimilarity) {
  const spread = Math.abs(sequenceSimilarity - coveragePercent);
  if (matchPercent >= 85 && spread <= 15) return 'high';
  if (matchPercent >= 70 || (matchPercent >= 50 && spread <= 25)) return 'medium';
  return 'low';
}

/**
 * matchPercent — điểm tổng hợp để phân loại đúng/sai bài.
 * Trọng số: 70% sequence similarity + 30% coverage (progression quan trọng hơn độ dài thuần).
 */
export function computeMatchPercent(sequenceSimilarity, coveragePercent) {
  const seq = Number(sequenceSimilarity);
  const cov = Number(coveragePercent);
  if (!Number.isFinite(seq)) return 0;
  if (!Number.isFinite(cov)) return Math.round(seq);
  return Math.round(seq * 0.7 + cov * 0.3);
}

/**
 * @param {string[]} referenceChords — progression bài gốc (HopAmChuan / tham chiếu)
 * @param {string[]} detectedChords — progression nhận diện từ audio (đã align nếu có)
 * @param {object} [options]
 * @param {function} [options.normalize]
 * @param {function} [options.elementsMatch]
 * @param {boolean} [options.collapse=true]
 * @returns {object} kết quả validation
 */
export function validateSongMatch(referenceChords, detectedChords, options = {}) {
  const normalize = options.normalize || defaultNormalize;
  const elementsMatch = options.elementsMatch || defaultElementsMatch;
  const collapse = options.collapse !== false;

  // Progression: gộp hợp âm liên tiếp trùng để so khớp cấu trúc bài.
  const reference = normalizeSequence(referenceChords, { normalize, collapse });
  const detected = normalizeSequence(detectedChords, { normalize, collapse });

  // Coverage: đếm theo số hợp âm sau chuẩn hóa (không collapse) — khớp referenceLen từ pipeline.
  const referenceForCoverage = normalizeSequence(referenceChords, { normalize, collapse: false });
  const detectedForCoverage = normalizeSequence(detectedChords, { normalize, collapse: false });

  const sequenceSimilarity = computeSequenceSimilarity(reference, detected, elementsMatch);
  const coveragePercent = computeCoveragePercent(
    referenceForCoverage.length,
    detectedForCoverage.length,
  );
  const matchPercent = computeMatchPercent(sequenceSimilarity, coveragePercent);

  const { category, isCorrectSong } = resolveCategory(matchPercent);
  const confidence = buildConfidence(matchPercent, coveragePercent, sequenceSimilarity);
  const assessment = buildAssessment(category);

  return {
    isCorrectSong,
    category,
    matchPercent,
    sequenceSimilarity,
    coveragePercent,
    confidence,
    assessment,
    referenceLength: referenceForCoverage.length,
    detectedLength: detectedForCoverage.length,
  };
}

/** Sinh songAssessment cho merge khi LLM không trả field. */
export function buildSongAssessmentFromValidation(songValidation) {
  if (!songValidation || typeof songValidation !== 'object') {
    return {
      isCorrectSong: false,
      summary: SONG_ASSESSMENT_SUMMARIES.incorrect,
    };
  }

  const category = songValidation.category || 'incorrect';
  const summary =
    SONG_ASSESSMENT_SUMMARIES[category] ||
    songValidation.assessment ||
    SONG_ASSESSMENT_SUMMARIES.incorrect;

  return {
    isCorrectSong: Boolean(songValidation.isCorrectSong),
    summary,
  };
}

export function sanitizeSongAssessment(raw, songValidation) {
  if (!raw || typeof raw !== 'object') {
    return buildSongAssessmentFromValidation(songValidation);
  }

  const summary = String(raw.summary || raw.tom_tat || raw.mo_ta || '').trim();
  const fromValidation = buildSongAssessmentFromValidation(songValidation);

  if (!summary) return fromValidation;

  return {
    isCorrectSong:
      typeof raw.isCorrectSong === 'boolean'
        ? raw.isCorrectSong
        : fromValidation.isCorrectSong,
    summary,
  };
}
