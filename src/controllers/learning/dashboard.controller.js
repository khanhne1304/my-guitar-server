import * as statsService from '../../services/learning/stats.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await statsService.getDashboard(req.user);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function getStats(req, res, next) {
  try {
    const userId = req.user._id;
    const stats = await statsService.getUserStats(userId);
    res.json({ stats });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
