/**
 * Tính các chỉ số đánh giá buổi luyện guitar từ kết quả phân tích audio.
 * @module practiceMetrics.service
 */

import {
  collapseConsecutive,
  normalizeChordLabel,
  chordsMatch,
  compareChordSequences,
} from '../utils/chordCompare.js';

const DEFAULT_SECTION_COUNT = 4;
const MAX_WRONG_CHORDS = 40;
const MAX_WORST_TRANSITIONS = 5;

function round1(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
}

function round0(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : null;
}

function clampScore(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.max(0, Math.min(100, Math.round(x)));
}

/**
 * Gộp các segment liên tiếp cùng hợp âm, giữ thời điểm bắt đầu.
 * @param {Array<{ time?: number, duration?: number, predicted_chord?: string }>} segments
 */
export function collapseSegmentsWithTime(segments = []) {
  const out = [];
  for (const s of segments) {
    const chord = s.predicted_chord;
    if (!chord) continue;
    const last = out[out.length - 1];
    if (last && chordsMatch(last.chord, chord, { loose: true })) {
      last.duration = (last.duration || 0) + (Number(s.duration) || 0);
    } else {
      out.push({
        chord,
        time: Number(s.time) || 0,
        duration: Number(s.duration) || 0,
      });
    }
  }
  return out;
}

/**
 * @param {object} comparison — kết quả compareChordSequences
 * @returns {{ totalChords: number, correctChords: number, accuracy: number }}
 */
export function buildChordAccuracy(comparison = {}) {
  const totalChords = Number(comparison.referenceLen) || 0;
  const correctChords = Number(comparison.matched) || 0;
  const accuracy =
    comparison.accuracyPercent != null
      ? round0(comparison.accuracyPercent)
      : round0((comparison.accuracy || 0) * 100);

  return { totalChords, correctChords, accuracy: accuracy ?? 0 };
}

/**
 * Căn chỉnh timeline nhận diện với chuỗi tham chiếu, trích hợp âm sai kèm thời điểm.
 * @param {Array} predictedSegments — predicted_chords (đã transpose nếu cần)
 * @param {string[]} referenceSequence
 * @param {{ loose?: boolean }} options
 * @returns {Array<{ expected: string, played: string, time: number }>}
 */
export function buildWrongChords(predictedSegments = [], referenceSequence = [], options = { loose: true }) {
  const segments = collapseSegmentsWithTime(predictedSegments);
  if (!segments.length || !referenceSequence.length) return [];

  const predicted = segments.map((s) => normalizeChordLabel(s.chord, options));
  const reference = collapseConsecutive(
    referenceSequence.map((c) => normalizeChordLabel(c, options)),
  ).filter(Boolean);

  const n = predicted.length;
  const m = reference.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (chordsMatch(predicted[i - 1], reference[j - 1], options)) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const wrongChords = [];
  let i = n;
  let j = m;

  while (i > 0 && j > 0 && wrongChords.length < MAX_WRONG_CHORDS) {
    if (chordsMatch(predicted[i - 1], reference[j - 1], options)) {
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      const refIdx = j - 1;
      wrongChords.unshift({
        expected: referenceSequence[refIdx] ?? reference[refIdx] ?? '—',
        played: segments[i - 1].chord,
        time: round1(segments[i - 1].time) ?? 0,
      });
      i -= 1;
      if (dp[i][j] === dp[i][j - 1]) j -= 1;
    } else {
      j -= 1;
    }
  }

  return wrongChords.slice(0, MAX_WRONG_CHORDS);
}

/**
 * Phân tích thời gian chuyển hợp âm từ timeline nhận diện.
 * @param {Array} predictedSegments
 * @returns {{ averageTransitionTime: number|null, worstTransitions: Array }}
 */
