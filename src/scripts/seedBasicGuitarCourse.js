import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const basicGuitarCourseData = {
  title: 'Guitar Cơ Bản - Từ Zero Đến Hero',
  slug: 'basic-guitar',
  summary: 'Khóa học guitar cơ bản dành cho người mới bắt đầu',
  description: 'Khóa học guitar cơ bản dành cho người mới bắt đầu. Học từ cách cầm đàn, tư thế ngồi, đến các kỹ thuật cơ bản và bài tập thực hành.',
  thumbnail: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1.jpg',
  durationWeeks: 4,
  level: 'beginner',
  isActive: true,
  isInteractive: true,
  interactiveFeatures: {
    hasMetronome: true,
    hasPitchDetection: false,
    hasRealTimeFeedback: false,
    hasProgressTracking: true,
    hasExercises: true,
    hasGamification: true
  },
  courseSettings: {
    allowReplay: true,
    showProgress: true,
    enableComments: true,
    enableRating: true
  },
  modules: [
    {
      title: 'Làm Quen Với Đàn Guitar',
      description: 'Học cách cầm đàn, tư thế ngồi và tên các nốt nhạc cơ bản',
      order: 1,
      lessons: [
        {
          title: 'Giới thiệu về đàn guitar',
          type: 'THEORY',
          durationMin: 15,
          objectives: ['Hiểu về các loại đàn guitar', 'Biết cách chọn đàn phù hợp'],
          skills: ['Kiến thức cơ bản về guitar'],
          prerequisites: [],
          content: {
            text: 'Giới thiệu về đàn guitar\n\nCác loại đàn guitar:\n- Guitar Classic: Dây nylon, phù hợp cho nhạc cổ điển\n- Guitar Acoustic: Dây kim loại, âm thanh to và rõ ràng\n- Guitar Electric: Cần cắm ampli, âm thanh đa dạng\n\nCách chọn đàn:\n1. Ngân sách phù hợp\n2. Kích thước phù hợp với cơ thể\n3. Chất lượng âm thanh\n4. Thương hiệu uy tín',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          },
          practice: {
            metronomeBpm: 60,
            minutes: 15,
            checklist: [
              'Xem video giới thiệu về đàn guitar',
              'Đọc tài liệu về các loại đàn',
              'Tìm hiểu cách chọn đàn phù hợp'
            ]
          },
          assessment: {
            type: 'none'
          },
          order: 1
        },
        {
          title: 'Tư thế cầm đàn và ngồi',
          type: 'THEORY',
          durationMin: 20,
          objectives: ['Học tư thế ngồi đúng', 'Biết cách cầm đàn guitar'],
          skills: ['Tư thế cơ bản', 'Kỹ thuật cầm đàn'],
          prerequisites: ['Giới thiệu về đàn guitar'],
          content: {
            text: 'Tư thế cầm đàn guitar\n\nTư thế ngồi:\n1. Ngồi thẳng lưng - Không gù lưng\n2. Đặt đàn trên đùi phải - Đàn nghiêng nhẹ về phía bạn\n3. Chân trái đặt trên ghế - Nếu cần thiết\n4. Thả lỏng vai - Không căng thẳng\n\nCách cầm đàn:\n- Tay trái: Cầm cần đàn, ngón tay bấm dây\n- Tay phải: Đặt trên thùng đàn, dùng để gảy dây\n- Cổ tay: Thả lỏng, không gồng cứng',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          },
          practice: {
            metronomeBpm: 60,
            minutes: 20,
            checklist: [
              'Thực hành tư thế ngồi đúng',
              'Luyện tập cách cầm đàn',
              'Kiểm tra tư thế trước gương'
            ]
          },
          assessment: {
            type: 'none'
          },
          order: 2
        },
        {
          title: 'Tên các nốt nhạc trên đàn guitar',
          type: 'THEORY',
          durationMin: 25,
          objectives: ['Thuộc tên các nốt nhạc trên đàn guitar', 'Biết cách gảy dây đúng'],
          skills: ['Kiến thức nhạc lý cơ bản', 'Kỹ thuật gảy dây'],
          prerequisites: ['Tư thế cầm đàn và ngồi'],
          content: {
            text: 'Tên các nốt nhạc trên đàn guitar\n\nDây mở (không bấm):\n- Dây 1 (mỏng nhất): E (Mi)\n- Dây 2: B (Si)\n- Dây 3: G (Sol)\n- Dây 4: D (Rê)\n- Dây 5: A (La)\n- Dây 6 (dày nhất): E (Mi)\n\nCách nhớ:\n"Every Boy Gets Dinner At Eight" (Mỗi cậu bé đều ăn tối lúc 8 giờ)',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          },
          practice: {
            metronomeBpm: 60,
            minutes: 25,
            checklist: [
              'Gảy từng dây và nói tên nốt',
              'Gảy ngẫu nhiên và đoán tên nốt',
              'Luyện tập mỗi ngày 10-15 phút'
            ]
          },
          assessment: {
            type: 'none'
          },
          order: 3
        }
      ]
    },
    {
      title: 'Kỹ Thuật Tay Trái',
      description: 'Học cách bấm nốt, hợp âm cơ bản và chuyển hợp âm',
      order: 2,
      lessons: [
        {
          title: 'Cách bấm nốt đúng kỹ thuật',
          type: 'PRACTICE',
          durationMin: 30,
          objectives: ['Học kỹ thuật bấm nốt đúng', 'Luyện tập tay trái'],
          skills: ['Kỹ thuật bấm nốt', 'Luyện tập tay trái'],
          prerequisites: ['Tên các nốt nhạc trên đàn guitar'],
          content: {
            text: 'Kỹ thuật bấm nốt\n\nVị trí ngón tay:\n- Ngón 1 (trỏ): Phím 1\n- Ngón 2 (giữa): Phím 2\n- Ngón 3 (nhẫn): Phím 3\n- Ngón 4 (út): Phím 4\n\nKỹ thuật bấm:\n1. Bấm gần phím - Không bấm giữa 2 phím\n2. Bấm thẳng - Không bấm xiên\n3. Dùng đầu ngón tay - Không dùng mặt ngón\n4. Bấm đủ lực - Để dây kêu rõ ràng',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          },
          practice: {
            metronomeBpm: 60,
            minutes: 30,
            checklist: [
              'Bấm từng nốt trên dây 1 (E)',
              'Bấm từng nốt trên dây 2 (B)',
              'Luyện tập mỗi ngày 15-20 phút'
            ]
          },
          assessment: {
            type: 'none'
          },
          order: 1
        },
        {
          title: 'Hợp âm cơ bản - C, G, Am, F',
          type: 'CHORD',
          durationMin: 45,
          objectives: ['Học 4 hợp âm cơ bản', 'Luyện tập bấm hợp âm'],
          skills: ['Hợp âm cơ bản', 'Kỹ thuật bấm hợp âm'],
          prerequisites: ['Cách bấm nốt đúng kỹ thuật'],
          content: {
            text: 'Hợp âm cơ bản\n\nHợp âm C (Đô trưởng):\ne|--0--\nB|--1-- (ngón 1)\nG|--0--\nD|--2-- (ngón 2)\nA|--3-- (ngón 3)\nE|------\n\nHợp âm G (Sol trưởng):\ne|--3-- (ngón 3)\nB|--0--\nG|--0--\nD|--0--\nA|--2-- (ngón 2)\nE|--3-- (ngón 3)\n\nHợp âm Am (La thứ):\ne|--0--\nB|--1-- (ngón 1)\nG|--2-- (ngón 2)\nD|--2-- (ngón 2)\nA|--0--\nE|------\n\nHợp âm F (Fa trưởng):\ne|--1-- (ngón 1)\nB|--1-- (ngón 1)\nG|--2-- (ngón 2)\nD|--3-- (ngón 3)\nA|--3-- (ngón 3)\nE|--1-- (ngón 1)',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          },
          practice: {
            metronomeBpm: 60,
            minutes: 45,
            checklist: [
              'Bấm từng hợp âm 10 lần',
              'Chuyển đổi giữa các hợp âm',
              'Luyện tập mỗi ngày 20-30 phút'
            ]
          },
          assessment: {
            type: 'none'
          },
          order: 2
        }
      ]
    }
  ]
};

const seedBasicGuitarCourse = async () => {
  try {
    await connectDB();

    // Find or create a default user for the course
    let user = await User.findOne({ email: 'admin@guitar.com' });
    if (!user) {
      user = new User({
        name: 'Guitar Admin',
        username: 'guitar_admin',
        email: 'admin@guitar.com',
        password: 'password123',
        role: 'admin'
      });
      await user.save();
    }

    // Check if course already exists
    const existingCourse = await Course.findOne({ title: basicGuitarCourseData.title });
    if (existingCourse) {
      console.log('Basic guitar course already exists');
      return;
    }

    // Create the course
    const course = new Course({
      ...basicGuitarCourseData,
      createdBy: user._id
    });

    await course.save();
    console.log('Basic guitar course created successfully');
    console.log(`Course ID: ${course._id}`);
    
  } catch (error) {
    console.error('Error seeding basic guitar course:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedBasicGuitarCourse();