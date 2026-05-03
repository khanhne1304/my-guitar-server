import * as learningService from '../services/learning.service.js';
import * as userPathService from '../services/userLearningPath.service.js';

function sendLearningError(res, e, next) {
  if (e && typeof e.status === 'number') {
    return res.status(e.status).json({
      message: e.message,
      ...(e.code ? { code: e.code } : {}),
    });
  }
  return next(e);
}

export async function getPlacementTest(req, res, next) {
  try {
    const data = await learningService.getPlacementTest();
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function postOnboarding(req, res, next) {
  try {
    const result = await learningService.submitOnboarding(req.user.id, req.body);
    res.json(result);
  } catch (e) {
    sendLearningError(res, e, next);
  }
}

export async function getRoadmap(req, res, next) {
  try {
    const data = await learningService.getRoadmapForUser(req.user);
    res.json(data);
  } catch (e) {
    sendLearningError(res, e, next);
  }
}

export async function postCompleteLesson(req, res, next) {
  try {
    const { lessonId, quizAnswers } = req.body || {};
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ message: 'Thiếu lessonId' });
    }
    const data = await learningService.completeLesson(req.user.id, lessonId, quizAnswers);
    res.json(data);
  } catch (e) {
    sendLearningError(res, e, next);
  }
}

export async function postPracticeTime(req, res, next) {
  try {
    const { minutes } = req.body || {};
    if (req.user.role !== 'admin' && req.user.guitarOnboardingCompleted !== true) {
      return res.status(403).json({ message: 'Hoàn tất onboarding trước.', code: 'ONBOARDING_REQUIRED' });
    }
    const data = await learningService.addPracticeMinutes(req.user.id, minutes);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function postVideoWatchTime(req, res, next) {
  try {
    const { minutes } = req.body || {};
    if (req.user.role !== 'admin' && req.user.guitarOnboardingCompleted !== true) {
      return res.status(403).json({ message: 'Hoàn tất onboarding trước.', code: 'ONBOARDING_REQUIRED' });
    }
    const data = await learningService.addVideoWatchTime(req.user.id, minutes);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function listCustomPaths(req, res, next) {
  try {
    const paths = await userPathService.listPaths(req.user._id);
    res.json({ paths });
  } catch (e) {
    next(e);
  }
}

export async function getCustomPath(req, res, next) {
  try {
    const data = await userPathService.getPathForOwner(req.user._id, req.params.pathId);
    res.json(data);
  } catch (e) {
    sendLearningError(res, e, next);
  }
}

export async function postCustomPath(req, res, next) {
  try {
    const data = await userPathService.createPath(req.user._id, req.body || {});
    res.status(201).json(data);
  } catch (e) {
    sendLearningError(res, e, next);
  }
}

export async function putCustomPath(req, res, next) {
  try {
    const data = await userPathService.updatePath(req.user._id, req.params.pathId, req.body || {});
    res.json(data);
  } catch (e) {
    sendLearningError(res, e, next);
  }
}

export async function deleteCustomPath(req, res, next) {
  try {
    const data = await userPathService.deletePath(req.user._id, req.params.pathId);
    res.json(data);
  } catch (e) {
    sendLearningError(res, e, next);
  }
}
