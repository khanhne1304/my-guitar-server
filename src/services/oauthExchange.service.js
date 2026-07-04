import crypto from 'crypto';

/** Mã đổi session OAuth một lần — tránh đưa JWT vào URL redirect */
const store = new Map();
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

  const entry = store.get(code);
  store.delete(code);

  if (!entry) {
    throw new Error('INVALID_CODE');
  }
  if (Date.now() > entry.expiresAt) {
    throw new Error('CODE_EXPIRED');
  }

  return entry;
}
