import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

console.log('🔍 Checking database data...');

try {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
  
  // Check courses
  const courseCount = await Course.countDocuments();
  console.log(`📚 Courses: ${courseCount}`);
  
  if (courseCount > 0) {
    const courses = await Course.find({}).select('title level modules.lessons');
    courses.forEach(course => {
      const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
      console.log(`   - ${course.title} (${course.level}) - ${course.modules.length} modules, ${lessonCount} lessons`);
    });
  }
  
  // Check users
  const userCount = await User.countDocuments();
  console.log(`👥 Users: ${userCount}`);
  
  if (userCount > 0) {
    const users = await User.find({}).select('username email role');
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
    });
  }
  
  // Check progress
  const progressCount = await UserProgress.countDocuments();
  console.log(`📊 Progress records: ${progressCount}`);
  
  await mongoose.disconnect();
  console.log('✅ Data check completed');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
