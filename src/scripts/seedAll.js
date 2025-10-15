import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

// Dữ liệu khóa học thực tế
const courses = [
  {
    title: 'Guitar Cơ Bản - Từ Zero Đến Hero',
    description: 'Khóa học guitar cơ bản dành cho người mới bắt đầu. Bạn sẽ học cách cầm đàn, đánh các hợp âm cơ bản, và chơi những bài hát đơn giản đầu tiên. Khóa học được thiết kế dễ hiểu với video HD và bài tập thực hành.',
    thumbnail: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1.jpg',
    level: 'beginner',
    lessons: [
      { title: 'Giới thiệu về Guitar', description: 'Tìm hiểu về cấu trúc đàn guitar và cách cầm đàn đúng', duration: '15 phút', order: 1 },
      { title: 'Cách cầm pick và đánh dây', description: 'Học cách cầm pick và đánh các dây cơ bản', duration: '20 phút', order: 2 },
      { title: 'Hợp âm cơ bản - C, G, Am, F', description: 'Học 4 hợp âm cơ bản nhất để bắt đầu chơi guitar', duration: '30 phút', order: 3 },
      { title: 'Chuyển hợp âm mượt mà', description: 'Luyện tập chuyển đổi giữa các hợp âm một cách mượt mà', duration: '25 phút', order: 4 },
      { title: 'Bài hát đầu tiên - Happy Birthday', description: 'Áp dụng các hợp âm đã học vào bài hát thực tế', duration: '20 phút', order: 5 }
    ]
  },
  {
    title: 'Fingerstyle Guitar - Nghệ Thuật Đánh Đàn',
    description: 'Học fingerstyle guitar từ cơ bản đến nâng cao. Bạn sẽ nắm vững kỹ thuật fingerpicking, đánh bass và melody cùng lúc, và chơi những bản nhạc fingerstyle nổi tiếng.',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f.jpg',
    level: 'intermediate',
    lessons: [
      { title: 'Kỹ thuật Fingerpicking cơ bản', description: 'Học cách sử dụng các ngón tay để đánh đàn', duration: '25 phút', order: 1 },
      { title: 'Pattern Fingerpicking - Travis Picking', description: 'Học pattern fingerpicking phổ biến nhất', duration: '30 phút', order: 2 },
      { title: 'Hợp âm mở rộng - 7th, sus, add', description: 'Học các hợp âm phức tạp hơn để tạo màu sắc', duration: '35 phút', order: 3 },
      { title: 'Kỹ thuật Hammer-on và Pull-off', description: 'Học các kỹ thuật legato cơ bản', duration: '30 phút', order: 4 },
      { title: 'Bài hát Fingerstyle - Blackbird', description: 'Áp dụng tất cả kỹ thuật đã học vào bài hát nổi tiếng', duration: '40 phút', order: 5 }
    ]
  },
  {
    title: 'Guitar Lead - Kỹ Thuật Solo Nâng Cao',
    description: 'Khóa học guitar lead dành cho người đã có nền tảng. Học các kỹ thuật solo như bending, vibrato, hammer-on, pull-off và áp dụng vào các bài solo kinh điển.',
    thumbnail: 'https://images.unsplash.com/photo-1571974599782-87ff4a1b4a3b.jpg',
    level: 'advanced',
    lessons: [
      { title: 'Kỹ thuật Bending và Vibrato', description: 'Học cách tạo cảm xúc qua bending và vibrato', duration: '30 phút', order: 1 },
      { title: 'Scale Pentatonic và ứng dụng', description: 'Học scale pentatonic và cách solo', duration: '35 phút', order: 2 },
      { title: 'Kỹ thuật Sweep Picking', description: 'Học kỹ thuật sweep picking nâng cao', duration: '40 phút', order: 3 },
      { title: 'Hybrid Picking', description: 'Kết hợp pick và fingerpicking', duration: '35 phút', order: 4 },
      { title: 'Solo Guitar - Eruption', description: 'Học và phân tích solo guitar kinh điển', duration: '45 phút', order: 5 }
    ]
  },
  {
    title: 'Acoustic Guitar - Phong Cách Dân Gian',
    description: 'Khám phá thế giới acoustic guitar với phong cách dân gian. Học các kỹ thuật strumming đặc biệt, fingerpicking patterns và chơi những bài hát acoustic nổi tiếng.',
    thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae.jpg',
    level: 'intermediate',
    lessons: [
      { title: 'Strumming Patterns cơ bản', description: 'Học các pattern strumming phổ biến', duration: '25 phút', order: 1 },
      { title: 'Fingerpicking Folk', description: 'Kỹ thuật fingerpicking trong nhạc folk', duration: '30 phút', order: 2 },
      { title: 'Hợp âm mở - Open Chords', description: 'Học các hợp âm mở đặc trưng của acoustic', duration: '35 phút', order: 3 },
      { title: 'Bài hát Folk - House of the Rising Sun', description: 'Áp dụng kỹ thuật vào bài hát folk nổi tiếng', duration: '40 phút', order: 4 }
    ]
  },
  {
    title: 'Guitar Đệm Hát - Từ Cơ Bản Đến Chuyên Nghiệp',
    description: 'Khóa học guitar đệm hát toàn diện. Học cách đệm hát cho các thể loại nhạc khác nhau: pop, rock, ballad, country. Từ hợp âm cơ bản đến các kỹ thuật đệm phức tạp.',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a5d4.jpg',
    level: 'beginner',
    lessons: [
      { title: 'Hợp âm cơ bản cho đệm hát', description: 'Học các hợp âm cần thiết cho đệm hát', duration: '20 phút', order: 1 },
      { title: 'Strumming cho Pop Ballad', description: 'Kỹ thuật strumming cho nhạc pop ballad', duration: '25 phút', order: 2 },
      { title: 'Đệm hát cho Rock', description: 'Cách đệm hát cho nhạc rock', duration: '30 phút', order: 3 },
      { title: 'Bài hát tổng hợp - Let It Be', description: 'Áp dụng tất cả kỹ thuật vào bài hát nổi tiếng', duration: '35 phút', order: 4 }
    ]
  },
  {
    title: 'Classical Guitar - Nền Tảng Cổ Điển',
    description: 'Khóa học guitar cổ điển chuyên sâu. Học cách đọc sheet music, kỹ thuật classical guitar, và chơi những tác phẩm cổ điển nổi tiếng của các nhà soạn nhạc vĩ đại.',
    thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae.jpg',
    level: 'intermediate',
    lessons: [
      { title: 'Tư thế ngồi và cầm đàn classical', description: 'Học tư thế đúng cho guitar cổ điển', duration: '20 phút', order: 1 },
      { title: 'Đọc sheet music cơ bản', description: 'Học cách đọc bản nhạc', duration: '30 phút', order: 2 },
      { title: 'Kỹ thuật tay phải classical', description: 'Kỹ thuật đánh đàn bằng tay phải', duration: '35 phút', order: 3 },
      { title: 'Tác phẩm cổ điển - Romance', description: 'Học tác phẩm cổ điển nổi tiếng', duration: '40 phút', order: 4 }
    ]
  },
  {
    title: 'Guitar Blues - Cảm Xúc Và Kỹ Thuật',
    description: 'Đắm chìm trong thế giới guitar blues. Học các scale blues, kỹ thuật bending, vibrato, và cách thể hiện cảm xúc qua từng nốt nhạc. Chơi những bài blues kinh điển.',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f.jpg',
    level: 'advanced',
    lessons: [
      { title: 'Blues Scale và ứng dụng', description: 'Học scale blues và cách sử dụng', duration: '30 phút', order: 1 },
      { title: 'Kỹ thuật Bending trong Blues', description: 'Bending đặc trưng của blues', duration: '35 phút', order: 2 },
      { title: 'Blues Rhythm Patterns', description: 'Các pattern rhythm trong blues', duration: '30 phút', order: 3 },
      { title: 'Solo Blues - Stormy Monday', description: 'Học solo blues kinh điển', duration: '45 phút', order: 4 }
    ]
  },
  {
    title: 'Guitar Rock - Sức Mạnh Và Tốc Độ',
    description: 'Khóa học guitar rock đầy năng lượng. Học các kỹ thuật rock guitar như palm muting, power chords, alternate picking, và chơi những riff rock huyền thoại.',
    thumbnail: 'https://images.unsplash.com/photo-1571974599782-87ff4a1b4a3b.jpg',
    level: 'intermediate',
    lessons: [
      { title: 'Power Chords - Sức mạnh Rock', description: 'Học power chords và cách sử dụng', duration: '25 phút', order: 1 },
      { title: 'Palm Muting Technique', description: 'Kỹ thuật palm muting trong rock', duration: '30 phút', order: 2 },
      { title: 'Alternate Picking nâng cao', description: 'Kỹ thuật alternate picking tốc độ cao', duration: '35 phút', order: 3 },
      { title: 'Riff Rock - Smoke on the Water', description: 'Học riff rock kinh điển', duration: '30 phút', order: 4 }
    ]
  },
  {
    title: 'Guitar Jazz - Hòa Âm Phức Tạp',
    description: 'Khám phá thế giới guitar jazz với những hòa âm phức tạp và kỹ thuật cao cấp. Học jazz chords, scales, và cách ứng tấu trong phong cách jazz.',
    thumbnail: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1.jpg',
    level: 'advanced',
    lessons: [
      { title: 'Jazz Chords cơ bản', description: 'Học các hợp âm jazz cơ bản', duration: '35 phút', order: 1 },
      { title: 'Jazz Scales và Modes', description: 'Các scale và mode trong jazz', duration: '40 phút', order: 2 },
      { title: 'Kỹ thuật Comping Jazz', description: 'Kỹ thuật đệm hát jazz', duration: '35 phút', order: 3 },
      { title: 'Solo Jazz - Autumn Leaves', description: 'Học solo jazz kinh điển', duration: '45 phút', order: 4 }
    ]
  },
  {
    title: 'Guitar Flamenco - Đam Mê Tây Ban Nha',
    description: 'Học guitar flamenco với những kỹ thuật đặc trưng như rasgueado, picado, alzapua. Khám phá văn hóa flamenco và chơi những tác phẩm flamenco nổi tiếng.',
    thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae.jpg',
    level: 'advanced',
    lessons: [
      { title: 'Kỹ thuật Rasgueado', description: 'Học kỹ thuật rasgueado đặc trưng', duration: '40 phút', order: 1 },
      { title: 'Picado Technique', description: 'Kỹ thuật picado trong flamenco', duration: '35 phút', order: 2 },
      { title: 'Alzapua và Pulgar', description: 'Kỹ thuật ngón cái trong flamenco', duration: '30 phút', order: 3 },
      { title: 'Tác phẩm Flamenco - Malagueña', description: 'Học tác phẩm flamenco nổi tiếng', duration: '50 phút', order: 4 }
    ]
  }
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  try {
    // Tìm admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('Không tìm thấy admin user. Tạo admin user mới...');
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@example.com',
        fullName: 'Site Administrator',
        password: 'Admin@123',
        role: 'admin'
      });
      await newAdmin.save();
      console.log('Đã tạo admin user mới');
    }

    const admin = adminUser || await User.findOne({ role: 'admin' });

    console.log('Đang tạo dữ liệu khóa học...');

    for (const courseData of courses) {
      try {
        // Kiểm tra xem khóa học đã tồn tại chưa
        const existingCourse = await Course.findOne({ title: courseData.title });
        
        if (existingCourse) {
          console.log(`Khóa học đã tồn tại: ${courseData.title}`);
          continue;
        }

        // Tạo khóa học mới (không có lessons vì cần Lesson model riêng)
        const course = new Course({
          title: courseData.title,
          description: courseData.description,
          thumbnail: courseData.thumbnail,
          level: courseData.level,
          createdBy: admin._id
        });

        await course.save();
        console.log(`Đã tạo khóa học: ${courseData.title}`);
      } catch (error) {
        console.error(`Lỗi khi tạo khóa học ${courseData.title}:`, error.message);
      }
    }

    console.log('Hoàn thành tạo dữ liệu khóa học!');
    
    // Hiển thị thống kê
    const totalCourses = await Course.countDocuments();
    const beginnerCourses = await Course.countDocuments({ level: 'beginner' });
    const intermediateCourses = await Course.countDocuments({ level: 'intermediate' });
    const advancedCourses = await Course.countDocuments({ level: 'advanced' });

    console.log('\n=== THỐNG KÊ KHÓA HỌC ===');
    console.log(`Tổng số khóa học: ${totalCourses}`);
    console.log(`Khóa học cơ bản: ${beginnerCourses}`);
    console.log(`Khóa học trung bình: ${intermediateCourses}`);
    console.log(`Khóa học nâng cao: ${advancedCourses}`);

  } catch (error) {
    console.error('Lỗi khi tạo dữ liệu:', error);
  }

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
