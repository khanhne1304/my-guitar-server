import * as challengeService from '../../services/learning/challengeSong.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function upsertChallenge(req, res, next) {
  try {
    const song = await challengeService.upsertChallengeSong(req.user, req.body);
    res.json({ challengeSong: song });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function deleteChallenge(req, res, next) {
  try {
    const data = await challengeService.deleteChallengeSong(req.user, req.params.moduleId);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