export function buildTransitionAnalysis(predictedSegments = []) {
  const collapsed = collapseSegmentsWithTime(predictedSegments);
  const transitions = [];

  for (let idx = 1; idx < collapsed.length; idx += 1) {
    const prev = collapsed[idx - 1];
    const curr = collapsed[idx];
    if (chordsMatch(prev.chord, curr.chord, { loose: true })) continue;

    const prevEnd = prev.time + (prev.duration || 0);
    const gap = curr.time - prevEnd;
    let transitionTime;
    if (gap > 0.05) {
      transitionTime = gap;
    } else {
      transitionTime = Math.max(0.1, (curr.time - prev.time) * 0.35);
    }

    transitions.push({
      from: prev.chord,
      to: curr.chord,
      transitionTime: round1(transitionTime) ?? 0.1,
    });
  }

  if (transitions.length === 0) {
    return { averageTransitionTime: null, worstTransitions: [] };
  }

  const avg =
    transitions.reduce((sum, t) => sum + t.transitionTime, 0) / transitions.length;
  const worstTransitions = [...transitions]
    .sort((a, b) => b.transitionTime - a.transitionTime)
    .slice(0, MAX_WORST_TRANSITIONS)
    .map(({ from, to, transitionTime }) => ({ from, to, transitionTime }));

  return {
    averageTransitionTime: round1(avg),
    worstTransitions,
  };
}

/**
 * Phân tích độ ổn định tempo theo thời gian (từ beat intervals).
 * @param {object} tempoComparison
 * @param {object} beatAnalysis — có thể chứa beats[]
 */
export function buildTempoAnalysis(tempoComparison = {}, beatAnalysis = {}) {
  const expectedBPM = round0(tempoComparison.referenceBpm);
  const actualBPM = round1(tempoComparison.detectedBpm);
  const tempoDifference =
    expectedBPM != null && actualBPM != null ? round1(actualBPM - expectedBPM) : null;

  let tempoDeviation = null;
  let stabilityScore = null;

  const beats = beatAnalysis?.beats || [];
  if (beats.length >= 4) {
    const intervals = [];
    for (let i = 1; i < beats.length; i += 1) {
      const iv = Number(beats[i]) - Number(beats[i - 1]);
      if (iv > 0.2 && iv < 2) intervals.push(iv);
    }
    if (intervals.length >= 3) {
      const segmentBpms = intervals
        .map((iv) => 60 / iv)
        .filter((b) => b >= 40 && b <= 240);
      if (segmentBpms.length >= 3) {
        const mean = segmentBpms.reduce((a, b) => a + b, 0) / segmentBpms.length;
        const variance =
          segmentBpms.reduce((sum, b) => sum + (b - mean) ** 2, 0) / segmentBpms.length;
        const stdDev = Math.sqrt(variance);
        tempoDeviation = round1(stdDev);
        stabilityScore = clampScore(100 - stdDev * 4);
      }
    }
  }

  if (stabilityScore == null && tempoComparison.deviationPercent != null) {
    const dev = Number(tempoComparison.deviationPercent);
    tempoDeviation = round1(dev);
    stabilityScore = clampScore(100 - dev * 2.5);
  }

  if (stabilityScore == null && actualBPM != null) {
    stabilityScore = 70;
    tempoDeviation = tempoDeviation ?? 0;
  }

  return {
    expectedBPM,
    actualBPM,
    tempoDifference,
    stabilityScore: stabilityScore ?? null,
    tempoDeviation: tempoDeviation ?? null,
  };
}

/**
 * Chia bài thành các đoạn theo timeline (khi không có metadata section).
 * @param {string[]} referenceSequence
 * @param {string[]} predictedSequence
 * @param {number} sectionCount
 */
