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
    // Tìm admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ Không tìm thấy admin user');
      await mongoose.disconnect();
      return;
    }

    // Tạo thêm khóa học tương tác
    const additionalCourses = [
      {
        title: 'Guitar Blues Tương Tác - Cảm Xúc Và Kỹ Thuật',
        description: 'Khóa học guitar blues tương tác với feedback thời gian thực. Học các scale blues, kỹ thuật bending, vibrato với giao diện học hiện đại.',
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f.jpg',
        level: 'intermediate',
        createdBy: adminUser._id,
        modules: [
          {
            title: 'Module 1: Blues Scale và Kỹ thuật cơ bản',
            description: 'Học blues scale và các kỹ thuật blues cơ bản',
            order: 1,
            lessons: [
              {
                title: 'Blues Scale cơ bản',
                description: 'Học blues scale và cách sử dụng',
                videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                contentType: 'note',
                order: 1,
                tabData: {
                  contentType: 'note',
                  scale: 'Blues Scale',
                  key: 'A',
                  notes: ['A', 'C', 'D', 'D#', 'E', 'G'],
                  frets: [5, 8, 5, 6, 7, 5],
                  timeline: [
                    {
                      startTime: 0,
                      endTime: 2,
                      note: 'A',
                      description: 'Nốt A - gốc của blues scale'
                    },
                    {
                      startTime: 2,
                      endTime: 4,
                      note: 'C',
                      description: 'Nốt C - minor third'
                    }
                  ],
                  exercises: [
                    {
                      name: 'Blues Scale Practice',
                      description: 'Thực hành blues scale với metronome',
                      bpm: 80,
                      duration: 300,
                      targetAccuracy: 85
                    }
                  ],
                  feedback: {
                    correctNotes: ['A', 'C', 'D', 'D#', 'E', 'G'],
                    tolerance: 15,
                    successMessage: 'Tuyệt vời! Bạn đã chơi đúng blues scale.',
                    warningMessage: 'Hãy chú ý đến intonation.',
                    errorMessage: 'Chưa đúng. Hãy luyện tập từng nốt một.'
                  }
                }
              },
              {
                title: 'Blues Bending Technique',
                description: 'Học kỹ thuật bending trong blues',
                videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                contentType: 'note',
                order: 2,
                tabData: {
                  contentType: 'note',
                  technique: 'Bending',
                  key: 'A',
                  timeline: [
                    {
                      startTime: 0,
                      endTime: 1,
                      technique: 'bend',
                      description: 'Bend từ D lên E',
                      fromFret: 7,
                      toFret: 9
                    },
                    {
                      startTime: 1,
                      endTime: 2,
                      technique: 'release',
                      description: 'Release về D',
                      fromFret: 9,
                      toFret: 7
                    }
                  ],
                  exercises: [
                    {
                      name: 'Blues Bending',
                      description: 'Thực hành kỹ thuật bending',
                      bpm: 60,
                      duration: 300,
                      targetAccuracy: 80
                    }
                  ],
                  feedback: {
                    correctTechnique: 'bending',
                    tolerance: 0.1,
                    successMessage: 'Tuyệt vời! Bạn đã thực hiện đúng kỹ thuật bending.',
                    warningMessage: 'Hãy chú ý đến độ cao của bend.',
                    errorMessage: 'Chưa đúng. Hãy luyện tập từng bước một.'
                  }
                }
              }
            ]
          }
        ]
      },
      {
        title: 'Guitar Rock Tương Tác - Sức Mạnh Và Tốc Độ',
        description: 'Khóa học guitar rock tương tác với feedback thời gian thực. Học các kỹ thuật rock guitar như palm muting, power chords với giao diện học hiện đại.',
        thumbnail: 'https://images.unsplash.com/photo-1571974599782-87ff4a1b4a3b.jpg',
        level: 'intermediate',
        createdBy: adminUser._id,
        modules: [
          {
            title: 'Module 1: Power Chords và Palm Muting',
            description: 'Học power chords và kỹ thuật palm muting',
            order: 1,
            lessons: [
              {
                title: 'Power Chords cơ bản',
                description: 'Học power chords và cách sử dụng',
                videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                contentType: 'chord',
                order: 1,
                tabData: {
                  contentType: 'chord',
                  chord: 'Power Chord',
                  frets: [3, 5, 5, 'x', 'x', 'x'],
                  strings: ['E', 'A', 'D', 'G', 'B', 'E'],
                  technique: 'power_chord',
                  timeline: [
                    {
                      startTime: 0,
                      endTime: 2,
                      chord: 'Power Chord',
                      description: 'Power chord trên dây 6 và 5',
                      expectedNotes: ['G', 'D']
                    },
                    {
                      startTime: 2,
                      endTime: 4,
                      chord: 'Power Chord',
                      description: 'Giữ power chord',
                      expectedNotes: ['G', 'D']
                    }
                  ],
                  exercises: [
                    {
                      name: 'Power Chord Practice',
                      description: 'Thực hành power chords với metronome',
                      bpm: 100,
                      duration: 300,
                      targetAccuracy: 90
                    }
                  ],
                  feedback: {
                    correctNotes: ['G', 'D'],
                    tolerance: 20,
                    successMessage: 'Tuyệt vời! Bạn đã chơi đúng power chord.',
                    warningMessage: 'Hãy chú ý đến palm muting.',
                    errorMessage: 'Chưa đúng. Hãy luyện tập từng power chord.'
                  }
                }
              }
            ]
          }
        ]
      }
    ];

    console.log('🎸 Đang tạo thêm khóa học tương tác...\n');

    for (const courseData of additionalCourses) {
      try {
        // Kiểm tra xem khóa học đã tồn tại chưa
        const existingCourse = await Course.findOne({ title: courseData.title });
        
        if (existingCourse) {
          console.log(`⚠️  Khóa học đã tồn tại: ${courseData.title}`);
          continue;
        }

        // Tạo khóa học mới
        const course = new Course(courseData);
        await course.save();
        console.log(`✅ Đã tạo khóa học: ${courseData.title}`);
        console.log(`   Level: ${courseData.level}`);
        console.log(`   Modules: ${courseData.modules.length}`);
        console.log(`   Total Lessons: ${courseData.modules.reduce((sum, module) => sum + module.lessons.length, 0)}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Lỗi khi tạo khóa học ${courseData.title}:`, error.message);
      }
    }

    // Hiển thị thống kê tổng quan
    const allCourses = await Course.find({}).populate('createdBy', 'email');
    const interactiveCourses = allCourses.filter(course => 
      course.title.includes('Tương Tác') || 
      course.title.includes('Interactive')
    );

    console.log('📊 Thống kê tổng quan:');
    console.log(`   Total Courses: ${allCourses.length}`);
    console.log(`   Interactive Courses: ${interactiveCourses.length}`);
    console.log(`   Total Modules: ${allCourses.reduce((sum, course) => sum + (course.modules?.length || 0), 0)}`);
    console.log(`   Total Lessons: ${allCourses.reduce((sum, course) => {
      if (course.modules) {
        return sum + course.modules.reduce((moduleSum, module) => moduleSum + (module.lessons?.length || 0), 0);
      }
      return sum;
    }, 0)}`);

    console.log('\n🎉 Hoàn thành tạo thêm dữ liệu khóa học tương tác!');

  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu:', error.message);
  }

  await mongoose.disconnect();
  console.log('\nMongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});








