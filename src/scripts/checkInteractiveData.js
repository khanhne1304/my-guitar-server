import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected\n');

  try {
    // Kiểm tra admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log('✅ Admin user:', adminUser.email);
    } else {
      console.log('❌ Không tìm thấy admin user');
    }

    // Kiểm tra khóa học
    const courses = await Course.find({}).populate('createdBy', 'email');
    console.log(`\n📚 Tổng số khóa học: ${courses.length}`);

    courses.forEach((course, index) => {
      console.log(`\n${index + 1}. ${course.title}`);
      console.log(`   Level: ${course.level}`);
      console.log(`   Created by: ${course.createdBy?.email || 'Unknown'}`);
      console.log(`   Modules: ${course.modules?.length || 0}`);
      
      if (course.modules && course.modules.length > 0) {
        course.modules.forEach((module, moduleIndex) => {
          console.log(`   Module ${moduleIndex + 1}: ${module.title}`);
          console.log(`     Lessons: ${module.lessons?.length || 0}`);
          
          if (module.lessons && module.lessons.length > 0) {
            module.lessons.forEach((lesson, lessonIndex) => {
              console.log(`     Lesson ${lessonIndex + 1}: ${lesson.title}`);
              console.log(`       Content Type: ${lesson.contentType}`);
              console.log(`       Has Tab Data: ${lesson.tabData ? 'Yes' : 'No'}`);
              
              if (lesson.tabData) {
                console.log(`       Tab Data Type: ${lesson.tabData.contentType}`);
                if (lesson.tabData.timeline) {
                  console.log(`       Timeline Events: ${lesson.tabData.timeline.length}`);
                }
                if (lesson.tabData.exercises) {
                  console.log(`       Exercises: ${lesson.tabData.exercises.length}`);
                }
                if (lesson.tabData.feedback) {
                  console.log(`       Has Feedback: Yes`);
                }
              }
            });
          }
        });
      }
    });

    // Kiểm tra dữ liệu tương tác
    const interactiveCourses = courses.filter(course => 
      course.title.includes('Tương Tác') || 
      course.title.includes('Interactive')
    );
    
    console.log(`\n🎸 Khóa học tương tác: ${interactiveCourses.length}`);
    
    interactiveCourses.forEach(course => {
      console.log(`\n🎵 ${course.title}`);
      console.log(`   Description: ${course.description.substring(0, 100)}...`);
      
      // Đếm số bài học có tabData
      let lessonsWithTabData = 0;
      let totalLessons = 0;
      
      if (course.modules) {
        course.modules.forEach(module => {
          if (module.lessons) {
            totalLessons += module.lessons.length;
            module.lessons.forEach(lesson => {
              if (lesson.tabData) {
                lessonsWithTabData++;
              }
            });
          }
        });
      }
      
      console.log(`   Total Lessons: ${totalLessons}`);
      console.log(`   Lessons with Tab Data: ${lessonsWithTabData}`);
      console.log(`   Interactive Coverage: ${totalLessons > 0 ? Math.round((lessonsWithTabData / totalLessons) * 100) : 0}%`);
    });

    // Thống kê tổng quan
    console.log('\n📊 Thống kê tổng quan:');
    console.log(`   Total Courses: ${courses.length}`);
    console.log(`   Interactive Courses: ${interactiveCourses.length}`);
    console.log(`   Total Modules: ${courses.reduce((sum, course) => sum + (course.modules?.length || 0), 0)}`);
    console.log(`   Total Lessons: ${courses.reduce((sum, course) => {
      if (course.modules) {
        return sum + course.modules.reduce((moduleSum, module) => moduleSum + (module.lessons?.length || 0), 0);
      }
      return sum;
    }, 0)}`);

    // Kiểm tra dữ liệu chi tiết của bài học đầu tiên
    const firstCourse = courses[0];
    if (firstCourse && firstCourse.modules && firstCourse.modules[0] && firstCourse.modules[0].lessons) {
      const firstLesson = firstCourse.modules[0].lessons[0];
      console.log('\n🔍 Chi tiết bài học đầu tiên:');
      console.log(`   Title: ${firstLesson.title}`);
      console.log(`   Content Type: ${firstLesson.contentType}`);
      
      if (firstLesson.tabData) {
        console.log(`   Tab Data Content Type: ${firstLesson.tabData.contentType}`);
        
        if (firstLesson.tabData.timeline) {
          console.log(`   Timeline Events: ${firstLesson.tabData.timeline.length}`);
          firstLesson.tabData.timeline.forEach((event, index) => {
            console.log(`     Event ${index + 1}: ${event.startTime}s - ${event.endTime}s (${event.description})`);
          });
        }
        
        if (firstLesson.tabData.exercises) {
          console.log(`   Exercises: ${firstLesson.tabData.exercises.length}`);
          firstLesson.tabData.exercises.forEach((exercise, index) => {
            console.log(`     Exercise ${index + 1}: ${exercise.name} (${exercise.bpm} BPM, ${exercise.duration}s)`);
          });
        }
        
        if (firstLesson.tabData.feedback) {
          console.log(`   Feedback: ${firstLesson.tabData.feedback.successMessage}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra dữ liệu:', error.message);
  }

  await mongoose.disconnect();
  console.log('\nMongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});








