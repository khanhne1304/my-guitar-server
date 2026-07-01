import User from '../models/User.js';

export function getAdminContactEmail() {
  return (
    process.env.ADMIN_CONTACT_EMAIL ||
    process.env.SMTP_USER ||
    'admin@guitarmaster.vn'
  );
}

export function buildAccountLockedMessage() {
  const email = getAdminContactEmail();
  return `Tài khoản đã bị khóa. Hãy liên hệ "${email}" của quản trị viên.`;
}

export function assertUserNotLocked(user) {
  if (user?.isLocked) {
    const err = new Error('ACCOUNT_LOCKED');
    err.contactEmail = getAdminContactEmail();
    throw err;
  }
}

export async function resolveAdminContactEmail() {
  const fromEnv = process.env.ADMIN_CONTACT_EMAIL || process.env.SMTP_USER;
  if (fromEnv) return fromEnv;
  const admin = await User.findOne({ role: 'admin' }).select('email').lean();
  return admin?.email || 'admin@guitarmaster.vn';
}
