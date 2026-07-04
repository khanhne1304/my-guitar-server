import crypto from 'crypto';

/** Mã đổi session OAuth một lần — tránh đưa JWT vào URL redirect */
const store = new Map();
/** Cache kết quả đã đổi để request trùng (React Strict Mode) vẫn thành công */
const redeemed = new Map();
const TTL_MS = 2 * 60 * 1000;

export function createOAuthSessionCode({ token, user, state = '' }) {
  const code = crypto.randomBytes(32).toString('hex');
  store.set(code, {
    token,
    user,
    state,
    expiresAt: Date.now() + TTL_MS,
  });
  setTimeout(() => store.delete(code), TTL_MS);
  return code;
}

export function consumeOAuthSessionCode(code) {
  if (!code || typeof code !== 'string') {
    throw new Error('INVALID_CODE');
  }

  const cached = redeemed.get(code);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      redeemed.delete(code);
      throw new Error('CODE_EXPIRED');
    }
    return cached;
  }

  const entry = store.get(code);
  if (!entry) {
    throw new Error('INVALID_CODE');
  }

  store.delete(code);

  if (Date.now() > entry.expiresAt) {
    throw new Error('CODE_EXPIRED');
  }

  redeemed.set(code, entry);
  setTimeout(() => redeemed.delete(code), TTL_MS);

  return entry;
}
