import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  try {
    // Lấy tất cả khóa học
    const courses = await Course.find({}).populate('createdBy', 'username email');
    
    console.log(`\n=== DANH SÁCH KHÓA HỌC (${courses.length} khóa) ===\n`);
    
    courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title}`);
      console.log(`   Level: ${course.level}`);
      console.log(`   Mô tả: ${course.description.substring(0, 100)}...`);
      console.log(`   Thumbnail: ${course.thumbnail}`);
      console.log(`   Tạo bởi: ${course.createdBy?.username || 'N/A'}`);
      console.log(`   Ngày tạo: ${course.createdAt.toLocaleDateString('vi-VN')}`);
      console.log(`   Số bài học: ${course.lessons?.length || 0}`);
      console.log('   ' + '─'.repeat(50));
    });

    // Thống kê theo level
    const beginnerCount = courses.filter(c => c.level === 'beginner').length;
    const intermediateCount = courses.filter(c => c.level === 'intermediate').length;
    const advancedCount = courses.filter(c => c.level === 'advanced').length;

    console.log('\n=== THỐNG KÊ ===');
    console.log(`Tổng số khóa học: ${courses.length}`);
    console.log(`Khóa học cơ bản: ${beginnerCount}`);
    console.log(`Khóa học trung bình: ${intermediateCount}`);
    console.log(`Khóa học nâng cao: ${advancedCount}`);

  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error);
  }

  await mongoose.disconnect();
  console.log('\nMongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
