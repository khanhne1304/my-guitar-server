/**
 * Tính trình độ và phân tích nâng cao từ dữ liệu phân tích guitar (không bịa số liệu).
 */

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export function computeSkillLevel(accuracyPercent, bpmDeviationPercent) {
  const acc = Number(accuracyPercent);
  const dev = Number(bpmDeviationPercent);

  if (Number.isFinite(acc) && acc >= 90) {
    if (!Number.isFinite(dev) || dev <= 5) return 'Advanced';
  }
  if (Number.isFinite(acc) && acc >= 70) return 'Intermediate';
  if (Number.isFinite(acc)) return 'Beginner';
  return 'Beginner';
}

function countSequenceMismatches(refSeq = [], predSeq = []) {
  const len = Math.min(refSeq.length, predSeq.length);
  let mismatches = 0;
  const examples = [];

  for (let i = 0; i < len; i += 1) {
    if (refSeq[i] !== predSeq[i]) {
      mismatches += 1;
      if (examples.length < 3) {
        examples.push({ position: i + 1, expected: refSeq[i], played: predSeq[i] });
      }
    }
  }

  return { mismatches, compared: len, examples };
}

function coverageRatio(matched, referenceLen) {
  const m = Number(matched);
  const r = Number(referenceLen);
  if (!Number.isFinite(m) || !Number.isFinite(r) || r <= 0) return null;
  return m / r;
}

/**
 * @param {object} ctx — context từ buildAnalysisContext (trước khi gửi LLM)
 */
export function buildAdvancedAnalysis(ctx = {}) {
  const ch = ctx.chordMatch || {};
  const tempo = ctx.tempo || {};
  const rec = ctx.recognition || {};
  const refSeq = String(ctx.sequences?.referenceSample || '')
    .split(' → ')
    .filter(Boolean);
  const predSeq = String(ctx.sequences?.detectedAlignedSample || '')
    .split(' → ')
    .filter(Boolean);

  const analysis = {};

  if (refSeq.length >= 2 && predSeq.length >= 2) {
    const { mismatches, compared, examples } = countSequenceMismatches(refSeq, predSeq);
    if (compared >= 2) {
      const smoothRatio = 1 - mismatches / compared;
      let assessment;
      if (smoothRatio >= 0.9) {
        assessment = 'Chuyển hợp âm khá mượt, phần lớn đoạn đúng thứ tự bài gốc.';
      } else if (smoothRatio >= 0.7) {
        assessment =
          'Một số đoạn chuyển hợp âm còn chậm hoặc sai thứ tự, khiến bài chưa liền mạch.';
      } else {
        assessment =
          'Nhiều đoạn chuyển hợp âm chưa đúng — cần luyện riêng từng cặp hợp âm hay gặp lỗi.';
      }
      analysis.chordTransition = {
        available: true,
        mismatchCount: mismatches,
        comparedSegments: compared,
        examples,
        assessment,
      };
    }
  }

  if (tempo.detectedBpm != null) {
    const rating = tempo.rating;
    let assessment;
    if (rating === 'good') {
      assessment = 'Nhịp khá ổn định, bạn giữ được tempo suốt bài.';
    } else if (rating === 'mild' || rating === 'moderate') {
      assessment =
        'Nhịp có lúc dao động — thường do mất tập trung khi chuyển hợp âm hoặc chưa quen đếm phách.';
    } else if (rating === 'high') {
      assessment =
        'Nhịp chưa ổn định — bạn dễ chơi nhanh/chậm hơn bài gốc ở các đoạn khó.';
    } else if (rating === 'unknown') {
      assessment = 'Chưa so sánh được nhịp với bài gốc vì thiếu BPM tham chiếu.';
    }
    if (assessment) {
      analysis.rhythmStability = { available: true, rating: rating || 'unknown', assessment };
    }
  }

  if (tempo.referenceBpm != null && tempo.detectedBpm != null) {
    const dev = Number(tempo.deviationPercent);
    const dir =
      tempo.direction === 'faster'
        ? 'nhanh hơn'
        : tempo.direction === 'slower'
          ? 'chậm hơn'
          : 'gần đúng với';
    let assessment;
    if (Number.isFinite(dev) && dev <= 5) {
      assessment = 'Tốc độ bạn chơi gần khớp với bài gốc.';
    } else if (Number.isFinite(dev)) {
      assessment = `Bạn đang chơi ${dir} bài gốc — có thể do còn mất thời gian khi chuyển hợp âm.`;
    }
    if (assessment) {
      analysis.bpmAccuracy = {
        available: true,
        direction: tempo.direction,
        assessment,
      };
    }
  }

  if (rec.meanConfidence != null) {
    const conf = Number(rec.meanConfidence);
    let assessment;
    if (conf >= 0.85) {
      assessment = 'Tiếng đàn rõ, hệ thống nhận diện hợp âm khá tự tin.';
    } else if (conf >= 0.7) {
      assessment = 'Âm thanh đủ nghe được, nhưng một số hợp âm chưa rõ ràng hoàn toàn.';
    } else {
      assessment =
        'Một số hợp âm nghe chưa rõ — thử strum đều hơn, kiểm tra chỉnh dây và tránh tiếng rè.';
    }
    analysis.chordConfidence = { available: true, assessment };
  }

  const acc = ch.accuracyPercent;
  if (acc != null) {
    let assessment;
    if (acc >= 85) {
      assessment = 'Bạn đã nhớ phần lớn các hợp âm của bài hát.';
    } else if (acc >= 60) {
      assessment = 'Bạn nhớ được nhiều hợp âm, nhưng vẫn còn vài chỗ chưa chắc tay.';
    } else {
      assessment = 'Bạn mới làm quen với progression — cần luyện thêm thứ tự hợp âm.';
    }
    analysis.chordMemory = { available: true, assessment };
  }

  const coverage = coverageRatio(ch.matched, ch.referenceLen);
  if (acc != null && coverage != null) {
    let assessment;
    const masteryScore = (acc / 100) * coverage;
    if (masteryScore >= 0.85) {
      assessment = 'Bạn đã chơi được gần như trọn bài với độ chính xác tốt.';
    } else if (masteryScore >= 0.55) {
      assessment = 'Bạn đã nắm được phần lớn bài, còn vài đoạn cần củng cố thêm.';
    } else {
      assessment = 'Bạn mới chơi được một phần bài — hãy chia nhỏ từng đoạn để luyện dần.';
    }
    analysis.songMastery = {
      available: true,
      coveragePercent: Math.round(coverage * 100),
      assessment,
    };
  }

  return analysis;
}

export function normalizeLevel(level, fallbackAccuracy, fallbackBpmDev) {
  const raw = String(level || '').trim();
  const normalized =
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (LEVELS.includes(normalized)) return normalized;
  return computeSkillLevel(fallbackAccuracy, fallbackBpmDev);
}
