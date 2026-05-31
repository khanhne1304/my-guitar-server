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

  chordRecognition: {

    metrics: {

      n_chord_segments: 24,

      mean_chord_confidence: 0.82,

    },

    predicted_chords: [

      { time: 0, predicted_chord: 'G', confidence: 0.9 },

      { time: 2, predicted_chord: 'Em', confidence: 0.85 },

      { time: 4, predicted_chord: 'C', confidence: 0.8 },

    ],

  },

};



function validateSchema(advice) {

  const required = [

    'level',

    'overview',

    'strengths',

    'mainProblems',

    'prioritySkill',

    'practicePlan',

    'nextGoal',

    'encouragement',

    'songAssessment',

  ];

  for (const key of required) {

    if (advice[key] === undefined) return { ok: false, missing: key };

  }

  if (!['Beginner', 'Intermediate', 'Advanced'].includes(advice.level)) {

    return { ok: false, missing: 'level enum' };

  }

  if (!Array.isArray(advice.strengths)) return { ok: false, missing: 'strengths array' };

  if (!Array.isArray(advice.mainProblems)) return { ok: false, missing: 'mainProblems array' };

  if (!Array.isArray(advice.practicePlan)) return { ok: false, missing: 'practicePlan array' };

  if (!advice.songAssessment || typeof advice.songAssessment.isCorrectSong !== 'boolean') {

    return { ok: false, missing: 'songAssessment' };

  }

  if (!advice.songAssessment.summary) return { ok: false, missing: 'songAssessment.summary' };

  return { ok: true };

}



const config = getPracticeAdviceConfigStatus();

console.log('=== Config ===');

console.log(JSON.stringify(config, null, 2));



const context = buildAnalysisContext(samplePayload);

console.log('\n=== Skill level ===');

console.log('computed:', computeSkillLevel(68, 8.3));

console.log('context.skillLevel:', context.skillLevel);

console.log('advancedAnalysis keys:', Object.keys(context.advancedAnalysis || {}));
console.log('songValidation:', JSON.stringify(context.songValidation, null, 2));



const localOnly = buildLocalPracticeAdvice(context);

console.log('\n=== Local fallback schema ===');

console.log(JSON.stringify(validateSchema(localOnly), null, 2));

console.log('mainProblems:', localOnly.mainProblems.length);

console.log('practicePlan:', localOnly.practicePlan.length);



console.log('\n=== Calling generatePracticeAdvice ===');

const start = Date.now();

const advice = await generatePracticeAdvice(samplePayload);

const elapsed = Date.now() - start;



console.log(`Elapsed: ${elapsed}ms`);

console.log('=== Result ===');

console.log(JSON.stringify({

  available: advice.available,

  source: advice.source,

  provider: advice.provider,

  model: advice.model,

  aiWarning: advice.aiWarning || null,

  level: advice.level,

  overview: advice.overview?.slice(0, 120),

  strengthsCount: advice.strengths?.length,

  mainProblemsCount: advice.mainProblems?.length,

  practicePlanCount: advice.practicePlan?.length,

  nextGoal: advice.nextGoal?.slice(0, 80),

  encouragement: advice.encouragement?.slice(0, 80),

  songAssessment: advice.songAssessment,

}, null, 2));



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

