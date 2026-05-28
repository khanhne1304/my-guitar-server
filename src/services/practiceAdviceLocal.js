/**
 * Gợi ý luyện tập dựa trên số liệu phân tích (không cần LLM).
 */

import { sanitizeDisplayText } from './practiceAdviceSanitize.js';

function round(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : null;
}

export function buildLocalPracticeAdvice(ctx) {
  const song = ctx.song || {};
  const ch = ctx.chordMatch || {};
  const tempo = ctx.tempo || {};
  const rec = ctx.recognition || {};
  const timeline = ctx.timeline || [];

  const acc = ch.accuracyPercent;
  const matched = ch.matched;
  const refLen = ch.referenceLen;
  const title = song.title || 'bài này';
  const key = song.key ? `tone ${song.key}` : 'tone bài gốc';
  const capo = song.capo > 0 ? `capo ${song.capo}` : null;
  const rhythm = song.rhythm ? String(song.rhythm) : null;

  const strengths = [];
  const improvements = [];
  const practiceSteps = [];
  const toneAndTimbre = [];
  const tempoAndRhythm = [];
  const chordsAndTransitions = [];
  let priority = 'both';

  const confPct =
    rec.meanConfidence != null ? Math.round(rec.meanConfidence * 100) : null;

  if (confPct != null && confPct >= 85) {
    toneAndTimbre.push(
      `Âm sắc & độ rõ: hệ thống nhận diện ổn định (~${confPct}% độ tin cậy) — tiếng đàn tương đối rõ, ít “mơ hồ” giữa các hợp âm.`,
    );
    strengths.push('Âm thanh đủ rõ để phân tích hợp âm chính xác.');
  } else if (confPct != null && confPct < 70) {
    toneAndTimbre.push(
      'Âm sắc: độ tin cậy nhận diện thấp — thử ghi gần micro hơn, strum rõ từng đổi hợp âm, kiểm tra chỉnh dây và tránh tiếng buzz/rè.',
    );
    improvements.push('Kỹ năng âm sắc: luyện đánh đều lực tay, tách bass/treble rõ khi strum.');
  } else {
    toneAndTimbre.push(
      'Âm sắc: cố gắng giữ dynamics đều — không gẩy quá mạnh ở hợp âm mạnh rồi yếu ở hợp âm nhẹ; dùng pick hoặc ngón ổn định.',
    );
  }

  if (timeline.length >= 2) {
    const durations = timeline.map((t) => t.duration || 2);
    const avgDur = durations.reduce((a, b) => a + b, 0) / durations.length;
    if (avgDur < 1.5) {
      toneAndTimbre.push(
        'Các đoạn hợp âm chuyển rất nhanh — có thể âm bị “cắt cụt”. Luyện giữ rung dây đủ lâu (2–3 nhịp/hợp âm) trước khi đổi.',
      );
    }
  }

  if (acc != null && acc >= 85) {
    strengths.push(
      `Hợp âm: khớp ~${acc}% (${matched}/${refLen}) với bài chuẩn — progression nắm khá tốt.`,
    );
    chordsAndTransitions.push(
      `Ưu tiên giữ độ chính xác khi tăng tốc; hiện khớp ${matched}/${refLen} đoạn tham chiếu.`,
    );
  }

  if (acc != null && acc < 85) {
    priority = acc < 60 ? 'chords' : 'both';
    chordsAndTransitions.push(
      `Hợp âm & chuyển đoạn: độ khớp ${acc}% — cần luyện đúng thứ tự và thời điểm đổi hợp âm trong «${title}».`,
    );
    chordsAndTransitions.push(
      'Kỹ năng thiếu: chuyển hợp âm muộn/sớm, hoặc bỏ sót hợp âm trong progression.',
    );
    practiceSteps.push(
      'Chia 4–8 ô nhịp mỗi đoạn; luyện vòng hợp âm chuẩn ở 60–70% tốc độ, sau đó ghép lời.',
    );
  }

  if (ch.compareNote) {
    chordsAndTransitions.push(
      `${ch.compareNote} — có thể đúng “hình” hợp âm nhưng sai tone so với HopAmChuan (${key}${capo ? `, ${capo}` : ''}).`,
    );
    toneAndTimbre.push(
      'Âm sắc / tone: khi lệch giọng, người nghe cảm giác “không giống bản gốc” dù hợp âm gần đúng — chỉnh capo hoặc transpose cho khớp.',
    );
    practiceSteps.push(
      'Dùng transpose/capo trên app khớp bài gốc; luyện một tone cố định suốt bài.',
    );
  }

  const detBpm = round(tempo.detectedBpm);
  const refBpm = round(tempo.referenceBpm);

  if (refBpm && detBpm) {
    const dev = round(tempo.deviationPercent);
    const dir =
      tempo.direction === 'faster'
        ? 'nhanh hơn'
        : tempo.direction === 'slower'
          ? 'chậm hơn'
          : 'gần đúng';
    tempoAndRhythm.push(
      `Tempo: bạn chơi ~${detBpm} BPM, bài chuẩn ~${refBpm} BPM (${dir}, lệch ~${dev}%).`,
    );
    if (rhythm) {
      tempoAndRhythm.push(`Nhịp/điệu bài gốc (HopAmChuan): ${rhythm}.`);
    }
    if (tempo.rating === 'good') {
      strengths.push(`Nhịp ổn (lệch tempo ~${dev}%).`);
      tempoAndRhythm.push('Duy trì cảm giác groove hiện tại khi luyện đoạn khó.');
    } else if (tempo.rating === 'high' || tempo.rating === 'moderate') {
      priority = priority === 'chords' ? 'both' : 'tempo';
      tempoAndRhythm.push(
        `Kỹ năng nhịp: luyện gõ chân/metronome theo ${refBpm} BPM trước khi thêm hợp âm phức tạp.`,
      );
      const targetSlow = Math.max(60, Math.round(refBpm * 0.85));
      practiceSteps.push(
        `Metronome ${targetSlow} BPM → tăng dần 5 BPM đến ${refBpm} BPM; một hợp âm mỗi phách.`,
      );
    }
  } else if (detBpm) {
    tempoAndRhythm.push(
      `Tempo ghi nhận ~${detBpm} BPM; bài chưa có BPM chuẩn — tự đặt mục tiêu và luyện đếm phách đều.`,
    );
    if (rhythm) {
      tempoAndRhythm.push(`Tham khảo điệu bài: ${rhythm}.`);
    }
  } else {
    tempoAndRhythm.push(
      'Chưa ước lượng được tempo từ audio — thu lại bản rõ hơn hoặc đặt BPM trên trang bài rồi phân tích lại.',
    );
  }

  if (refLen && matched != null && matched < refLen * 0.6) {
    chordsAndTransitions.push(
      'Độ dài bản ghi: chưa cover hết progression bài chuẩn — luyện intro, điệp khúc và đoạn chuyển.',
    );
  }

  if (rec.segmentCount != null && rec.segmentCount < 10) {
    chordsAndTransitions.push(
      `Chỉ ${rec.segmentCount} đoạn hợp âm nhận diện — ghi âm dài hơn, strum rõ mỗi phách đổi hợp âm.`,
    );
  }

  improvements.push(...chordsAndTransitions.slice(0, 2));

  if (practiceSteps.length === 0) {
    practiceSteps.push(
      '15 phút/ngày: 5 phút metronome, 5 phút âm sắc (lực tay đều), 5 phút lặp đoạn khó.',
    );
  }

  if (improvements.length === 0) {
    improvements.push('Tiếp tục củng cố nhịp và độ sạch âm khi chuyển hợp âm.');
  }

  const overview = sanitizeDisplayText(
    `Bản «${title}»: hợp âm khớp ${acc != null ? `${acc}%` : '—'}` +
      (detBpm ? `, tempo ~${detBpm} BPM` : '') +
      (ch.compareNote ? `. ${ch.compareNote}` : '') +
      '. Tập trung cải thiện âm sắc, nhịp và chuyển hợp âm theo từng mục bên dưới.',
  );

  return {
    overview,
    summary: overview,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 5),
    practiceSteps: practiceSteps.slice(0, 5),
    toneAndTimbre: toneAndTimbre.slice(0, 4),
    tempoAndRhythm: tempoAndRhythm.slice(0, 4),
    chordsAndTransitions: chordsAndTransitions.slice(0, 5),
    priority,
    skillFocus: {
      timbre: true,
      tempo: Boolean(tempo.detectedBpm),
      chords: acc != null && acc < 95,
      tone: Boolean(ch.compareNote),
    },
  };
}
