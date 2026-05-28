import LegatoPractice from '../models/LegatoPractice.js';

const clamp01 = (value) => Math.max(0, Math.min(1, value ?? 0));
const round3 = (value) => Number(clamp01(value).toFixed(3));

const normalizeNotes = (notes, defaults = {}) => {
  if (!Array.isArray(notes)) return [];
  return notes
    .map((note, idx) => {
      const candidate = note ?? {};
      const time =
        typeof candidate.time === 'number' && Number.isFinite(candidate.time)
          ? candidate.time
          : idx * (defaults.step ?? 0.5);
      const rms =
        typeof candidate.rms === 'number' && Number.isFinite(candidate.rms)
          ? candidate.rms
          : defaults.rms ?? 0;
      return { time, rms };
    })
    .filter((note) => Number.isFinite(note.time));
};

export function calculateLegatoScores({ detectedNotes = [], expectedNotes = [], bpm = 80 }) {
  const currentBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 80;
  const detected = normalizeNotes(detectedNotes, { step: 0.4, rms: 0.1 });
  const expected = normalizeNotes(expectedNotes, { step: 0.5, rms: 0.2 });

  if (!detected.length || !expected.length) {
    return {
      accuracy: 0,
      timingScore: 0,
      clarityScore: 0,
      speedScore: 0,
      consistency: 0,
      totalDetected: detected.length,
      totalExpected: expected.length,
    };
  }

  const beatDuration = 60 / currentBpm;
  let timingMatches = 0;
  const timingErrors = [];

  expected.forEach((expectedNote, idx) => {
    const expectedTime = expectedNote.time * beatDuration;
    const detectedNote = detected[idx];

    if (!detectedNote) return;
    const error = Math.abs(detectedNote.time - expectedTime);
    timingErrors.push(error);
    if (error <= beatDuration * 0.2) timingMatches += 1;
  });

  const timingScore = expected.length ? timingMatches / expected.length : 0;
  const avgRms = detected.reduce((sum, note) => sum + note.rms, 0) / detected.length;
  const clarityScore = clamp01(avgRms / 0.35);

  const expectedDuration = expected.at(-1).time * beatDuration || beatDuration;
  const detectedDuration = detected.at(-1).time - detected[0].time || beatDuration;
  const speedRatio = expectedDuration / detectedDuration;
  const speedScore = clamp01(speedRatio);

  const intervals = detected.slice(1).map((note, idx) => note.time - detected[idx].time);
  const avgInterval = intervals.reduce((sum, item) => sum + item, 0) / (intervals.length || 1);
  const variance =
    intervals.reduce((sum, value) => sum + Math.pow(value - avgInterval, 2), 0) /
    (intervals.length || 1);
  const consistency = clamp01(1 - variance / (Math.pow(avgInterval || 1, 2) || 1));

  const accuracy = clamp01(0.4 * timingScore + 0.3 * clarityScore + 0.3 * speedScore);

  return {
    accuracy: round3(accuracy),
    timingScore: round3(timingScore),
    clarityScore: round3(clarityScore),
    speedScore: round3(speedScore),
    consistency: round3(consistency),
    totalDetected: detected.length,
    totalExpected: expected.length,
  };
}

export async function saveLegatoPractice(userId, payload) {
  const doc = await LegatoPractice.create({
    user: userId,
    lessonId: payload.lessonId,
    lessonTitle: payload.lessonTitle,
    level: payload.level || 'beginner',
    bpm: payload.bpm,
    targetBpm: payload.targetBpm,
    practiceDuration: payload.practiceDuration,
    notesDetected: payload.notesDetected,
    notesExpected: payload.notesExpected,
    chunkUsed: payload.chunkUsed,
    scores: payload.scores,
  });

  return doc.toObject();
}

export async function getLegatoHistory(userId, limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  const practices = await LegatoPractice.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  const totals = practices.reduce(
    (acc, practice) => {
      acc.sessions += 1;
      acc.averageAccuracy += practice?.scores?.accuracy || 0;
      return acc;
    },
    { sessions: 0, averageAccuracy: 0 },
  );

  const averageAccuracy = totals.sessions ? totals.averageAccuracy / totals.sessions : 0;

  return {
    practices,
    stats: {
      sessions: totals.sessions,
      averageAccuracy: Number(averageAccuracy.toFixed(3)),
    },
  };
}













