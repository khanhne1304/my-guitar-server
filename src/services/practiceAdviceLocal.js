/**
 * Gợi ý luyện tập dạng huấn luyện viên — fallback khi LLM lỗi (không cần API).
 */

import { sanitizeDisplayText } from './practiceAdviceSanitize.js';
import {
  buildAdvancedAnalysis,
  computeSkillLevel,
} from './practiceAdviceAnalysis.js';

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
  const song = ctx.song || {};
  const ch = ctx.chordMatch || {};
  const tempo = ctx.tempo || {};
  const rec = ctx.recognition || {};
  const advanced = ctx.advancedAnalysis || buildAdvancedAnalysis(ctx);

  const acc = ch.accuracyPercent;
  const matched = ch.matched;
  const refLen = ch.referenceLen;
  const title = song.title || 'bài này';
  const bpmDev = round(tempo.deviationPercent);
  const level = computeSkillLevel(acc, bpmDev);

  const strengths = [];
  const mainProblems = [];
  const practicePlan = [];
  let prioritySkill = 'chord_transitions';

  if (advanced.chordMemory?.assessment && acc != null && acc >= 60) {
    strengths.push(advanced.chordMemory.assessment);
  }
  if (advanced.chordConfidence?.assessment && rec.meanConfidence >= 0.75) {
    strengths.push(advanced.chordConfidence.assessment);
  }
  if (advanced.rhythmStability?.rating === 'good') {
    strengths.push('Bạn giữ nhịp khá ổn định suốt buổi luyện.');
  }
  if (advanced.bpmAccuracy?.assessment && bpmDev != null && bpmDev <= 5) {
    strengths.push(advanced.bpmAccuracy.assessment);
  }
  if (acc != null && acc >= 85) {
    strengths.push(`Bạn đã chơi đúng phần lớn progression của «${title}».`);
  }

  if (strengths.length === 0) {
    strengths.push('Bạn đã hoàn thành buổi luyện và ghi âm để phân tích — đó là bước rất quan trọng để tiến bộ.');
  }

  if (acc != null && acc < 85) {
    prioritySkill = 'chord_memory';
    mainProblems.push({
      problem: 'Một số hợp âm hoặc thứ tự chưa khớp với bài gốc.',
      cause:
        'Thường do chưa nhớ hết progression, hoặc tay chưa quen chuyển nhanh giữa các hình hợp âm.',
      impact: 'Bài hát nghe chưa giống bản gốc và dễ bị “đứt” ở các đoạn chuyển.',
      solution:
        'Chia bài thành 4–8 ô nhịp, luyện vòng hợp âm chậm (60–70% tốc độ) rồi ghép dần.',
    });
  }

  if (
    advanced.chordTransition?.mismatchCount > 0 &&
    mainProblems.length < 3
  ) {
    prioritySkill = prioritySkill === 'chord_memory' ? 'chord_transitions' : prioritySkill;
    mainProblems.push({
      problem: 'Chuyển hợp âm chưa mượt ở một số đoạn.',
      cause:
        'Khi đổi hợp âm, ngón tay chưa sẵn sàng hoặc strum bị gián đoạn giữa hai hình hợp âm.',
      impact: 'Bài nghe không liền mạch, có khoảng “chết” giữa các hợp âm.',
      solution:
        'Luyện riêng từng cặp hợp âm hay sai: đặt ngón sẵn trước 1 nhịp, strum chậm 4 lần rồi tăng dần.',
    });
  }

  const refBpm = round(tempo.referenceBpm);
  const detBpm = round(tempo.detectedBpm);
  if (
    refBpm &&
    detBpm &&
    tempo.rating &&
    tempo.rating !== 'good' &&
    mainProblems.length < 3
  ) {
    prioritySkill = 'rhythm';
    const dir = tempoDirectionLabel(tempo.direction);
    mainProblems.push({
      problem: `Tốc độ chơi ${dir} bài gốc.`,
      cause:
        'Có thể do chưa quen đếm phách, hoặc mất nhịp khi tập trung vào hợp âm khó.',
      impact: 'Cảm giác groove của bài bị lệch so với bản gốc.',
      solution: `Bật metronome ${Math.max(60, Math.round(refBpm * 0.85))} BPM, đánh một hợp âm mỗi phách, tăng dần về ${refBpm} BPM.`,
    });
  }

  if (
    rec.meanConfidence != null &&
    rec.meanConfidence < 0.7 &&
    mainProblems.length < 3
  ) {
    mainProblems.push({
      problem: 'Một số hợp âm nghe chưa rõ ràng.',
      cause:
        'Lực tay không đều, dây chưa chỉnh chuẩn, hoặc micro thu xa tiếng đàn.',
      impact: 'Khó nghe rõ từng hợp âm, dễ mất tự tin khi chơi trước người khác.',
      solution:
        'Luyện strum đều ở volume vừa phải, kiểm tra chỉnh dây, thu lại gần micro hơn.',
    });
  }

  if (ch.compareNote && mainProblems.length < 3) {
    mainProblems.push({
      problem: 'Tone/capo có thể chưa khớp bài gốc.',
      cause: ch.compareNote,
      impact: 'Dù hợp âm gần đúng, bài vẫn nghe khác bản gốc.',
      solution: 'Chỉnh capo hoặc transpose trên app cho khớp HopAmChuan rồi luyện một tone cố định.',
    });
    prioritySkill = 'tone';
  }

  if (refLen && matched != null && matched < refLen * 0.6 && mainProblems.length < 3) {
    mainProblems.push({
      problem: 'Bản ghi chưa cover hết bài.',
      cause: 'Có thể dừng sớm hoặc chưa luyện đủ các đoạn intro/điệp khúc.',
      impact: 'Khó đánh giá toàn bộ kỹ năng chơi bài.',
      solution: 'Chia bài thành intro — điệp khúc — bridge; luyện từng phần rồi ghép lại.',
    });
  }

  const trimmedProblems = mainProblems.slice(0, 3);

  if (trimmedProblems.length > 0) {
    practicePlan.push({
      title: 'Sửa lỗi ưu tiên nhất',
      reason: trimmedProblems[0].problem,
      exercise: trimmedProblems[0].solution,
      durationMinutes: 10,
    });
  }

  if (acc != null && acc < 85) {
    practicePlan.push({
      title: 'Ghi nhớ progression',
      reason: 'Cần nhớ thứ tự hợp âm để bài liền mạch hơn.',
      exercise: `Lặp vòng hợp âm của «${title}» ở 60 BPM, không hát, chỉ strum rõ từng đổi.`,
      durationMinutes: 10,
    });
  }

  if (refBpm && tempo.rating !== 'good') {
    practicePlan.push({
      title: 'Ổn định nhịp',
      reason: 'Giữ tempo đều giúp bài nghe tự nhiên hơn.',
      exercise: `Metronome ${Math.max(60, Math.round(refBpm * 0.85))} BPM — 1 hợp âm/phách, tăng 5 BPM mỗi lần thành công.`,
      durationMinutes: 8,
    });
  }

  if (practicePlan.length === 0) {
    practicePlan.push({
      title: 'Duy trì phong độ',
      reason: 'Buổi luyện tốt — tiếp tục củng cố để chơi mượt hơn nữa.',
      exercise: '15 phút: 5 phút metronome, 5 phút luyện đoạn khó, 5 phút chơi trọn bài.',
      durationMinutes: 15,
    });
  }

  const levelLabel =
    level === 'Advanced'
      ? 'nâng cao'
      : level === 'Intermediate'
        ? 'trung cấp'
        : 'cơ bản';

  const overview = sanitizeDisplayText(
    `Buổi luyện «${title}»: trình độ ${levelLabel}. ` +
      (advanced.songMastery?.assessment ||
        advanced.chordMemory?.assessment ||
        'Hãy tập trung vào các gợi ý bên dưới để buổi luyện tiếp theo hiệu quả hơn.'),
  );

  const nextGoal =
    level === 'Advanced'
      ? 'Giữ độ chính xác khi tăng tốc hoặc thêm cảm xúc (dynamics) vào bài.'
      : level === 'Intermediate'
        ? 'Chơi trọn bài mượt mà hơn, giảm thời gian chết giữa các hợp âm.'
        : 'Nhớ đúng thứ tự hợp âm và giữ nhịp đều ở tốc độ chậm.';

  const encouragement =
    level === 'Advanced'
      ? 'Bạn đang chơi rất tốt — tiếp tục luyện đều để giữ phong độ và thêm cảm xúc vào bài!'
      : 'Mỗi buổi luyện đều giúp bạn tiến bộ — đừng nản, hãy thử lại với bài tập nhỏ bên dưới!';

  return {
    level,
    overview,
    strengths: strengths.slice(0, 4),
    mainProblems: trimmedProblems,
    prioritySkill,
    practicePlan: practicePlan.slice(0, 4),
    nextGoal,
    encouragement,
  };
}
