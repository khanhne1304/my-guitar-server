/**
 * Gợi ý luyện tập dạng giáo viên — fallback khi LLM lỗi (cùng schema với AI).
 * @module practiceAdviceLocal
 */

import { sanitizeDisplayText } from './practiceAdviceSanitize.js';
import { computeSkillLevel } from './practiceAdviceAnalysis.js';
import { buildSongAssessmentFromValidation } from './songValidation.service.js';

function round(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : null;
}

function tempoDirectionLabel(direction) {
  if (direction === 'faster') return 'nhanh hơn';
  if (direction === 'slower') return 'chậm hơn';
  return 'gần đúng với';
}

/**
 * @param {object} ctx — context từ buildAnalysisContext
 */
export function buildLocalPracticeAdvice(ctx) {
  const song = ctx.referenceSong || ctx.song || {};
  const chordAcc = ctx.comparison?.chordAccuracy || {};
  const ch = ctx.chordMatch || ctx.comparison || {};
  const tempoAnalysis = ctx.tempoAnalysis || {};
  const transitionAnalysis = ctx.transitionAnalysis || {};
  const wrongChords = ctx.wrongChords || [];
  const sections = ctx.sections || [];
  const skillScores = ctx.skillScores || {};
  const rec = ctx.recognition || {};
  const tempo = ctx.tempo || {};

  const acc = chordAcc.accuracy ?? ch.accuracyPercent;
  const matched = chordAcc.correctChords ?? ch.matched;
  const refLen = chordAcc.totalChords ?? ch.referenceLen;
  const title = song.title || 'bài này';
  const bpmDev =
    tempoAnalysis.tempoDifference != null
      ? Math.abs(tempoAnalysis.tempoDifference)
      : round(tempo.deviationPercent);
  const level = computeSkillLevel(acc, bpmDev);
  const songVal = ctx.songValidation || {};
  const isCorrectSong = Boolean(songVal.isCorrectSong);
  const songCategory = songVal.category || 'incorrect';

  const strengths = [];
  const weaknesses = [];
  const mainProblems = [];
  const practicePlan = [];
  const sectionFeedback = [];
  let prioritySkill = 'chord_transitions';

  if (acc != null && acc >= 85 && isCorrectSong) {
    strengths.push(`Độ chính xác hợp âm ${acc}% — bạn nhớ phần lớn progression của «${title}».`);
  } else if (acc != null && acc >= 60) {
    strengths.push(`Bạn đạt ${acc}% hợp âm đúng — đã nắm được khung chính của bài.`);
  }

  if (tempoAnalysis.stabilityScore != null && tempoAnalysis.stabilityScore >= 75) {
    strengths.push(`Độ ổn định nhịp ${tempoAnalysis.stabilityScore}/100 — tempo khá đều suốt bài.`);
  }

  if (transitionAnalysis.averageTransitionTime != null && transitionAnalysis.averageTransitionTime <= 0.6) {
    strengths.push(
      `Chuyển hợp âm trung bình ${transitionAnalysis.averageTransitionTime}s — khá mượt.`,
    );
  }

  if (isCorrectSong) {
    strengths.push(`Bạn đang bám sát cấu trúc bài «${title}».`);
  }

  if (strengths.length === 0) {
    strengths.push('Bạn đã hoàn thành buổi luyện và ghi âm để phân tích — bước quan trọng để tiến bộ.');
  }

  if (acc != null && acc < 85) {
    weaknesses.push(`Độ chính xác hợp âm ${acc}% — còn ${(refLen || 0) - (matched || 0)} hợp âm cần sửa.`);
  }

  if (tempoAnalysis.stabilityScore != null && tempoAnalysis.stabilityScore < 70) {
    weaknesses.push(`Độ ổn định tempo ${tempoAnalysis.stabilityScore}/100 — nhịp còn dao động.`);
  }

  if (transitionAnalysis.averageTransitionTime != null && transitionAnalysis.averageTransitionTime > 0.9) {
    weaknesses.push(
      `Chuyển hợp âm trung bình ${transitionAnalysis.averageTransitionTime}s — còn chậm ở một số cặp.`,
    );
  }

  if (!isCorrectSong) {
    prioritySkill = 'chord_memory';
    mainProblems.push({
      problem:
        songCategory === 'incorrect'
          ? 'Bản chơi khác đáng kể so với bài tham chiếu.'
          : 'Bạn mới tái hiện được một phần progression của bài gốc.',
      cause: 'Chọn sai bài, chưa nhớ progression, hoặc chơi nhầm đoạn.',
      impact: 'Bài nghe không giống bản gốc dù kỹ thuật tay có thể ổn ở vài đoạn.',
      solution:
        'Mở lại hợp âm gốc, luyện từng đoạn 4–8 ô nhịp và đối chiếu thứ tự hợp âm trước khi chơi trọn bài.',
    });
  }

  if (wrongChords.length > 0 && isCorrectSong) {
    const sample = wrongChords
      .slice(0, 3)
      .map((w) => `${w.time}s: cần ${w.expected}, bạn đánh ${w.played}`)
      .join('; ');
    mainProblems.push({
      problem: `Có ${wrongChords.length} hợp âm sai trong bài (vd: ${sample}).`,
      cause: 'Chưa nhớ hình hợp âm hoặc tay chưa quen chuyển nhanh.',
      impact: 'Bài nghe lệch so với bản gốc tại các thời điểm cụ thể.',
      solution:
        'Luyện riêng các hợp âm hay sai ở tốc độ 60–70% BPM, strum 4 lần mỗi hợp âm trước khi ghép.',
    });
    prioritySkill = 'chord_memory';
  } else if (acc != null && acc < 85 && isCorrectSong && mainProblems.length < 3) {
    mainProblems.push({
      problem: 'Một số hợp âm hoặc thứ tự chưa khớp với bài gốc.',
      cause: 'Chưa nhớ hết progression hoặc tay chưa quen chuyển nhanh.',
      impact: 'Bài nghe chưa giống bản gốc và dễ bị đứt ở các đoạn chuyển.',
      solution: 'Chia bài thành 4–8 ô nhịp, luyện vòng hợp âm chậm rồi ghép dần.',
    });
  }

  const worst = transitionAnalysis.worstTransitions || [];
  if (worst.length > 0 && mainProblems.length < 3) {
    const top = worst[0];
    prioritySkill = 'chord_transitions';
    mainProblems.push({
      problem: `Chuyển ${top.from} → ${top.to} mất ${top.transitionTime}s — chậm nhất trong bài.`,
      cause: 'Ngón tay chưa sẵn sàng hoặc strum bị gián đoạn giữa hai hình hợp âm.',
      impact: 'Bài nghe không liền mạch, có khoảng chết giữa các hợp âm.',
      solution: `Luyện riêng cặp ${top.from} ↔ ${top.to}: đặt ngón sẵn trước 1 nhịp, strum chậm 4 lần rồi tăng dần.`,
    });
  }

  const refBpm = round(tempoAnalysis.expectedBPM ?? tempo.referenceBpm);
  const detBpm = round(tempoAnalysis.actualBPM ?? tempo.detectedBpm);
  if (
    refBpm &&
    detBpm &&
    tempoAnalysis.tempoDifference != null &&
    Math.abs(tempoAnalysis.tempoDifference) > 5 &&
    mainProblems.length < 3
  ) {
    prioritySkill = 'rhythm';
    const dir = tempoDirectionLabel(
      tempoAnalysis.tempoDifference > 0 ? 'faster' : 'slower',
    );
    mainProblems.push({
      problem: `Tốc độ chơi ${dir} bài gốc (${detBpm} vs ${refBpm} BPM).`,
      cause: 'Chưa quen đếm phách hoặc mất nhịp khi tập trung vào hợp âm khó.',
      impact: 'Cảm giác groove của bài bị lệch so với bản gốc.',
      solution: `Bật metronome ${Math.max(60, Math.round(refBpm * 0.85))} BPM, đánh một hợp âm mỗi phách, tăng dần về ${refBpm} BPM.`,
    });
  }

  const trimmedProblems = mainProblems.slice(0, 3);

  if (trimmedProblems.length > 0) {
    practicePlan.push({
      title: 'Sửa lỗi ưu tiên',
      reason: trimmedProblems[0].problem,
      goal: 'Khắc phục lỗi quan trọng nhất trong buổi luyện',
      exercise: trimmedProblems[0].solution,
      durationMinutes: 10,
    });
  }

  if (worst.length > 0) {
    const t = worst[0];
    practicePlan.push({
      title: `Chuyển ${t.from} ↔ ${t.to}`,
      reason: `Cặp chuyển chậm nhất (${t.transitionTime}s)`,
      goal: 'Giảm thời gian chết giữa hai hợp âm',
      exercise: `10 phút luyện chuyển ${t.from} ↔ ${t.to} ở 60 BPM, strum 4 lần mỗi hợp âm.`,
      durationMinutes: 10,
    });
  }

  if (refBpm && tempoAnalysis.stabilityScore != null && tempoAnalysis.stabilityScore < 75) {
    const practiceBpm = Math.max(60, Math.round(refBpm * 0.85));
    practicePlan.push({
      title: 'Ổn định nhịp',
      reason: `Độ ổn định tempo ${tempoAnalysis.stabilityScore}/100`,
      goal: `Giữ nhịp đều ở ${practiceBpm} BPM`,
      exercise: `${practicePlan.length ? '15' : '10'} phút metronome ${practiceBpm} BPM — 1 hợp âm/phách.`,
      durationMinutes: 15,
    });
  }

  const weakSection = [...sections].sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weakSection && weakSection.accuracy < 80) {
    practicePlan.push({
      title: `Luyện ${weakSection.name}`,
      reason: `Đoạn ${weakSection.name} chỉ đạt ${weakSection.accuracy}%`,
      goal: `Nâng độ chính xác đoạn ${weakSection.name} lên trên 85%`,
      exercise: `10 phút lặp progression đoạn ${weakSection.name} ở tốc độ chậm.`,
      durationMinutes: 10,
    });
  }

  if (practicePlan.length === 0) {
    practicePlan.push({
      title: 'Duy trì phong độ',
      reason: 'Buổi luyện tốt',
      goal: 'Giữ độ chính xác khi tăng tốc',
      exercise: '15 phút: 5 phút metronome, 5 phút đoạn khó, 5 phút chơi trọn bài.',
      durationMinutes: 15,
    });
  }

  for (const sec of sections) {
    let feedback;
    if (sec.accuracy >= 90) {
      feedback = `Đoạn ${sec.name} rất tốt (${sec.accuracy}%) — giữ phong độ.`;
    } else if (sec.accuracy >= 70) {
      feedback = `Đoạn ${sec.name} khá ổn (${sec.accuracy}%) — cần luyện thêm vài hợp âm.`;
    } else {
      feedback = `Đoạn ${sec.name} yếu (${sec.accuracy}%) — nên luyện riêng đoạn này trước.`;
    }
    sectionFeedback.push({ section: sec.name, feedback });
  }

  const levelLabel =
    level === 'Advanced' ? 'nâng cao' : level === 'Intermediate' ? 'trung cấp' : 'cơ bản';

  const songValNote = songVal.assessment ? `${songVal.assessment} ` : '';

  const overview = sanitizeDisplayText(
    `Buổi luyện «${title}»: trình độ ${levelLabel}. ${songValNote}` +
      (acc != null ? `Độ chính xác hợp âm ${acc}%. ` : '') +
      (skillScores.overall != null ? `Điểm tổng ${skillScores.overall}/100. ` : '') +
      (isCorrectSong
        ? 'Xem chi tiết điểm mạnh, lỗi và kế hoạch luyện tập bên dưới.'
        : 'Hãy đối chiếu lại progression với bài gốc trước khi tăng tốc độ.'),
  );

  const refBpmFinal = refBpm || 80;
  const recommendedTempo =
    tempoAnalysis.tempoDifference != null && tempoAnalysis.tempoDifference < -5
      ? Math.max(60, Math.round(refBpmFinal * 0.85))
      : refBpmFinal;

  const nextSessionGoal =
    level === 'Advanced'
      ? `Giữ độ chính xác trên ${acc ?? 85}% khi tăng tốc lên ${recommendedTempo} BPM.`
      : level === 'Intermediate'
        ? `Nâng độ chính xác lên 85%+ và rút thời gian chuyển hợp âm xuống dưới 0.7s.`
        : `Nhớ đúng thứ tự hợp âm và giữ nhịp đều ở ${recommendedTempo} BPM.`;

  const encouragement =
    level === 'Advanced'
      ? 'Bạn đang chơi rất tốt — tiếp tục luyện đều để giữ phong độ!'
      : 'Mỗi buổi luyện đều giúp bạn tiến bộ — hãy thử các bài tập bên dưới!';

  return {
    level,
    performanceLevel: level,
    overview,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    mainProblems: trimmedProblems,
    prioritySkill,
    practicePlan: practicePlan.slice(0, 4),
    nextGoal: nextSessionGoal,
    nextSessionGoal,
    encouragement,
    recommendedTempo,
    sectionFeedback,
    skillAssessment: {
      chordAccuracy: skillScores.chordAccuracy ?? acc ?? 0,
      rhythm: skillScores.rhythm ?? 0,
      tempoControl: skillScores.tempoControl ?? 0,
      transitionSkill: skillScores.transitionSkill ?? 0,
      overall: skillScores.overall ?? 0,
    },
    songAssessment: buildSongAssessmentFromValidation(songVal),
  };
}
