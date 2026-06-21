/**
 * Chạy: node --test src/services/practiceAdviceQuota.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Re-implement detection logic mirror for isolated test (exported via dynamic import if added later)
function isQuotaExceededError(errMsg, status) {
  const m = String(errMsg || '');
  return (
    status === 429 ||
    /quota|exceeded|rate.?limit|resource.?exhausted|too many requests|insufficient.*quota/i.test(
      m,
    )
  );
}

describe('isQuotaExceededError', () => {
  it('nhận diện Gemini quota exceeded', () => {
    assert.equal(
      isQuotaExceededError('You exceeded your current quota, please check your plan.', 429),
      true,
    );
  });

  it('nhận diện HTTP 429', () => {
    assert.equal(isQuotaExceededError('Too Many Requests', 429), true);
  });

  it('không nhầm lỗi auth với quota', () => {
    assert.equal(isQuotaExceededError('API key not valid', 401), false);
  });
});
