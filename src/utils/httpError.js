export function httpError(status, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  Object.assign(err, extra);
  return err;
}

export function sendHttpError(res, next, e) {
  if (e && typeof e.status === 'number') {
    const payload = { message: e.message };
    if (e.issues) payload.issues = e.issues;
    return res.status(e.status).json(payload);
  }
  return next(e);
}
