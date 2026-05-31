/**
 * Unit tests — songValidation.service.js
 * Chạy: node --test src/services/songValidation.service.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSongMatch,
  computeSequenceSimilarity,
  computeCoveragePercent,
  computeSequenceSimilarityFromLcs,
  longestCommonSubsequenceLength,
} from './songValidation.service.js';

describe('validateSongMatch', () => {
  it('nhận diện progression gần khớp (ví dụ G Em C D … Am thay Em)', () => {
    const reference = ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'];
    const detected = ['G', 'Em', 'C', 'D', 'G', 'Am', 'C', 'G'];

    const result = validateSongMatch(reference, detected);

    assert.ok(result.sequenceSimilarity >= 75 && result.sequenceSimilarity <= 95);
    assert.equal(result.coveragePercent, 100);
    assert.ok(result.matchPercent >= 70);
    assert.ok(['correct', 'mostly_correct'].includes(result.category));
    assert.ok(result.assessment.length > 10);
  });

  it('progression khác hẳn => incorrect', () => {
    const reference = ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'];
    const detected = ['F#', 'D#m', 'B', 'C#', 'F#', 'D#m', 'B', 'C#'];

    const result = validateSongMatch(reference, detected);

    assert.ok(result.matchPercent < 50, `expected <50, got ${result.matchPercent}`);
    assert.equal(result.category, 'incorrect');
    assert.equal(result.isCorrectSong, false);
  });

  it('đúng bài gần hoàn hảo => correct', () => {
    const reference = ['G', 'Em', 'C', 'D'];
    const detected = ['G', 'Em', 'C', 'D'];

    const result = validateSongMatch(reference, detected);

    assert.equal(result.sequenceSimilarity, 100);
    assert.equal(result.coveragePercent, 100);
    assert.equal(result.matchPercent, 100);
    assert.equal(result.category, 'correct');
    assert.equal(result.isCorrectSong, true);
    assert.equal(result.confidence, 'high');
  });

  it('coverage khi detected ngắn hơn reference (25 vs 20 hợp âm)', () => {
    const reference = Array.from({ length: 25 }, (_, i) => (i % 4 === 0 ? 'G' : i % 4 === 1 ? 'Em' : i % 4 === 2 ? 'C' : 'D'));
    const detected = reference.slice(0, 20);

    assert.equal(computeCoveragePercent(25, 20), 80);

    const result = validateSongMatch(reference, detected);
    assert.equal(result.coveragePercent, 80);
  });

  it('coverage 80% với 25 ref / 20 det (khác hợp âm)', () => {
    const reference = Array.from({ length: 25 }, (_, i) => (i % 2 === 0 ? 'G' : 'Em'));
    const detected = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 'G' : 'Em'));

    assert.equal(computeCoveragePercent(25, 20), 80);

    const result = validateSongMatch(reference, detected);
    assert.equal(result.coveragePercent, 80);
  });

  it('chuỗi rỗng => incorrect, matchPercent thấp', () => {
    const result = validateSongMatch(['G', 'C'], []);
    assert.equal(result.coveragePercent, 0);
    assert.equal(result.isCorrectSong, false);
  });
});

describe('sequence algorithms', () => {
  it('LCS length khớp với compareChordSequences logic', () => {
    const ref = ['G', 'Em', 'C', 'D'];
    const det = ['G', 'Em', 'Am', 'D'];
    const lcs = longestCommonSubsequenceLength(ref, det, (a, b) => a === b);
    assert.equal(lcs, 3);
    const sim = computeSequenceSimilarityFromLcs(ref, det, (a, b) => a === b);
    assert.equal(sim, Math.round((2 * 3) / 8 * 100));
  });

  it('computeSequenceSimilarity trả về 100 khi giống hệt', () => {
    const seq = ['A', 'B', 'C'];
    assert.equal(computeSequenceSimilarity(seq, seq, (a, b) => a === b), 100);
  });
});
