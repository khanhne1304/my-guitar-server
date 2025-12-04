import {
  sanitizeFeaturePayload,
  scorePracticeWithAI,
  saveAiPracticeResult,
  fetchAiPracticeHistory,
  extractFeaturesFromAudio,
} from '../services/aiPractice.service.js';

export async function scorePracticeClip(req, res, next) {
  try {
    const {
      features,
      metadata = {},
      lessonId,
      lessonTitle,
      level,
      bpm,
      targetBpm,
      practiceDuration,
      saveResult = false,
    } = req.body ?? {};

    if (!features || typeof features !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu features để chấm điểm.',
      });
    }

    const { normalized, missingOrInvalid } = sanitizeFeaturePayload(features);
    if (missingOrInvalid.length) {
      return res.status(400).json({
        success: false,
        message: `Thiếu hoặc sai định dạng các trường: ${missingOrInvalid.join(', ')}`,
      });
    }

    const metaPayload =
      metadata && typeof metadata === 'object'
        ? { ...metadata }
        : {};

    const userMeta = {
      ...metaPayload,
      requestedBy: req.user?._id?.toString() || null,
      requestedAt: new Date().toISOString(),
    };

    const scores = await scorePracticeWithAI(normalized, userMeta);

    let savedEntry = null;
    if (saveResult) {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      savedEntry = await saveAiPracticeResult(userId, {
        lessonId,
        lessonTitle,
        level,
        bpm,
        targetBpm,
        practiceDuration,
        metadata: userMeta,
        features: normalized,
        scores,
      });
    }

    return res.json({
      success: true,
      data: {
        scores,
        features: normalized,
        metadata: userMeta,
        saved: savedEntry
          ? {
              id: savedEntry._id,
              createdAt: savedEntry.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAiPracticeHistory(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { limit, lessonId } = req.query ?? {};
    const result = await fetchAiPracticeHistory(userId, { limit, lessonId });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadPracticeAudio(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Chưa nhận được file audio.',
      });
    }

    const {
      lessonId,
      lessonTitle,
      level,
      bpm,
      targetBpm,
      practiceDuration,
      saveResult,
    } = req.body ?? {};

    const saveRequested =
      typeof saveResult === 'string'
        ? ['true', '1', 'yes', 'on'].includes(saveResult.toLowerCase())
        : Boolean(saveResult);

    const { filename, originalname, mimetype, size, path: savedPath } = req.file;
    const features = await extractFeaturesFromAudio(savedPath);

    const userMeta = {
      requestedBy: req.user?._id?.toString() || null,
      requestedAt: new Date().toISOString(),
      audioFile: filename,
      originalFilename: originalname,
      mimetype,
      size,
    };

    const scores = await scorePracticeWithAI(features, userMeta);

    let savedEntry = null;
    if (saveRequested) {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      savedEntry = await saveAiPracticeResult(userId, {
        lessonId,
        lessonTitle,
        level,
        bpm: bpm ? Number(bpm) : undefined,
        targetBpm: targetBpm ? Number(targetBpm) : undefined,
        practiceDuration: practiceDuration ? Number(practiceDuration) : undefined,
        metadata: userMeta,
        features,
        scores,
      });
    }

    return res.json({
      success: true,
      data: {
        file: {
          filename,
          originalname,
          mimetype,
          size,
          path: savedPath,
        },
        features,
        scores,
        metadata: userMeta,
        saved: savedEntry
          ? {
              id: savedEntry._id,
              createdAt: savedEntry.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

