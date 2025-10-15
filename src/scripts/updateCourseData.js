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
    // Tìm khóa học tương tác
    const course = await Course.findOne({ title: 'Guitar Tương Tác - Học Cơ Bản Với Metronome' });
    
    if (!course) {
      console.log('❌ Không tìm thấy khóa học tương tác');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Tìm thấy khóa học:', course.title);
    console.log('📚 Số modules:', course.modules?.length || 0);

    // Cập nhật bài học đầu tiên với tabData chi tiết
    if (course.modules && course.modules[0] && course.modules[0].lessons) {
      const firstLesson = course.modules[0].lessons[0];
      console.log('🎵 Cập nhật bài học:', firstLesson.title);
      
      // Cập nhật tabData cho bài học đầu tiên
      firstLesson.tabData = {
        contentType: 'chord',
        chord: 'C',
        frets: [0, 3, 2, 0, 1, 0],
        strings: ['E', 'A', 'D', 'G', 'B', 'E'],
        fingerPositions: [
          { finger: 1, string: 1, fret: 1 },
          { finger: 2, string: 2, fret: 2 },
          { finger: 3, string: 3, fret: 3 }
        ],
        expectedFrequency: 261.63,
        timeline: [
          {
            startTime: 0,
            endTime: 2,
            chord: 'C',
            description: 'Đặt tay lên hợp âm C',
            expectedNotes: ['C', 'E', 'G']
          },
          {
            startTime: 2,
            endTime: 4,
            chord: 'C',
            description: 'Chơi hợp âm C với metronome',
            expectedNotes: ['C', 'E', 'G']
          }
        ],
        exercises: [
          {
            name: 'Thực hành hợp âm C',
            description: 'Chơi hợp âm C với metronome 60 BPM',
            bpm: 60,
            duration: 300,
            targetAccuracy: 80
          }
        ],
        feedback: {
          correctNotes: ['C', 'E', 'G'],
          tolerance: 20,
          successMessage: 'Tuyệt vời! Bạn đã chơi đúng hợp âm C.',
          warningMessage: 'Hãy kiểm tra lại vị trí ngón tay.',
          errorMessage: 'Chưa đúng. Hãy xem lại video hướng dẫn.'
        }
      };

      // Cập nhật bài học thứ hai nếu có
      if (course.modules[0].lessons[1]) {
        const secondLesson = course.modules[0].lessons[1];
        console.log('🎵 Cập nhật bài học:', secondLesson.title);
        
        secondLesson.tabData = {
          contentType: 'chord',
          chord: 'G',
          frets: [3, 2, 0, 0, 0, 3],
          strings: ['E', 'A', 'D', 'G', 'B', 'E'],
          fingerPositions: [
            { finger: 1, string: 5, fret: 2 },
            { finger: 2, string: 6, fret: 3 },
            { finger: 3, string: 1, fret: 3 }
          ],
          expectedFrequency: 392.00,
          timeline: [
            {
              startTime: 0,
              endTime: 2,
              chord: 'G',
              description: 'Đặt tay lên hợp âm G',
              expectedNotes: ['G', 'B', 'D']
            },
            {
              startTime: 2,
              endTime: 4,
              chord: 'G',
              description: 'Chơi hợp âm G',
              expectedNotes: ['G', 'B', 'D']
            }
          ],
          exercises: [
            {
              name: 'Thực hành hợp âm G',
              description: 'Chơi hợp âm G với metronome 60 BPM',
              bpm: 60,
              duration: 300,
              targetAccuracy: 80
            }
          ],
          feedback: {
            correctNotes: ['G', 'B', 'D'],
            tolerance: 20,
            successMessage: 'Tuyệt vời! Bạn đã chơi đúng hợp âm G.',
            warningMessage: 'Hãy kiểm tra lại vị trí ngón tay.',
            errorMessage: 'Chưa đúng. Hãy xem lại video hướng dẫn.'
          }
        };
      }

      // Lưu khóa học đã cập nhật
      await course.save();
      console.log('✅ Đã cập nhật khóa học thành công!');
      
      // Hiển thị thông tin chi tiết
      console.log('\n📋 Thông tin khóa học sau khi cập nhật:');
      console.log(`   Title: ${course.title}`);
      console.log(`   Level: ${course.level}`);
      console.log(`   Modules: ${course.modules.length}`);
      
      course.modules.forEach((module, moduleIndex) => {
        console.log(`   Module ${moduleIndex + 1}: ${module.title}`);
        console.log(`     Lessons: ${module.lessons.length}`);
        
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
      });
    }

  } catch (error) {
    console.error('❌ Lỗi khi cập nhật dữ liệu:', error.message);
  }

  await mongoose.disconnect();
  console.log('\nMongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});








