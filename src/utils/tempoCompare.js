/**
 * So sánh tempo (BPM) giữa bài tham chiếu và audio người chơi.
 */

const DEVIATION_GOOD = 5;
const DEVIATION_WARN = 10;
const DEVIATION_HIGH = 20;

export function parseHopamTempo(rhythm) {
  const rhythmRaw = String(rhythm || '').trim();
  let timeSignature = null;
  let bpm = null;

  const tsMatch = rhythmRaw.match(/(\d+)\s*\/\s*(\d+)/);
  if (tsMatch) timeSignature = `${tsMatch[1]}/${tsMatch[2]}`;

  const bpmExplicit = rhythmRaw.match(/(\d{2,3})\s*bpm/i);
  if (bpmExplicit) {
    bpm = Number(bpmExplicit[1]);
  } else {
    const nums = [...rhythmRaw.matchAll(/\b(\d{2,3})\b/g)].map((m) => Number(m[1]));
    const candidate = nums.find((n) => n >= 40 && n <= 240);
    if (candidate) bpm = candidate;
  }

  return { bpm, timeSignature, rhythmRaw };
}

export function resolveReferenceBpm({ referenceBpm, referenceSong } = {}) {
  const fromBody = Number(referenceBpm);
  if (Number.isFinite(fromBody) && fromBody >= 30 && fromBody <= 300) {
    return { bpm: Math.round(fromBody), source: 'client' };
  }

  if (referenceSong?.tempo && referenceSong.tempo >= 30 && referenceSong.tempo <= 300) {
    return { bpm: Math.round(referenceSong.tempo), source: 'hopam' };
  }

  const parsed = parseHopamTempo(referenceSong?.rhythm);
  if (parsed.bpm) {
    return { bpm: parsed.bpm, source: 'hopam_rhythm', timeSignature: parsed.timeSignature };
  }

  return { bpm: null, source: null, timeSignature: parsed.timeSignature || referenceSong?.rhythm || null };
}

/**
 * @param {{ referenceBpm: number|null, detectedBpm: number|null, detector?: string }}
 */
export function buildTempoComparison({ referenceBpm, detectedBpm, detector = 'chordmini' }) {
  const ref = Number(referenceBpm);
  const det = Number(detectedBpm);

  if (!Number.isFinite(det) || det <= 0) {
    return {
      success: false,
      error: 'Không ước lượng được tempo từ audio.',
      detectedBpm: null,
      referenceBpm: Number.isFinite(ref) ? ref : null,
      detector,
    };
  }

  if (!Number.isFinite(ref) || ref <= 0) {
    return {
      success: true,
      referenceBpm: null,
      detectedBpm: Math.round(det * 10) / 10,
      deviationBpm: null,
      deviationPercent: null,
      direction: null,
      rating: 'unknown',
      suggestions: [
        {
          level: 'info',
          message:
            'Bài HopAmChuan chưa có BPM rõ — đặt tempo trên trang bài hát (máy đếm nhịp) rồi phân tích lại.',
        },
      ],
      detector,
    };
  }

  const deviationBpm = Math.round((det - ref) * 10) / 10;
  const deviationPercent = Math.round((Math.abs(deviationBpm) / ref) * 1000) / 10;
  const direction = deviationBpm > 0.5 ? 'faster' : deviationBpm < -0.5 ? 'slower' : 'match';

  let rating = 'good';
  if (deviationPercent > DEVIATION_HIGH) rating = 'high';
  else if (deviationPercent > DEVIATION_WARN) rating = 'moderate';
  else if (deviationPercent > DEVIATION_GOOD) rating = 'mild';

  const suggestions = buildTempoSuggestions({
    rating,
    deviationPercent,
    direction,
    referenceBpm: ref,
    detectedBpm: det,
  });

  return {
    success: true,
    referenceBpm: ref,
    detectedBpm: Math.round(det * 10) / 10,
    deviationBpm,
    deviationPercent,
    direction,
    rating,
    suggestions,
    detector,
  };
}

function buildTempoSuggestions({
  rating,
  deviationPercent,
  direction,
  referenceBpm,
  detectedBpm,
}) {
  const list = [];
  const dirLabel =
    direction === 'faster'
      ? 'nhanh hơn'
      : direction === 'slower'
        ? 'chậm hơn'
        : 'đúng';

  if (rating === 'good') {
    list.push({
      level: 'ok',
      message: `Tempo ổn (lệch ${deviationPercent}%). Tiếp tục luyện độ chính xác hợp âm.`,
    });
    return list;
  }

  list.push({
    level: 'warn',
    message: `Bạn chơi ${dirLabel} bài gốc khoảng ${deviationPercent}% (${detectedBpm} BPM vs ${referenceBpm} BPM).`,
  });

  if (rating === 'mild') {
    list.push({
      level: 'tip',
      message: 'Luyện với máy đếm nhịp ở BPM bài gốc, gõ chân theo phách trước khi đánh hợp âm.',
      practicePath: '/tools/chord-practice/rhythm',
      practiceQuery: { bpm: referenceBpm },
    });
    return list;
  }

  list.push({
    level: 'practice',
    message:
      'Độ lệch tempo lớn — nên luyện theo nhịp trước: bật metronome đúng BPM bài, đánh một hợp âm mỗi phách cho đến khi ổn.',
    practicePath: '/tools/chord-practice/rhythm',
    practiceQuery: { bpm: referenceBpm },
  });

  if (rating === 'high') {
    list.push({
      level: 'practice',
      message: `Thử giảm tốc độ xuống ~${Math.max(60, Math.round(referenceBpm * 0.85))} BPM, sau đó tăng dần về ${referenceBpm} BPM.`,
      practicePath: '/tools/chord-practice/rhythm',
      practiceQuery: { bpm: Math.max(60, Math.round(referenceBpm * 0.85)) },
    });
  }

  return list;
}
