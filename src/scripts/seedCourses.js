// src/scripts/seedCourses.js
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/guitar-learning');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample courses data
const sampleCourses = [
  {
    title: 'Guitar Cơ Bản Cho Người Mới Bắt Đầu',
    slug: 'guitar-co-ban',
    level: 'beginner',
    summary: 'Khóa học guitar cơ bản dành cho người mới bắt đầu, từ cách cầm đàn đến các hợp âm cơ bản',
    description: 'Khóa học này sẽ hướng dẫn bạn từ những bước đầu tiên với guitar, bao gồm cách cầm đàn, tư thế ngồi, cách đọc tab, và các hợp âm cơ bản nhất. Phù hợp cho người chưa từng chơi guitar.',
    durationWeeks: 8,
    thumbnail: 'https://images.unsplash.com/photo-1510915361894-5c6b8a4b8b8b?w=400',
    modules: [
      {
        title: 'Làm Quen Với Guitar',
        description: 'Học cách cầm đàn, tư thế ngồi và những điều cơ bản nhất',
        order: 1,
        lessons: [
          {
            title: 'Giới Thiệu Về Guitar',
            type: 'THEORY',
            durationMin: 15,
            objectives: [
              'Hiểu về cấu tạo guitar',
              'Biết cách chọn guitar phù hợp',
              'Hiểu về các loại dây đàn'
            ],
            skills: ['Kiến thức cơ bản về guitar'],
            prerequisites: [],
            content: {
              text: 'Guitar là một nhạc cụ dây có 6 dây, được sử dụng rộng rãi trong nhiều thể loại nhạc. Có hai loại chính: guitar acoustic và guitar điện.',
              videoUrl: 'https://www.youtube.com/watch?v=example1',
              audioUrl: null
            },
            practice: {
              metronomeBpm: 60,
              minutes: 10,
              checklist: [
                'Nghe và hiểu về guitar',
                'Quan sát cấu tạo đàn'
              ]
            },
            assessment: {
              type: 'quiz',
              config: {
                questions: [
                  {
                    question: 'Guitar có bao nhiêu dây?',
                    options: ['4', '6', '8', '12'],
                    correct: 1
                  }
                ]
              }
            },
            order: 1
          },
          {
            title: 'Cách Cầm Đàn Và Tư Thế Ngồi',
            type: 'PRACTICE',
            durationMin: 20,
            objectives: [
              'Học cách cầm đàn đúng',
              'Tư thế ngồi thoải mái',
              'Vị trí tay trái và tay phải'
            ],
            skills: ['Tư thế cơ bản', 'Cách cầm đàn'],
            prerequisites: ['Kiến thức cơ bản về guitar'],
            content: {
              text: 'Tư thế ngồi đúng rất quan trọng để chơi guitar thoải mái và tránh chấn thương. Ngồi thẳng lưng, đặt guitar trên đùi phải.',
              videoUrl: 'https://www.youtube.com/watch?v=example2',
              audioUrl: null
            },
            practice: {
              metronomeBpm: 60,
              minutes: 15,
              checklist: [
                'Ngồi thẳng lưng',
                'Đặt guitar đúng vị trí',
                'Tay trái cầm cần đàn',
                'Tay phải đặt trên thùng đàn'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Quay video tư thế ngồi và cầm đàn',
                duration: 30
              }
            },
            order: 2
          }
        ]
      },
      {
        title: 'Hợp Âm Cơ Bản',
        description: 'Học các hợp âm cơ bản nhất để bắt đầu chơi bài hát',
        order: 2,
        lessons: [
          {
            title: 'Hợp Âm C Major',
            type: 'CHORD',
            durationMin: 25,
            objectives: [
              'Học cách bấm hợp âm C',
              'Luyện tập chuyển hợp âm',
              'Hiểu về cấu trúc hợp âm'
            ],
            skills: ['Hợp âm C Major', 'Chuyển hợp âm cơ bản'],
            prerequisites: ['Tư thế cơ bản', 'Cách cầm đàn'],
            content: {
              text: 'Hợp âm C Major là một trong những hợp âm cơ bản nhất. Cách bấm: ngón 1 ở dây 2 phím 1, ngón 2 ở dây 4 phím 2, ngón 3 ở dây 5 phím 3.',
              chords: [
                {
                  name: 'C Major',
                  fingering: 'x32010',
                  difficulty: 'easy'
                }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=example3',
              audioUrl: 'https://example.com/audio/c-major.mp3'
            },
            practice: {
              metronomeBpm: 80,
              minutes: 20,
              checklist: [
                'Bấm đúng vị trí các ngón tay',
                'Luyện tập chuyển hợp âm',
                'Đánh đều và rõ ràng'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi hợp âm C 10 lần liên tiếp',
                duration: 60
              }
            },
            order: 1
          },
          {
            title: 'Hợp Âm G Major',
            type: 'CHORD',
            durationMin: 25,
            objectives: [
              'Học cách bấm hợp âm G',
              'Luyện tập chuyển C-G',
              'Cải thiện độ chính xác'
            ],
            skills: ['Hợp âm G Major', 'Chuyển hợp âm C-G'],
            prerequisites: ['Hợp âm C Major', 'Chuyển hợp âm cơ bản'],
            content: {
              text: 'Hợp âm G Major: ngón 2 ở dây 5 phím 2, ngón 3 ở dây 6 phím 3, ngón 4 ở dây 1 phím 3.',
              chords: [
                {
                  name: 'G Major',
                  fingering: '320003',
                  difficulty: 'easy'
                }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=example4',
              audioUrl: 'https://example.com/audio/g-major.mp3'
            },
            practice: {
              metronomeBpm: 80,
              minutes: 20,
              checklist: [
                'Bấm đúng vị trí hợp âm G',
                'Luyện tập chuyển C-G',
                'Đánh đều và rõ ràng'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chuyển hợp âm C-G 10 lần',
                duration: 60
              }
            },
            order: 2
          }
        ]
      },
      {
        title: 'Bài Hát Đầu Tiên',
        description: 'Áp dụng kiến thức đã học vào bài hát thực tế',
        order: 3,
        lessons: [
          {
            title: 'Happy Birthday - Đơn Giản',
            type: 'SONG',
            durationMin: 30,
            objectives: [
              'Chơi bài Happy Birthday',
              'Kết hợp hợp âm C và G',
              'Học cách đếm nhịp'
            ],
            skills: ['Chơi bài hát đơn giản', 'Kết hợp hợp âm'],
            prerequisites: ['Hợp âm C Major', 'Hợp âm G Major'],
            content: {
              text: 'Bài Happy Birthday sử dụng hợp âm C và G. Cấu trúc: C-C-G-C-F-C-G-C.',
              tabs: [
                'C     C     G     C',
                'Happy Birthday to you',
                'C     C     G     C',
                'Happy Birthday to you'
              ],
              chords: [
                { name: 'C Major', fingering: 'x32010' },
                { name: 'G Major', fingering: '320003' }
              ],
              strumPattern: 'D-D-U-D-U-D',
              videoUrl: 'https://www.youtube.com/watch?v=example5',
              audioUrl: 'https://example.com/audio/happy-birthday.mp3'
            },
            practice: {
              metronomeBpm: 100,
              minutes: 25,
              checklist: [
                'Chơi đúng hợp âm',
                'Giữ nhịp đều',
                'Hát theo nhạc'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi và hát bài Happy Birthday',
                duration: 120
              }
            },
            order: 1
          }
        ]
      }
    ],
    isActive: true,
    interactiveFeatures: {
      hasMetronome: true,
      hasPitchDetection: false,
      hasRealTimeFeedback: false,
      hasProgressTracking: true,
      hasExercises: true,
      hasGamification: false
    },
    courseSettings: {
      allowReplay: true,
      showProgress: true,
      enableComments: true,
      enableRating: true
    }
  },
  {
    title: 'Guitar Trung Cấp - Kỹ Thuật Nâng Cao',
    slug: 'guitar-trung-cap',
    level: 'intermediate',
    summary: 'Nâng cao kỹ thuật guitar với các kỹ thuật fingerpicking, barre chords và solo',
    description: 'Khóa học dành cho người đã có nền tảng guitar cơ bản, muốn nâng cao kỹ thuật và học các kỹ thuật phức tạp hơn.',
    durationWeeks: 12,
    thumbnail: 'https://images.unsplash.com/photo-1510915361894-5c6b8a4b8b8b?w=400',
    modules: [
      {
        title: 'Barre Chords',
        description: 'Học các hợp âm barre - nền tảng của guitar nâng cao',
        order: 1,
        lessons: [
          {
            title: 'F Major Barre Chord',
            type: 'CHORD',
            durationMin: 35,
            objectives: [
              'Học cách bấm hợp âm F',
              'Luyện tập sức mạnh ngón tay',
              'Chuyển từ open chords sang barre'
            ],
            skills: ['Barre chords', 'Sức mạnh ngón tay'],
            prerequisites: ['Hợp âm cơ bản', 'Chuyển hợp âm'],
            content: {
              text: 'Hợp âm F Major là barre chord đầu tiên bạn cần học. Ngón 1 bấm tất cả dây ở phím 1, ngón 2 ở dây 3 phím 2, ngón 3 ở dây 5 phím 3, ngón 4 ở dây 4 phím 3.',
              chords: [
                {
                  name: 'F Major',
                  fingering: '133211',
                  difficulty: 'hard'
                }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=example6',
              audioUrl: 'https://example.com/audio/f-major.mp3'
            },
            practice: {
              metronomeBpm: 60,
              minutes: 30,
              checklist: [
                'Bấm đúng vị trí barre',
                'Luyện tập sức mạnh ngón tay',
                'Chuyển hợp âm mượt mà'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi hợp âm F 5 lần liên tiếp',
                duration: 30
              }
            },
            order: 1
          }
        ]
      }
    ],
    isActive: true,
    interactiveFeatures: {
      hasMetronome: true,
      hasPitchDetection: true,
      hasRealTimeFeedback: true,
      hasProgressTracking: true,
      hasExercises: true,
      hasGamification: true
    },
    courseSettings: {
      allowReplay: true,
      showProgress: true,
      enableComments: true,
      enableRating: true
    }
  },
  {
    title: 'Guitar Nâng Cao - Solo Và Improvisation',
    slug: 'guitar-nang-cao',
    level: 'advanced',
    summary: 'Học solo guitar, improvisation và các kỹ thuật nâng cao',
    description: 'Khóa học dành cho người đã thành thạo guitar trung cấp, muốn học solo và improvisation.',
    durationWeeks: 16,
    thumbnail: 'https://images.unsplash.com/photo-1510915361894-5c6b8a4b8b8b?w=400',
    modules: [
      {
        title: 'Solo Techniques',
        description: 'Các kỹ thuật solo cơ bản',
        order: 1,
        lessons: [
          {
            title: 'Pentatonic Scale',
            type: 'THEORY',
            durationMin: 45,
            objectives: [
              'Hiểu về pentatonic scale',
              'Luyện tập scale trên guitar',
              'Áp dụng vào solo'
            ],
            skills: ['Pentatonic scale', 'Solo techniques'],
            prerequisites: ['Barre chords', 'Kỹ thuật nâng cao'],
            content: {
              text: 'Pentatonic scale là scale quan trọng nhất trong guitar solo. Có 5 nốt chính và được sử dụng rộng rãi trong rock, blues.',
              tabs: [
                'e|--3--5--8--10--12--15--',
                'B|--3--5--8--10--12--15--',
                'G|--3--5--7--10--12--15--',
                'D|--3--5--7--10--12--15--',
                'A|--3--5--7--10--12--15--',
                'E|--3--5--8--10--12--15--'
              ],
              videoUrl: 'https://www.youtube.com/watch?v=example7',
              audioUrl: 'https://example.com/audio/pentatonic.mp3'
            },
            practice: {
              metronomeBpm: 120,
              minutes: 40,
              checklist: [
                'Luyện tập scale từ từ',
                'Tăng tốc độ dần',
                'Thử nghiệm với các pattern khác nhau'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi pentatonic scale với metronome',
                duration: 60
              }
            },
            order: 1
          }
        ]
      }
    ],
    isActive: true,
    interactiveFeatures: {
      hasMetronome: true,
      hasPitchDetection: true,
      hasRealTimeFeedback: true,
      hasProgressTracking: true,
      hasExercises: true,
      hasGamification: true
    },
    courseSettings: {
      allowReplay: true,
      showProgress: true,
      enableComments: true,
      enableRating: true
    }
  }
];

// Create sample user
const createSampleUser = async () => {
  try {
    // Check if user already exists
    let user = await User.findOne({ email: 'student@example.com' });
    
    if (!user) {
      user = new User({
        name: 'Học Viên Mẫu',
        email: 'student@example.com',
        password: 'password123',
        role: 'student',
        isActive: true
      });
      await user.save();
      console.log('✅ Sample user created');
    } else {
      console.log('✅ Sample user already exists');
    }
    
    return user;
  } catch (error) {
    console.error('Error creating sample user:', error);
    throw error;
  }
};

// Seed courses
const seedCourses = async () => {
  try {
    // Clear existing courses
    await Course.deleteMany({});
    console.log('🗑️ Cleared existing courses');

    // Create sample user
    const user = await createSampleUser();

    // Create courses
    for (const courseData of sampleCourses) {
      const course = new Course({
        ...courseData,
        createdBy: user._id
      });
      await course.save();
      console.log(`✅ Created course: ${course.title}`);
    }

    console.log('🎉 All courses seeded successfully!');
  } catch (error) {
    console.error('Error seeding courses:', error);
    throw error;
  }
};

// Create sample progress data
const seedProgress = async () => {
  try {
    // Clear existing progress
    await UserProgress.deleteMany({});
    console.log('🗑️ Cleared existing progress');

    // Get user and courses
    const user = await User.findOne({ email: 'student@example.com' });
    const courses = await Course.find({});

    if (!user || courses.length === 0) {
      console.log('❌ No user or courses found');
      return;
    }

    // Create sample progress for first course
    const firstCourse = courses[0];
    const firstModule = firstCourse.modules[0];
    const firstLesson = firstModule.lessons[0];

    const progress = new UserProgress({
      userId: user._id,
      courseId: firstCourse._id,
      lessonKey: `${firstCourse.slug}#${firstModule.order}.${firstLesson.order}`,
      status: 'completed',
      score: 85,
      acquiredSkills: ['Kiến thức cơ bản về guitar'],
      practiceLogs: [
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          minutes: 15,
          bpm: 60,
          notes: 'Lần đầu học guitar, cảm thấy khó khăn'
        },
        {
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          minutes: 20,
          bpm: 80,
          notes: 'Đã quen hơn, có thể chơi được'
        }
      ],
      lastPlayedAt: new Date(),
      completedAt: new Date(),
      timeSpent: 35,
      attempts: 3,
      bestScore: 85
    });

    await progress.save();
    console.log('✅ Created sample progress data');

    console.log('🎉 All progress data seeded successfully!');
  } catch (error) {
    console.error('Error seeding progress:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await seedCourses();
    await seedProgress();
    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedCourses, seedProgress, createSampleUser };