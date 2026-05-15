import * as practiceService from '../../services/learning/practiceRoutine.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function upsertPractice(req, res, next) {
  try {
    const routine = await practiceService.upsertPracticeRoutine(req.user, req.body);
    res.json({ practiceRoutine: routine });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function deletePractice(req, res, next) {
  try {
    const data = await practiceService.deletePracticeRoutine(req.user, req.params.moduleId);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
