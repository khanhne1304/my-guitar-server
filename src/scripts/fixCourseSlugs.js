/**
 * Gán slug cho các khóa học còn thiếu (slug null / rỗng).
 * Chạy: npm run fix:course-slugs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Course from '../models/Course.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Đã kết nối MongoDB');

  const courses = await Course.find({
    $or: [{ slug: null }, { slug: '' }, { slug: { $exists: false } }],
  });

  if (!courses.length) {
    console.log('Không có khóa học nào cần sửa slug.');
    await mongoose.disconnect();
    return;
  }

  for (const course of courses) {
    await course.save();
    console.log(`  ✓ ${course.title} → ${course.slug}`);
  }

  console.log(`\nĐã cập nhật slug cho ${courses.length} khóa học.`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