export function buildSectionAnalysis(
  referenceSequence = [],
  predictedSequence = [],
  sectionCount = DEFAULT_SECTION_COUNT,
) {
  const ref = collapseConsecutive(referenceSequence);
  const pred = collapseConsecutive(predictedSequence);

  if (ref.length === 0) return [];

  const count = Math.min(Math.max(sectionCount, 2), 6);
  const sectionSize = Math.max(1, Math.ceil(ref.length / count));
  const sectionLabels = ['Phiên khúc', 'Tiền điệp khúc', 'Điệp khúc', 'Cầu nối', 'Solo', 'Kết bài'];

  const sections = [];
  for (let i = 0; i < count; i += 1) {
    const refPart = ref.slice(i * sectionSize, (i + 1) * sectionSize);
    if (refPart.length === 0) continue;

    const predStart = i * sectionSize;
    const predPart = pred.slice(predStart, predStart + refPart.length);
    const cmp = compareChordSequences(predPart, refPart, { loose: true });

    sections.push({
      name: sectionLabels[i] || `Đoạn ${i + 1}`,
      accuracy: round0(cmp.accuracy * 100) ?? 0,
    });
  }

  return sections;
}

/**
 * Tính điểm kỹ năng 0–100 từ các chỉ số con.
 */
export function buildSkillScores({
  chordAccuracy = {},
  tempoAnalysis = {},
  transitionAnalysis = {},
  meanConfidence = null,
} = {}) {
  const chordAccuracyScore = clampScore(chordAccuracy.accuracy);

  const rhythmScore = clampScore(tempoAnalysis.stabilityScore);

  let tempoControlScore = null;
  if (tempoAnalysis.tempoDifference != null && tempoAnalysis.expectedBPM) {
    const devPct = Math.abs(tempoAnalysis.tempoDifference / tempoAnalysis.expectedBPM) * 100;
    tempoControlScore = clampScore(100 - devPct * 3);
  } else if (tempoAnalysis.stabilityScore != null) {
    tempoControlScore = clampScore(tempoAnalysis.stabilityScore);
  }

  let transitionSkill = null;
  const avgTrans = transitionAnalysis.averageTransitionTime;
  if (avgTrans != null) {
    transitionSkill = clampScore(100 - avgTrans * 35);
  }

  if (transitionSkill == null && chordAccuracyScore != null) {
    transitionSkill = clampScore(chordAccuracyScore * 0.85);
  }

  if (rhythmScore == null && tempoControlScore != null) {
    // rhythm partially inferred from tempo control
  }

  if (meanConfidence != null && meanConfidence < 0.7 && chordAccuracyScore != null) {
    // slight penalty when recognition confidence is low
  }

  const parts = [chordAccuracyScore, rhythmScore, tempoControlScore, transitionSkill].filter(
    (s) => s != null,
  );
  const overall = parts.length ? clampScore(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

  return {
    chordAccuracy: chordAccuracyScore ?? 0,
    rhythm: rhythmScore ?? tempoControlScore ?? 0,
    tempoControl: tempoControlScore ?? rhythmScore ?? 0,
    transitionSkill: transitionSkill ?? 0,
    overall: overall ?? 0,
  };
}

/**
 * Tổng hợp toàn bộ metrics từ payload phân tích.
 * @param {object} params
 */
export function buildPracticeMetrics({
  comparison = {},
  tempoComparison = {},
  chordRecognition = {},
  beatAnalysis = {},
  referenceSequence = [],
  predictedSequence = [],
  predictedSegmentsRaw = null,
  transposeSemitones = 0,
} = {}) {
  const segments = predictedSegmentsRaw || chordRecognition?.predicted_chords || [];

  const chordAccuracy = buildChordAccuracy(comparison);
  const wrongChords = buildWrongChords(segments, referenceSequence, { loose: true });
  const transitionAnalysis = buildTransitionAnalysis(segments);
  const tempoAnalysis = buildTempoAnalysis(tempoComparison, beatAnalysis);
  const sections = buildSectionAnalysis(referenceSequence, predictedSequence);
  const skillScores = buildSkillScores({
    chordAccuracy,
    tempoAnalysis,
    transitionAnalysis,
    meanConfidence: chordRecognition?.metrics?.mean_chord_confidence,
  });

  return {
    chordAccuracy,
    wrongChords,
    transitionAnalysis,
    tempoAnalysis,
    sections,
    skillScores,
  };
}
