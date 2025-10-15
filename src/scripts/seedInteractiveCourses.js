import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  // Tìm admin user để làm createdBy
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.log('Không tìm thấy admin user. Vui lòng chạy seedAdmin.js trước.');
    await mongoose.disconnect();
    return;
  }

  const interactiveCourses = [
    {
      title: 'Guitar Tương Tác - Học Cơ Bản Với Metronome',
      description: 'Khóa học guitar tương tác với metronome, feedback thời gian thực và giao diện học hiện đại. Phù hợp cho người mới bắt đầu muốn học guitar một cách khoa học và hiệu quả.',
      thumbnail: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1.jpg',
      level: 'beginner',
      createdBy: adminUser._id,
      modules: [
        {
          title: 'Module 1: Những bước đầu tiên',
          description: 'Học những kiến thức cơ bản nhất về guitar',
          order: 1,
          lessons: [
            {
              title: 'Giới thiệu guitar và cách cầm đàn',
              description: 'Tìm hiểu về guitar và cách cầm đàn đúng cách',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'note',
              order: 1,
              tabData: {
                contentType: 'note',
                content: 'Trong bài học này, bạn sẽ học cách cầm đàn guitar đúng cách và tư thế ngồi thoải mái.',
                exercises: [
                  {
                    name: 'Tư thế cầm đàn',
                    description: 'Thực hành tư thế cầm đàn đúng cách',
                    duration: 300 // 5 phút
                  }
                ]
              }
            },
            {
              title: 'Hợp âm C - Hợp âm đầu tiên',
              description: 'Học hợp âm C cơ bản với metronome',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'chord',
              order: 2,
              tabData: {
                contentType: 'chord',
                chord: 'C',
                frets: [0, 3, 2, 0, 1, 0],
                expectedFrequency: 261.63, // C4
                timeline: [
                  {
                    startTime: 0,
                    endTime: 5,
                    chord: 'C',
                    description: 'Hợp âm C - thời gian 5 giây'
                  }
                ],
                exercises: [
                  {
                    name: 'Thực hành hợp âm C',
                    description: 'Chơi hợp âm C với metronome 60 BPM',
                    bpm: 60,
                    duration: 300
                  }
                ]
              }
            },
            {
              title: 'Hợp âm G - Hợp âm thứ hai',
              description: 'Học hợp âm G và chuyển đổi C-G',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'chord',
              order: 3,
              tabData: {
                contentType: 'chord',
                chord: 'G',
                frets: [3, 2, 0, 0, 0, 3],
                expectedFrequency: 392.00, // G4
                timeline: [
                  {
                    startTime: 0,
                    endTime: 3,
                    chord: 'G',
                    description: 'Hợp âm G - thời gian 3 giây'
                  },
                  {
                    startTime: 3,
                    endTime: 6,
                    chord: 'C',
                    description: 'Chuyển về hợp âm C - thời gian 3 giây'
                  }
                ],
                exercises: [
                  {
                    name: 'Chuyển đổi C-G',
                    description: 'Thực hành chuyển đổi giữa C và G',
                    bpm: 80,
                    duration: 600
                  }
                ]
              }
            }
          ]
        },
        {
          title: 'Module 2: Thực hành với metronome',
          description: 'Học cách sử dụng metronome và thực hành với nhịp điệu',
          order: 2,
          lessons: [
            {
              title: 'Strumming cơ bản với metronome',
              description: 'Học pattern strumming cơ bản với metronome',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'rhythm',
              order: 1,
              tabData: {
                contentType: 'rhythm',
                name: 'Strumming Pattern 1',
                beats: 4,
                pattern: [
                  { value: '1', type: 'down' },
                  { value: '2', type: 'down' },
                  { value: '3', type: 'down' },
                  { value: '4', type: 'down' }
                ],
                bpm: 80,
                timeline: [
                  {
                    startTime: 0,
                    endTime: 2,
                    beat: 0,
                    description: 'Beat 1 - Down stroke'
                  },
                  {
                    startTime: 2,
                    endTime: 4,
                    beat: 1,
                    description: 'Beat 2 - Down stroke'
                  },
                  {
                    startTime: 4,
                    endTime: 6,
                    beat: 2,
                    description: 'Beat 3 - Down stroke'
                  },
                  {
                    startTime: 6,
                    endTime: 8,
                    beat: 3,
                    description: 'Beat 4 - Down stroke'
                  }
                ],
                exercises: [
                  {
                    name: 'Strumming với metronome',
                    description: 'Thực hành strumming với metronome 80 BPM',
                    bpm: 80,
                    duration: 300
                  }
                ]
              }
            },
            {
              title: 'Bài hát đầu tiên - Happy Birthday',
              description: 'Chơi bài Happy Birthday với các hợp âm đã học',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'note',
              order: 2,
              tabData: {
                contentType: 'note',
                song: 'Happy Birthday',
                key: 'C',
                tempo: 120,
                tabs: [
                  {
                    notes: [
                      { string: 0, fret: 3 }, // C
                      { string: 1, fret: 0 }, // E
                      { string: 2, fret: 0 }  // G
                    ],
                    startTime: 0,
                    endTime: 2
                  },
                  {
                    notes: [
                      { string: 0, fret: 3 }, // C
                      { string: 1, fret: 0 }, // E
                      { string: 2, fret: 0 }  // G
                    ],
                    startTime: 2,
                    endTime: 4
                  }
                ],
                chords: ['C', 'G', 'F', 'C'],
                timeline: [
                  {
                    startTime: 0,
                    endTime: 2,
                    chord: 'C',
                    description: 'Happy Birthday to you'
                  },
                  {
                    startTime: 2,
                    endTime: 4,
                    chord: 'C',
                    description: 'Happy Birthday to you'
                  },
                  {
                    startTime: 4,
                    endTime: 6,
                    chord: 'F',
                    description: 'Happy Birthday dear'
                  },
                  {
                    startTime: 6,
                    endTime: 8,
                    chord: 'C',
                    description: 'Happy Birthday to you'
                  }
                ],
                exercises: [
                  {
                    name: 'Happy Birthday - Full song',
                    description: 'Chơi toàn bộ bài Happy Birthday',
                    bpm: 120,
                    duration: 180
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      title: 'Fingerstyle Tương Tác - Kỹ Thuật Ngón Tay',
      description: 'Khóa học fingerstyle guitar tương tác với feedback thời gian thực. Học các kỹ thuật fingerpicking từ cơ bản đến nâng cao với giao diện học hiện đại.',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f.jpg',
      level: 'intermediate',
      createdBy: adminUser._id,
      modules: [
        {
          title: 'Module 1: Kỹ thuật fingerpicking cơ bản',
          description: 'Học các kỹ thuật fingerpicking cơ bản',
          order: 1,
          lessons: [
            {
              title: 'Pattern P-I-M-A cơ bản',
              description: 'Học pattern fingerpicking P-I-M-A cơ bản',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'rhythm',
              order: 1,
              tabData: {
                contentType: 'rhythm',
                name: 'P-I-M-A Pattern',
                beats: 4,
                pattern: [
                  { value: 'P', type: 'thumb', string: 5 },
                  { value: 'I', type: 'index', string: 3 },
                  { value: 'M', type: 'middle', string: 2 },
                  { value: 'A', type: 'ring', string: 1 }
                ],
                bpm: 60,
                timeline: [
                  {
                    startTime: 0,
                    endTime: 1,
                    beat: 0,
                    description: 'P - Thumb (string 5)'
                  },
                  {
                    startTime: 1,
                    endTime: 2,
                    beat: 1,
                    description: 'I - Index (string 3)'
                  },
                  {
                    startTime: 2,
                    endTime: 3,
                    beat: 2,
                    description: 'M - Middle (string 2)'
                  },
                  {
                    startTime: 3,
                    endTime: 4,
                    beat: 3,
                    description: 'A - Ring (string 1)'
                  }
                ],
                exercises: [
                  {
                    name: 'P-I-M-A Pattern',
                    description: 'Thực hành pattern P-I-M-A với metronome',
                    bpm: 60,
                    duration: 300
                  }
                ]
              }
            },
            {
              title: 'Travis Picking Pattern',
              description: 'Học kỹ thuật Travis Picking nổi tiếng',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'note',
              order: 2,
              tabData: {
                contentType: 'note',
                name: 'Travis Picking',
                tempo: 80,
                tabs: [
                  {
                    notes: [
                      { string: 5, fret: 0 }, // P
                      { string: 3, fret: 0 }, // I
                      { string: 5, fret: 0 }, // P
                      { string: 2, fret: 0 }  // M
                    ],
                    startTime: 0,
                    endTime: 2
                  }
                ],
                pattern: 'P-I-P-M',
                timeline: [
                  {
                    startTime: 0,
                    endTime: 0.5,
                    beat: 0,
                    description: 'P - Thumb bass'
                  },
                  {
                    startTime: 0.5,
                    endTime: 1,
                    beat: 0.5,
                    description: 'I - Index finger'
                  },
                  {
                    startTime: 1,
                    endTime: 1.5,
                    beat: 1,
                    description: 'P - Thumb bass'
                  },
                  {
                    startTime: 1.5,
                    endTime: 2,
                    beat: 1.5,
                    description: 'M - Middle finger'
                  }
                ],
                exercises: [
                  {
                    name: 'Travis Picking',
                    description: 'Thực hành Travis Picking pattern',
                    bpm: 80,
                    duration: 600
                  }
                ]
              }
            }
          ]
        },
        {
          title: 'Module 2: Bài hát fingerstyle',
          description: 'Thực hành với các bài hát fingerstyle nổi tiếng',
          order: 2,
          lessons: [
            {
              title: 'Blackbird - The Beatles (Fingerstyle)',
              description: 'Học chơi Blackbird với kỹ thuật fingerstyle',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'note',
              order: 1,
              tabData: {
                contentType: 'note',
                song: 'Blackbird',
                artist: 'The Beatles',
                key: 'G',
                tempo: 100,
                tabs: [
                  {
                    notes: [
                      { string: 5, fret: 3 }, // G
                      { string: 3, fret: 0 }, // G
                      { string: 2, fret: 0 }, // B
                      { string: 1, fret: 0 }  // D
                    ],
                    startTime: 0,
                    endTime: 4
                  }
                ],
                chords: ['G', 'Am', 'G', 'Am'],
                timeline: [
                  {
                    startTime: 0,
                    endTime: 2,
                    chord: 'G',
                    description: 'Blackbird singing in the dead of night'
                  },
                  {
                    startTime: 2,
                    endTime: 4,
                    chord: 'Am',
                    description: 'Take these broken wings and learn to fly'
                  }
                ],
                exercises: [
                  {
                    name: 'Blackbird - Full song',
                    description: 'Chơi toàn bộ bài Blackbird',
                    bpm: 100,
                    duration: 240
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      title: 'Guitar Lead Tương Tác - Solo Và Kỹ Thuật',
      description: 'Khóa học guitar lead tương tác với feedback thời gian thực. Học các kỹ thuật solo như bending, vibrato, hammer-on, pull-off với giao diện học hiện đại.',
      thumbnail: 'https://images.unsplash.com/photo-1571974599782-87ff4a1b4a3b.jpg',
      level: 'advanced',
      createdBy: adminUser._id,
      modules: [
        {
          title: 'Module 1: Kỹ thuật solo cơ bản',
          description: 'Học các kỹ thuật solo cơ bản',
          order: 1,
          lessons: [
            {
              title: 'Bending technique',
              description: 'Học kỹ thuật bending (uốn dây)',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'note',
              order: 1,
              tabData: {
                contentType: 'note',
                name: 'Bending Exercise',
                tempo: 80,
                tabs: [
                  {
                    notes: [
                      { string: 2, fret: 7, technique: 'bend', targetFret: 9 },
                      { string: 2, fret: 7, technique: 'release' },
                      { string: 2, fret: 5, technique: 'bend', targetFret: 7 },
                      { string: 2, fret: 5, technique: 'release' }
                    ],
                    startTime: 0,
                    endTime: 4
                  }
                ],
                techniques: ['bend', 'release'],
                timeline: [
                  {
                    startTime: 0,
                    endTime: 1,
                    technique: 'bend',
                    description: 'Bend từ fret 7 lên fret 9'
                  },
                  {
                    startTime: 1,
                    endTime: 2,
                    technique: 'release',
                    description: 'Release về fret 7'
                  },
                  {
                    startTime: 2,
                    endTime: 3,
                    technique: 'bend',
                    description: 'Bend từ fret 5 lên fret 7'
                  },
                  {
                    startTime: 3,
                    endTime: 4,
                    technique: 'release',
                    description: 'Release về fret 5'
                  }
                ],
                exercises: [
                  {
                    name: 'Bending Exercise',
                    description: 'Thực hành kỹ thuật bending',
                    bpm: 80,
                    duration: 300
                  }
                ]
              }
            },
            {
              title: 'Hammer-on và Pull-off',
              description: 'Học kỹ thuật hammer-on và pull-off',
              videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
              contentType: 'note',
              order: 2,
              tabData: {
                contentType: 'note',
                name: 'Hammer-on & Pull-off',
                tempo: 100,
                tabs: [
                  {
                    notes: [
                      { string: 2, fret: 5, technique: 'normal' },
                      { string: 2, fret: 7, technique: 'hammer-on' },
                      { string: 2, fret: 7, technique: 'pull-off' },
                      { string: 2, fret: 5, technique: 'normal' }
                    ],
                    startTime: 0,
                    endTime: 4
                  }
                ],
                techniques: ['hammer-on', 'pull-off'],
                timeline: [
                  {
                    startTime: 0,
                    endTime: 1,
                    technique: 'normal',
                    description: 'Fret 5 - normal'
                  },
                  {
                    startTime: 1,
                    endTime: 2,
                    technique: 'hammer-on',
                    description: 'Hammer-on lên fret 7'
                  },
                  {
                    startTime: 2,
                    endTime: 3,
                    technique: 'pull-off',
                    description: 'Pull-off về fret 5'
                  },
                  {
                    startTime: 3,
                    endTime: 4,
                    technique: 'normal',
                    description: 'Fret 5 - normal'
                  }
                ],
                exercises: [
                  {
                    name: 'Hammer-on & Pull-off',
                    description: 'Thực hành hammer-on và pull-off',
                    bpm: 100,
                    duration: 300
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ];

  console.log('Đang tạo dữ liệu khóa học tương tác...');

  for (const courseData of interactiveCourses) {
    try {
      // Kiểm tra xem khóa học đã tồn tại chưa
      const existingCourse = await Course.findOne({ title: courseData.title });
      
      if (existingCourse) {
        console.log(`Khóa học đã tồn tại: ${courseData.title}`);
        continue;
      }

      // Tạo khóa học mới
      const course = new Course(courseData);
      await course.save();
      console.log(`Đã tạo khóa học: ${courseData.title}`);
    } catch (error) {
      console.error(`Lỗi khi tạo khóa học ${courseData.title}:`, error.message);
    }
  }

  console.log('Hoàn thành tạo dữ liệu khóa học tương tác!');
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
