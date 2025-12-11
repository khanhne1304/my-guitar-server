import { calculateLegatoScores, saveLegatoPractice, getLegatoHistory as getLegatoHistoryService } from '../services/legato.service.js';

export async function analyzeLegatoPerformance(req, res, next) {
  try {
    const { detectedNotes = [], expectedNotes = [], bpm = 80 } = req.body ?? {};

    if (!Array.isArray(detectedNotes) || !Array.isArray(expectedNotes)) {
      return res.status(400).json({
        message: 'detectedNotes và expectedNotes phải là mảng',
      });
    }

    const scores = calculateLegatoScores({
      detectedNotes,
      expectedNotes,
      bpm,
    });

    return res.json(scores);
  } catch (error) {
    return next(error);
  }
}

export async function saveLegatoPracticeResult(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      lessonId,
      lessonTitle,
      level,
      scores,
      bpm,
      targetBpm,
      practiceDuration,
      notesDetected,
      notesExpected,
      chunkUsed,
    } = req.body ?? {};

    if (!scores || typeof scores !== 'object') {
      return res.status(400).json({ message: 'Thiếu dữ liệu chấm điểm' });
    }

    await saveLegatoPractice(userId, {
      lessonId,
      lessonTitle,
      level,
      scores,
      bpm,
      targetBpm,
      practiceDuration,
      notesDetected,
      notesExpected,
      chunkUsed,
    });

    return res.status(201).json({
      success: true,
      message: 'Đã lưu lịch sử luyện tập',
    });
  } catch (error) {
    return next(error);
  }
}

export async function getLegatoHistory(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { limit } = req.query;
    const result = await getLegatoHistoryService(userId, limit);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}









