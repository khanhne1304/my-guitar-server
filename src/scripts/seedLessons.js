import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

// Mock lesson data - trong thực tế sẽ có model Lesson riêng
const mockLessons = {
  beginner: [
    {
      title: 'Giới thiệu về Guitar',
      description: 'Tìm hiểu về cấu trúc đàn guitar và cách cầm đàn đúng',
      duration: '15 phút',
      order: 1
    },
    {
      title: 'Cách cầm pick và đánh dây',
      description: 'Học cách cầm pick và đánh các dây cơ bản',
      duration: '20 phút',
      order: 2
    },
    {
      title: 'Hợp âm cơ bản - C, G, Am, F',
      description: 'Học 4 hợp âm cơ bản nhất để bắt đầu chơi guitar',
      duration: '30 phút',
      order: 3
    },
    {
      title: 'Chuyển hợp âm mượt mà',
      description: 'Luyện tập chuyển đổi giữa các hợp âm một cách mượt mà',
      duration: '25 phút',
      order: 4
    },
    {
      title: 'Bài hát đầu tiên - Happy Birthday',
      description: 'Áp dụng các hợp âm đã học vào bài hát thực tế',
      duration: '20 phút',
      order: 5
    }
  ],
  intermediate: [
    {
      title: 'Kỹ thuật Fingerpicking cơ bản',
      description: 'Học cách sử dụng các ngón tay để đánh đàn',
      duration: '25 phút',
      order: 1
    },
    {
      title: 'Pattern Fingerpicking - Travis Picking',
      description: 'Học pattern fingerpicking phổ biến nhất',
      duration: '30 phút',
      order: 2
    },
    {
      title: 'Hợp âm mở rộng - 7th, sus, add',
      description: 'Học các hợp âm phức tạp hơn để tạo màu sắc',
      duration: '35 phút',
      order: 3
    },
    {
      title: 'Kỹ thuật Hammer-on và Pull-off',
      description: 'Học các kỹ thuật legato cơ bản',
      duration: '30 phút',
      order: 4
    },
    {
      title: 'Bài hát Fingerstyle - Blackbird',
      description: 'Áp dụng tất cả kỹ thuật đã học vào bài hát nổi tiếng',
      duration: '40 phút',
      order: 5
    }
  ],
  advanced: [
    {
      title: 'Kỹ thuật Bending và Vibrato',
      description: 'Học cách tạo cảm xúc qua bending và vibrato',
      duration: '30 phút',
      order: 1
    },
    {
      title: 'Scale Pentatonic và ứng dụng',
      description: 'Học scale pentatonic và cách solo',
      duration: '35 phút',
      order: 2
    },
    {
      title: 'Kỹ thuật Sweep Picking',
      description: 'Học kỹ thuật sweep picking nâng cao',
      duration: '40 phút',
      order: 3
    },
    {
      title: 'Hybrid Picking',
      description: 'Kết hợp pick và fingerpicking',
      duration: '35 phút',
      order: 4
    },
    {
      title: 'Solo Guitar - Eruption',
      description: 'Học và phân tích solo guitar kinh điển',
      duration: '45 phút',
      order: 5
    }
  ]
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  try {
    // Lấy tất cả khóa học
    const courses = await Course.find({});
    console.log(`Tìm thấy ${courses.length} khóa học`);

    for (const course of courses) {
      // Lấy lessons tương ứng với level
      const lessons = mockLessons[course.level] || mockLessons.beginner;
      
      // Cập nhật khóa học với thông tin lessons (mock data)
      course.lessons = lessons.map((lesson, index) => ({
        _id: new mongoose.Types.ObjectId(),
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        order: lesson.order
      }));

      await course.save();
      console.log(`Đã cập nhật ${lessons.length} bài học cho khóa: ${course.title}`);
    }

    console.log('Hoàn thành cập nhật dữ liệu bài học!');
  } catch (error) {
    console.error('Lỗi khi cập nhật bài học:', error);
  }

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
