/**
 * Xóa toàn bộ dữ liệu khóa học (schema mới + collection legacy nếu còn).
 * Chạy: npm run wipe:courses
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

const NEW_COLLECTIONS = [
  'quizattempts',
  'quizzes',
  'lessons',
  'modules',
  'practiceroutines',
  'challengesongs',
  'courseprogresses',
  'userstats',
  'courses',
];

const LEGACY_COLLECTIONS = [
  'courselessons',
  'coursemodules',
  'modulequizzes',
  'lessonquizzes',
  'courseuserprogresses',
  'learningprogresses',
];

async function wipeCollection(db, name) {
  const names = await db.listCollections({ name }).toArray();
  if (!names.length) return { name, deleted: 0, skipped: true };
  const result = await db.collection(name).deleteMany({});
  return { name, deleted: result.deletedCount, skipped: false };
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Đã kết nối MongoDB:', MONGO_URI.replace(/\/\/[^@]+@/, '//***@'));

  const db = mongoose.connection.db;
  const all = [...NEW_COLLECTIONS, ...LEGACY_COLLECTIONS];

  for (const name of all) {
    const r = await wipeCollection(db, name);
    if (r.skipped) console.log(`  [bỏ qua] ${name} — không tồn tại`);
    else console.log(`  [xóa] ${name}: ${r.deleted} document(s)`);
  }

  console.log('\nĐã xóa toàn bộ dữ liệu khóa học.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
