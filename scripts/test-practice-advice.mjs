/**
 * Smoke test: gợi ý luyện tập AI (local + LLM).
 * Chạy: node scripts/test-practice-advice.mjs
 */

import '../src/loadEnv.js';

import {
  generatePracticeAdvice,
  getPracticeAdviceConfigStatus,
  buildAnalysisContext,
  computeSkillLevel,
} from '../src/services/practiceAdvice.service.js';
import { buildLocalPracticeAdvice } from '../src/services/practiceAdviceLocal.js';
import { buildPracticeMetrics } from '../src/services/practiceMetrics.service.js';

const samplePayload = {
  referenceSong: {
    title: 'Em của ngày hôm qua',
    artist: 'Sơn Tùng M-TP',
    key: 'G',
    capo: 0,
    rhythm: 'Ballade',
    tempo: 72,
  },
  comparison: {
    accuracyPercent: 68,
    matched: 17,
    referenceLen: 25,
    referenceSequence: ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am', 'D'],
    predictedSequence: ['G', 'Em', 'C', 'D', 'G', 'G', 'Am', 'D'],
    predictedSequenceRaw: ['G', 'Em', 'C', 'D', 'G', 'G', 'Am', 'D'],
    compareNote: null,
    transposeSemitones: 0,
    hopamCapo: 0,
    analyzedTranspose: 0,
  },
  tempoComparison: {
    referenceBpm: 72,
    detectedBpm: 78,
    deviationPercent: 8.3,
    direction: 'faster',
    rating: 'moderate',
  },
  beatAnalysis: {
    success: true,
    bpm: 78,
    beatCount: 40,
    beats: Array.from({ length: 40 }, (_, i) => i * 0.75 + Math.sin(i) * 0.05),
  },
  chordRecognition: {
    metrics: {
      n_chord_segments: 24,
      mean_chord_confidence: 0.82,
    },
    predicted_chords: [
      { time: 0, duration: 2, predicted_chord: 'G', confidence: 0.9 },
      { time: 2, duration: 2, predicted_chord: 'Em', confidence: 0.85 },
      { time: 4, duration: 2, predicted_chord: 'C', confidence: 0.8 },
      { time: 6, duration: 2, predicted_chord: 'D', confidence: 0.88 },
      { time: 8, duration: 2.2, predicted_chord: 'G', confidence: 0.9 },
      { time: 10.5, duration: 1.8, predicted_chord: 'G', confidence: 0.7 },
      { time: 12.5, duration: 2, predicted_chord: 'Am', confidence: 0.82 },
      { time: 14.5, duration: 2, predicted_chord: 'D', confidence: 0.86 },
    ],
  },
};

samplePayload.practiceMetrics = buildPracticeMetrics({
  comparison: samplePayload.comparison,
  tempoComparison: samplePayload.tempoComparison,
  chordRecognition: samplePayload.chordRecognition,
  beatAnalysis: samplePayload.beatAnalysis,
  referenceSequence: samplePayload.comparison.referenceSequence,
  predictedSequence: samplePayload.comparison.predictedSequence,
});

function validateSchema(advice) {
  const required = [
    'performanceLevel',
    'overview',
    'strengths',
    'weaknesses',
    'mainProblems',
    'practicePlan',
    'nextSessionGoal',
    'recommendedTempo',
    'skillAssessment',
    'songAssessment',
  ];
  for (const key of required) {
    if (advice[key] === undefined) return { ok: false, missing: key };
  }
  const level = advice.performanceLevel || advice.level;
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
    return { ok: false, missing: 'performanceLevel enum' };
  }
  if (!Array.isArray(advice.strengths)) return { ok: false, missing: 'strengths array' };
  if (!Array.isArray(advice.weaknesses)) return { ok: false, missing: 'weaknesses array' };
  if (!Array.isArray(advice.mainProblems)) return { ok: false, missing: 'mainProblems array' };
  if (!Array.isArray(advice.practicePlan)) return { ok: false, missing: 'practicePlan array' };
  if (!advice.songAssessment || typeof advice.songAssessment.isCorrectSong !== 'boolean') {
    return { ok: false, missing: 'songAssessment' };
  }
  if (!advice.skillAssessment || advice.skillAssessment.overall == null) {
    return { ok: false, missing: 'skillAssessment.overall' };
  }
  return { ok: true };
}

const config = getPracticeAdviceConfigStatus();
console.log('=== Config ===');
console.log(JSON.stringify(config, null, 2));

const context = buildAnalysisContext(samplePayload);
console.log('\n=== Skill level ===');
console.log('computed:', computeSkillLevel(68, 8.3));
console.log('context.skillLevel:', context.skillLevel);
console.log('skillScores:', JSON.stringify(context.skillScores, null, 2));
console.log('wrongChords:', context.wrongChords?.length);
console.log('sections:', context.sections?.length);

const localOnly = buildLocalPracticeAdvice(context);
console.log('\n=== Local fallback schema ===');
console.log(JSON.stringify(validateSchema(localOnly), null, 2));
console.log('mainProblems:', localOnly.mainProblems.length);
console.log('practicePlan:', localOnly.practicePlan.length);
console.log('sectionFeedback:', localOnly.sectionFeedback?.length);

console.log('\n=== Calling generatePracticeAdvice ===');
const start = Date.now();
const advice = await generatePracticeAdvice(samplePayload);
const elapsed = Date.now() - start;

console.log(`Elapsed: ${elapsed}ms`);
console.log('=== Result ===');
console.log(
  JSON.stringify(
    {
      available: advice.available,
      source: advice.source,
      provider: advice.provider,
      model: advice.model,
      aiWarning: advice.aiWarning || null,
      performanceLevel: advice.performanceLevel || advice.level,
      overview: advice.overview?.slice(0, 120),
      strengthsCount: advice.strengths?.length,
      weaknessesCount: advice.weaknesses?.length,
      mainProblemsCount: advice.mainProblems?.length,
      practicePlanCount: advice.practicePlan?.length,
      nextSessionGoal: advice.nextSessionGoal?.slice(0, 80),
      recommendedTempo: advice.recommendedTempo,
      skillAssessment: advice.skillAssessment,
      songAssessment: advice.songAssessment,
    },
    null,
    2,
  ),
);

const schemaCheck = validateSchema(advice);
const ok =
  advice.available &&
  schemaCheck.ok &&
  (advice.overview || advice.strengths?.length || advice.practicePlan?.length);

console.log('\n=== Schema validation ===');
console.log(schemaCheck);
console.log('\n=== Verdict ===');
console.log(ok ? 'PASS — gợi ý luyện tập hoạt động' : 'FAIL — thiếu nội dung hoặc schema sai');
process.exit(ok ? 0 : 1);
