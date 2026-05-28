import * as moduleService from '../../services/learning/module.service.js';
import { sendHttpError } from '../../utils/httpError.js';

export async function createModule(req, res, next) {
  try {
    const mod = await moduleService.createModule(req.user, req.body);
    res.status(201).json({ module: mod });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function updateModule(req, res, next) {
  try {
    const mod = await moduleService.updateModule(req.user, req.params.id, req.body);
    res.json({ module: mod });
  } catch (e) {
    sendHttpError(res, next, e);
  }
}

export async function deleteModule(req, res, next) {
  try {
    const data = await moduleService.deleteModule(req.user, req.params.id);
    res.json(data);
  } catch (e) {
    sendHttpError(res, next, e);
  }
}
