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

  // Tìm khóa học để cập nhật
  const course = await Course.findOne({ title: 'Guitar Tương Tác - Học Cơ Bản Với Metronome' });
  
  if (!course) {
    console.log('Không tìm thấy khóa học. Vui lòng chạy seedInteractiveCourses.js trước.');
    await mongoose.disconnect();
    return;
  }

  // Cập nhật dữ liệu bài học với tabData chi tiết
  const updatedLessons = [
    {
      title: 'Hợp âm C - Hợp đầu tiên',
      description: 'Học hợp âm C cơ bản với metronome và feedback thời gian thực',
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      contentType: 'chord',
      order: 2,
      tabData: {
        contentType: 'chord',
        chord: 'C',
        frets: [0, 3, 2, 0, 1, 0],
        strings: ['E', 'A', 'D', 'G', 'B', 'E'],
        fingerPositions: [
          { finger: 1, string: 1, fret: 1 },
          { finger: 2, string: 2, fret: 2 },
          { finger: 3, string: 3, fret: 3 }
        ],
        expectedFrequency: 261.63, // C4
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
          },
          {
            startTime: 4,
            endTime: 6,
            chord: 'C',
            description: 'Giữ hợp âm C',
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
          },
          {
            name: 'Chuyển đổi C-C',
            description: 'Thực hành chuyển đổi C-C',
            bpm: 80,
            duration: 180,
            targetAccuracy: 90
          }
        ],
        feedback: {
          correctNotes: ['C', 'E', 'G'],
          tolerance: 20, // Hz tolerance
          successMessage: 'Tuyệt vời! Bạn đã chơi đúng hợp âm C.',
          warningMessage: 'Hãy kiểm tra lại vị trí ngón tay.',
          errorMessage: 'Chưa đúng. Hãy xem lại video hướng dẫn.'
        }
      }
    },
    {
      title: 'Hợp âm G - Hợp âm thứ hai',
      description: 'Học hợp âm G và chuyển đổi C-G với feedback',
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      contentType: 'chord',
      order: 3,
      tabData: {
        contentType: 'chord',
        chord: 'G',
        frets: [3, 2, 0, 0, 0, 3],
        strings: ['E', 'A', 'D', 'G', 'B', 'E'],
        fingerPositions: [
          { finger: 1, string: 5, fret: 2 },
          { finger: 2, string: 6, fret: 3 },
          { finger: 3, string: 1, fret: 3 }
        ],
        expectedFrequency: 392.00, // G4
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
          },
          {
            startTime: 4,
            endTime: 6,
            chord: 'C',
            description: 'Chuyển về hợp âm C',
            expectedNotes: ['C', 'E', 'G']
          },
          {
            startTime: 6,
            endTime: 8,
            chord: 'G',
            description: 'Chuyển về hợp âm G',
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
          },
          {
            name: 'Chuyển đổi C-G',
            description: 'Thực hành chuyển đổi giữa C và G',
            bpm: 80,
            duration: 600,
            targetAccuracy: 85
          }
        ],
        feedback: {
          correctNotes: ['G', 'B', 'D'],
          tolerance: 20,
          successMessage: 'Tuyệt vời! Bạn đã chơi đúng hợp âm G.',
          warningMessage: 'Hãy kiểm tra lại vị trí ngón tay.',
          errorMessage: 'Chưa đúng. Hãy xem lại video hướng dẫn.'
        }
      }
    },
    {
      title: 'Strumming cơ bản với metronome',
      description: 'Học pattern strumming cơ bản với metronome và feedback',
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      contentType: 'rhythm',
      order: 1,
      tabData: {
        contentType: 'rhythm',
        name: 'Strumming Pattern 1',
        beats: 4,
        pattern: [
          { value: '1', type: 'down', direction: 'down' },
          { value: '2', type: 'down', direction: 'down' },
          { value: '3', type: 'down', direction: 'down' },
          { value: '4', type: 'down', direction: 'down' }
        ],
        bpm: 80,
        timeline: [
          {
            startTime: 0,
            endTime: 0.75,
            beat: 0,
            description: 'Beat 1 - Down stroke',
            action: 'strum_down'
          },
          {
            startTime: 0.75,
            endTime: 1.5,
            beat: 1,
            description: 'Beat 2 - Down stroke',
            action: 'strum_down'
          },
          {
            startTime: 1.5,
            endTime: 2.25,
            beat: 2,
            description: 'Beat 3 - Down stroke',
            action: 'strum_down'
          },
          {
            startTime: 2.25,
            endTime: 3,
            beat: 3,
            description: 'Beat 4 - Down stroke',
            action: 'strum_down'
          }
        ],
        exercises: [
          {
            name: 'Strumming với metronome',
            description: 'Thực hành strumming với metronome 80 BPM',
            bpm: 80,
            duration: 300,
            targetAccuracy: 85
          },
          {
            name: 'Strumming pattern nâng cao',
            description: 'Thực hành pattern strumming phức tạp hơn',
            bpm: 100,
            duration: 600,
            targetAccuracy: 90
          }
        ],
        feedback: {
          correctRhythm: ['down', 'down', 'down', 'down'],
          tolerance: 0.1, // 100ms tolerance
          successMessage: 'Tuyệt vời! Bạn đã giữ đúng nhịp.',
          warningMessage: 'Hãy chú ý đến nhịp điệu.',
          errorMessage: 'Chưa đúng nhịp. Hãy lắng nghe metronome.'
        }
      }
    },
    {
      title: 'Bài hát đầu tiên - Happy Birthday',
      description: 'Chơi bài Happy Birthday với các hợp âm đã học và feedback',
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      contentType: 'tab',
      order: 2,
      tabData: {
        contentType: 'tab',
        song: 'Happy Birthday',
        artist: 'Traditional',
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
            endTime: 2,
            chord: 'C'
          },
          {
            notes: [
              { string: 0, fret: 3 }, // C
              { string: 1, fret: 0 }, // E
              { string: 2, fret: 0 }  // G
            ],
            startTime: 2,
            endTime: 4,
            chord: 'C'
          },
          {
            notes: [
              { string: 0, fret: 1 }, // F
              { string: 1, fret: 1 }, // F
              { string: 2, fret: 2 }  // A
            ],
            startTime: 4,
            endTime: 6,
            chord: 'F'
          },
          {
            notes: [
              { string: 0, fret: 3 }, // C
              { string: 1, fret: 0 }, // E
              { string: 2, fret: 0 }  // G
            ],
            startTime: 6,
            endTime: 8,
            chord: 'C'
          }
        ],
        chords: ['C', 'C', 'F', 'C'],
        timeline: [
          {
            startTime: 0,
            endTime: 2,
            chord: 'C',
            description: 'Happy Birthday to you',
            expectedNotes: ['C', 'E', 'G']
          },
          {
            startTime: 2,
            endTime: 4,
            chord: 'C',
            description: 'Happy Birthday to you',
            expectedNotes: ['C', 'E', 'G']
          },
          {
            startTime: 4,
            endTime: 6,
            chord: 'F',
            description: 'Happy Birthday dear',
            expectedNotes: ['F', 'A', 'C']
          },
          {
            startTime: 6,
            endTime: 8,
            chord: 'C',
            description: 'Happy Birthday to you',
            expectedNotes: ['C', 'E', 'G']
          }
        ],
        exercises: [
          {
            name: 'Happy Birthday - Full song',
            description: 'Chơi toàn bộ bài Happy Birthday',
            bpm: 120,
            duration: 180,
            targetAccuracy: 85
          },
          {
            name: 'Happy Birthday - Slow practice',
            description: 'Thực hành chậm với metronome 80 BPM',
            bpm: 80,
            duration: 240,
            targetAccuracy: 90
          }
        ],
        feedback: {
          correctChords: ['C', 'C', 'F', 'C'],
          correctNotes: {
            'C': ['C', 'E', 'G'],
            'F': ['F', 'A', 'C']
          },
          tolerance: 20,
          successMessage: 'Tuyệt vời! Bạn đã chơi đúng bài hát.',
          warningMessage: 'Hãy chú ý đến chuyển đổi hợp âm.',
          errorMessage: 'Chưa đúng. Hãy luyện tập từng hợp âm trước.'
        }
      }
    }
  ];

  console.log('Đang cập nhật dữ liệu bài học...');

  try {
    // Cập nhật từng bài học
    for (const lessonData of updatedLessons) {
      const module = course.modules.find(m => m.order === 1); // Module 1
      if (module) {
        const lesson = module.lessons.find(l => l.order === lessonData.order);
        if (lesson) {
          lesson.title = lessonData.title;
          lesson.description = lessonData.description;
          lesson.videoUrl = lessonData.videoUrl;
          lesson.contentType = lessonData.contentType;
          lesson.tabData = lessonData.tabData;
          
          console.log(`Đã cập nhật bài học: ${lessonData.title}`);
        }
      }
    }

    // Lưu khóa học đã cập nhật
    await course.save();
    console.log('Đã cập nhật khóa học thành công!');
  } catch (error) {
    console.error('Lỗi khi cập nhật khóa học:', error.message);
  }

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});








