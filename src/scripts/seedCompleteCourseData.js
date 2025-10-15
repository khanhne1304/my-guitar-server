import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

// Dữ liệu khóa học hoàn chỉnh với modules và lessons
const completeCourseData = [
  {
    title: 'Guitar Cơ Bản - Từ Zero Đến Hero',
    slug: 'guitar-co-ban-tu-zero-den-hero',
    summary: 'Khóa học guitar cơ bản dành cho người mới bắt đầu. Học từ cách cầm đàn đến chơi bài hát đầu tiên.',
    description: 'Khóa học guitar cơ bản toàn diện dành cho người mới bắt đầu. Bạn sẽ học cách cầm đàn, đánh các hợp âm cơ bản, và chơi những bài hát đơn giản đầu tiên. Khóa học được thiết kế dễ hiểu với video HD và bài tập thực hành.',
    durationWeeks: 8,
    thumbnail: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1.jpg',
    level: 'beginner',
    isInteractive: true,
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
    },
    modules: [
      {
        title: 'Làm Quen Với Guitar',
        description: 'Học cách cầm đàn, tư thế ngồi và những điều cơ bản nhất về guitar',
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
            skills: ['Kiến thức cơ bản về guitar', 'Hiểu về nhạc cụ'],
            prerequisites: [],
            content: {
              text: 'Guitar là một nhạc cụ dây có 6 dây, được sử dụng rộng rãi trong nhiều thể loại nhạc. Có hai loại chính: guitar acoustic và guitar điện. Guitar acoustic có âm thanh tự nhiên, còn guitar điện cần amplifier để khuếch đại âm thanh.',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: null
            },
            practice: {
              metronomeBpm: 60,
              minutes: 10,
              checklist: [
                'Nghe và hiểu về guitar',
                'Quan sát cấu tạo đàn',
                'Tìm hiểu về các bộ phận'
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
                  },
                  {
                    question: 'Guitar acoustic và guitar điện khác nhau như thế nào?',
                    options: ['Không khác gì', 'Acoustic cần amplifier', 'Điện cần amplifier', 'Cả hai đều giống nhau'],
                    correct: 2
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
            skills: ['Tư thế cơ bản', 'Cách cầm đàn', 'Tư thế ngồi'],
            prerequisites: ['Kiến thức cơ bản về guitar'],
            content: {
              text: 'Tư thế ngồi đúng rất quan trọng để chơi guitar thoải mái và tránh chấn thương. Ngồi thẳng lưng, đặt guitar trên đùi phải, tay trái cầm cần đàn, tay phải đặt trên thùng đàn.',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: null
            },
            practice: {
              metronomeBpm: 60,
              minutes: 15,
              checklist: [
                'Ngồi thẳng lưng',
                'Đặt guitar đúng vị trí',
                'Tay trái cầm cần đàn',
                'Tay phải đặt trên thùng đàn',
                'Giữ tư thế thoải mái'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Quay video tư thế ngồi và cầm đàn trong 30 giây',
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
            skills: ['Hợp âm C Major', 'Chuyển hợp âm cơ bản', 'Kỹ thuật bấm hợp âm'],
            prerequisites: ['Tư thế cơ bản', 'Cách cầm đàn'],
            content: {
              text: 'Hợp âm C Major là một trong những hợp âm cơ bản nhất. Cách bấm: ngón 1 ở dây 2 phím 1, ngón 2 ở dây 4 phím 2, ngón 3 ở dây 5 phím 3. Đánh từ dây 5 xuống dây 1.',
              chords: [
                {
                  name: 'C Major',
                  fingering: 'x32010',
                  difficulty: 'easy'
                }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/c-major.mp3'
            },
            practice: {
              metronomeBpm: 80,
              minutes: 20,
              checklist: [
                'Bấm đúng vị trí các ngón tay',
                'Luyện tập chuyển hợp âm',
                'Đánh đều và rõ ràng',
                'Giữ nhịp với metronome'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi hợp âm C 10 lần liên tiếp với metronome',
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
            skills: ['Hợp âm G Major', 'Chuyển hợp âm C-G', 'Kỹ thuật bấm hợp âm'],
            prerequisites: ['Hợp âm C Major', 'Chuyển hợp âm cơ bản'],
            content: {
              text: 'Hợp âm G Major: ngón 2 ở dây 5 phím 2, ngón 3 ở dây 6 phím 3, ngón 4 ở dây 1 phím 3. Đánh tất cả 6 dây.',
              chords: [
                {
                  name: 'G Major',
                  fingering: '320003',
                  difficulty: 'easy'
                }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/g-major.mp3'
            },
            practice: {
              metronomeBpm: 80,
              minutes: 20,
              checklist: [
                'Bấm đúng vị trí hợp âm G',
                'Luyện tập chuyển C-G',
                'Đánh đều và rõ ràng',
                'Giữ nhịp với metronome'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chuyển hợp âm C-G 10 lần với metronome',
                duration: 60
              }
            },
            order: 2
          },
          {
            title: 'Hợp Âm Am và F Major',
            type: 'CHORD',
            durationMin: 30,
            objectives: [
              'Học hợp âm Am và F',
              'Luyện tập chuyển 4 hợp âm cơ bản',
              'Chuẩn bị cho bài hát đầu tiên'
            ],
            skills: ['Hợp âm Am', 'Hợp âm F Major', 'Chuyển hợp âm nâng cao'],
            prerequisites: ['Hợp âm C Major', 'Hợp âm G Major'],
            content: {
              text: 'Hợp âm Am: ngón 1 ở dây 2 phím 1, ngón 2 ở dây 4 phím 2, ngón 3 ở dây 3 phím 2. Hợp âm F: ngón 1 bấm tất cả dây ở phím 1, ngón 2 ở dây 3 phím 2, ngón 3 ở dây 5 phím 3, ngón 4 ở dây 4 phím 3.',
              chords: [
                {
                  name: 'Am',
                  fingering: 'x02210',
                  difficulty: 'easy'
                },
                {
                  name: 'F Major',
                  fingering: '133211',
                  difficulty: 'hard'
                }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/am-f-major.mp3'
            },
            practice: {
              metronomeBpm: 70,
              minutes: 25,
              checklist: [
                'Bấm đúng hợp âm Am',
                'Luyện tập hợp âm F (khó)',
                'Chuyển giữa 4 hợp âm: C-G-Am-F',
                'Giữ nhịp đều'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chuyển 4 hợp âm C-G-Am-F 5 lần',
                duration: 90
              }
            },
            order: 3
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
            skills: ['Chơi bài hát đơn giản', 'Kết hợp hợp âm', 'Đếm nhịp'],
            prerequisites: ['Hợp âm C Major', 'Hợp âm G Major'],
            content: {
              text: 'Bài Happy Birthday sử dụng hợp âm C và G. Cấu trúc: C-C-G-C-F-C-G-C. Đánh nhịp 4/4, mỗi hợp âm 1 nhịp.',
              tabs: [
                'C     C     G     C',
                'Happy Birthday to you',
                'C     C     G     C', 
                'Happy Birthday to you',
                'C     C     G     C',
                'Happy Birthday dear [name]',
                'C     C     G     C',
                'Happy Birthday to you'
              ],
              chords: [
                { name: 'C Major', fingering: 'x32010' },
                { name: 'G Major', fingering: '320003' }
              ],
              strumPattern: 'D-D-U-D-U-D',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/happy-birthday.mp3'
            },
            practice: {
              metronomeBpm: 100,
              minutes: 25,
              checklist: [
                'Chơi đúng hợp âm',
                'Giữ nhịp đều',
                'Hát theo nhạc',
                'Chuyển hợp âm mượt mà'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi và hát bài Happy Birthday hoàn chỉnh',
                duration: 120
              }
            },
            order: 1
          }
        ]
      }
    ]
  },
  {
    title: 'Fingerstyle Guitar - Nghệ Thuật Đánh Đàn',
    slug: 'fingerstyle-guitar-nghe-thuat-danh-dan',
    summary: 'Học fingerstyle guitar từ cơ bản đến nâng cao. Nắm vững kỹ thuật fingerpicking và chơi những bản nhạc fingerstyle nổi tiếng.',
    description: 'Khóa học fingerstyle guitar toàn diện dành cho người đã có nền tảng guitar cơ bản. Bạn sẽ học kỹ thuật fingerpicking, đánh bass và melody cùng lúc, và chơi những bản nhạc fingerstyle nổi tiếng như Blackbird, Tears in Heaven.',
    durationWeeks: 12,
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f.jpg',
    level: 'intermediate',
    isInteractive: true,
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
    },
    modules: [
      {
        title: 'Kỹ Thuật Fingerpicking Cơ Bản',
        description: 'Học cách sử dụng các ngón tay để đánh đàn và các pattern cơ bản',
        order: 1,
        lessons: [
          {
            title: 'Kỹ Thuật Fingerpicking Cơ Bản',
            type: 'PRACTICE',
            durationMin: 25,
            objectives: [
              'Học cách sử dụng các ngón tay',
              'Luyện tập pattern cơ bản',
              'Phối hợp tay phải và tay trái'
            ],
            skills: ['Fingerpicking cơ bản', 'Sử dụng ngón tay', 'Pattern cơ bản'],
            prerequisites: ['Hợp âm cơ bản', 'Kỹ thuật guitar cơ bản'],
            content: {
              text: 'Fingerpicking là kỹ thuật sử dụng các ngón tay phải để đánh đàn thay vì dùng pick. Ngón cái (p) đánh dây bass, ngón trỏ (i), ngón giữa (m), ngón áp út (a) đánh dây treble.',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/fingerpicking-basic.mp3'
            },
            practice: {
              metronomeBpm: 60,
              minutes: 20,
              checklist: [
                'Đặt tay phải đúng vị trí',
                'Luyện tập từng ngón riêng biệt',
                'Kết hợp các ngón tay',
                'Giữ nhịp đều'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm luyện tập fingerpicking cơ bản',
                duration: 60
              }
            },
            order: 1
          },
          {
            title: 'Travis Picking Pattern',
            type: 'PRACTICE',
            durationMin: 30,
            objectives: [
              'Học pattern Travis Picking',
              'Luyện tập với hợp âm cơ bản',
              'Tăng tốc độ dần'
            ],
            skills: ['Travis Picking', 'Pattern fingerpicking', 'Kỹ thuật nâng cao'],
            prerequisites: ['Fingerpicking cơ bản', 'Sử dụng ngón tay'],
            content: {
              text: 'Travis Picking là pattern fingerpicking phổ biến nhất. Pattern: p-i-m-i (ngón cái - trỏ - giữa - trỏ). Luyện tập với hợp âm C, G, Am.',
              tabs: [
                'C: p-i-m-i-p-i-m-i',
                'G: p-i-m-i-p-i-m-i',
                'Am: p-i-m-i-p-i-m-i'
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/travis-picking.mp3'
            },
            practice: {
              metronomeBpm: 80,
              minutes: 25,
              checklist: [
                'Luyện tập pattern p-i-m-i',
                'Kết hợp với hợp âm C',
                'Chuyển sang hợp âm G',
                'Tăng tốc độ dần'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi Travis Picking với 3 hợp âm',
                duration: 90
              }
            },
            order: 2
          }
        ]
      },
      {
        title: 'Hợp Âm Mở Rộng',
        description: 'Học các hợp âm phức tạp hơn để tạo màu sắc cho fingerstyle',
        order: 2,
        lessons: [
          {
            title: 'Hợp Âm 7th và Sus',
            type: 'CHORD',
            durationMin: 35,
            objectives: [
              'Học hợp âm 7th cơ bản',
              'Học hợp âm sus2, sus4',
              'Áp dụng vào fingerstyle'
            ],
            skills: ['Hợp âm 7th', 'Hợp âm sus', 'Hòa âm nâng cao'],
            prerequisites: ['Travis Picking', 'Pattern fingerpicking'],
            content: {
              text: 'Hợp âm 7th tạo cảm giác jazz, hợp âm sus tạo cảm giác treo. C7: x32010, Csus2: x30010, Csus4: x33010.',
              chords: [
                {
                  name: 'C7',
                  fingering: 'x32010',
                  difficulty: 'medium'
                },
                {
                  name: 'Csus2',
                  fingering: 'x30010',
                  difficulty: 'easy'
                },
                {
                  name: 'Csus4',
                  fingering: 'x33010',
                  difficulty: 'easy'
                }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/7th-sus-chords.mp3'
            },
            practice: {
              metronomeBpm: 70,
              minutes: 30,
              checklist: [
                'Luyện tập hợp âm C7',
                'Luyện tập Csus2, Csus4',
                'Kết hợp với Travis Picking',
                'Thử nghiệm các pattern khác'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi các hợp âm mở rộng với fingerpicking',
                duration: 120
              }
            },
            order: 1
          }
        ]
      },
      {
        title: 'Bài Hát Fingerstyle',
        description: 'Áp dụng tất cả kỹ thuật đã học vào bài hát thực tế',
        order: 3,
        lessons: [
          {
            title: 'Blackbird - The Beatles',
            type: 'SONG',
            durationMin: 40,
            objectives: [
              'Chơi bài Blackbird',
              'Kết hợp fingerpicking và melody',
              'Thể hiện cảm xúc qua âm nhạc'
            ],
            skills: ['Chơi bài hát fingerstyle', 'Kết hợp melody và bass', 'Thể hiện cảm xúc'],
            prerequisites: ['Hợp âm 7th và Sus', 'Kỹ thuật fingerpicking nâng cao'],
            content: {
              text: 'Blackbird là bài hát fingerstyle kinh điển của The Beatles. Sử dụng kỹ thuật fingerpicking phức tạp với melody và bass cùng lúc.',
              tabs: [
                'e|--0--0--0--0--0--0--0--0--',
                'B|--1--1--1--1--1--1--1--1--',
                'G|--2--2--2--2--2--2--2--2--',
                'D|--2--2--2--2--2--2--2--2--',
                'A|--0--0--0--0--0--0--0--0--',
                'E|--0--0--0--0--0--0--0--0--'
              ],
              chords: [
                { name: 'G', fingering: '320003' },
                { name: 'Em', fingering: '022000' },
                { name: 'Am', fingering: 'x02210' }
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/blackbird.mp3'
            },
            practice: {
              metronomeBpm: 90,
              minutes: 35,
              checklist: [
                'Học melody cơ bản',
                'Kết hợp với bass',
                'Luyện tập từng đoạn',
                'Chơi hoàn chỉnh bài hát'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi bài Blackbird hoàn chỉnh',
                duration: 180
              }
            },
            order: 1
          }
        ]
      }
    ]
  },
  {
    title: 'Guitar Lead - Kỹ Thuật Solo Nâng Cao',
    slug: 'guitar-lead-ky-thuat-solo-nang-cao',
    summary: 'Khóa học guitar lead dành cho người đã có nền tảng. Học các kỹ thuật solo như bending, vibrato, hammer-on, pull-off.',
    description: 'Khóa học guitar lead toàn diện dành cho người đã có nền tảng guitar vững chắc. Bạn sẽ học các kỹ thuật solo như bending, vibrato, hammer-on, pull-off và áp dụng vào các bài solo kinh điển như Eruption, Stairway to Heaven.',
    durationWeeks: 16,
    thumbnail: 'https://images.unsplash.com/photo-1571974599782-87ff4a1b4a3b.jpg',
    level: 'advanced',
    isInteractive: true,
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
    },
    modules: [
      {
        title: 'Kỹ Thuật Solo Cơ Bản',
        description: 'Học các kỹ thuật solo cơ bản như bending, vibrato, hammer-on, pull-off',
        order: 1,
        lessons: [
          {
            title: 'Bending và Vibrato',
            type: 'PRACTICE',
            durationMin: 30,
            objectives: [
              'Học kỹ thuật bending',
              'Học kỹ thuật vibrato',
              'Kết hợp bending và vibrato'
            ],
            skills: ['Bending', 'Vibrato', 'Kỹ thuật solo cơ bản'],
            prerequisites: ['Guitar trung cấp', 'Kỹ thuật nâng cao'],
            content: {
              text: 'Bending là kỹ thuật kéo dây để tăng cao độ. Vibrato là kỹ thuật rung dây để tạo cảm xúc. Kết hợp hai kỹ thuật này tạo nên phong cách solo đặc trưng.',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/bending-vibrato.mp3'
            },
            practice: {
              metronomeBpm: 80,
              minutes: 25,
              checklist: [
                'Luyện tập bending 1/2 tone',
                'Luyện tập bending 1 tone',
                'Luyện tập vibrato',
                'Kết hợp bending và vibrato'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm luyện tập bending và vibrato',
                duration: 60
              }
            },
            order: 1
          },
          {
            title: 'Hammer-on và Pull-off',
            type: 'PRACTICE',
            durationMin: 35,
            objectives: [
              'Học kỹ thuật hammer-on',
              'Học kỹ thuật pull-off',
              'Luyện tập legato'
            ],
            skills: ['Hammer-on', 'Pull-off', 'Legato', 'Kỹ thuật solo'],
            prerequisites: ['Bending và Vibrato', 'Kỹ thuật solo cơ bản'],
            content: {
              text: 'Hammer-on là kỹ thuật gõ ngón tay xuống phím để tạo âm thanh. Pull-off là kỹ thuật kéo ngón tay ra khỏi phím để tạo âm thanh. Hai kỹ thuật này tạo nên legato - âm thanh liền mạch.',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/hammer-pull.mp3'
            },
            practice: {
              metronomeBpm: 100,
              minutes: 30,
              checklist: [
                'Luyện tập hammer-on cơ bản',
                'Luyện tập pull-off cơ bản',
                'Kết hợp hammer-on và pull-off',
                'Luyện tập legato scale'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm luyện tập hammer-on và pull-off',
                duration: 90
              }
            },
            order: 2
          }
        ]
      },
      {
        title: 'Scale và Modes',
        description: 'Học các scale quan trọng cho solo guitar',
        order: 2,
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
            skills: ['Pentatonic scale', 'Solo techniques', 'Scale patterns'],
            prerequisites: ['Hammer-on và Pull-off', 'Kỹ thuật solo'],
            content: {
              text: 'Pentatonic scale là scale quan trọng nhất trong guitar solo. Có 5 nốt chính và được sử dụng rộng rãi trong rock, blues. Có 5 positions chính trên cần đàn.',
              tabs: [
                'e|--3--5--8--10--12--15--',
                'B|--3--5--8--10--12--15--',
                'G|--3--5--7--10--12--15--',
                'D|--3--5--7--10--12--15--',
                'A|--3--5--7--10--12--15--',
                'E|--3--5--8--10--12--15--'
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/pentatonic.mp3'
            },
            practice: {
              metronomeBpm: 120,
              minutes: 40,
              checklist: [
                'Luyện tập scale từ từ',
                'Tăng tốc độ dần',
                'Thử nghiệm với các pattern khác nhau',
                'Áp dụng vào solo đơn giản'
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
      },
      {
        title: 'Solo Guitar Kinh Điển',
        description: 'Học và phân tích các solo guitar kinh điển',
        order: 3,
        lessons: [
          {
            title: 'Eruption - Van Halen',
            type: 'SONG',
            durationMin: 50,
            objectives: [
              'Học solo Eruption',
              'Áp dụng tất cả kỹ thuật đã học',
              'Thể hiện phong cách Van Halen'
            ],
            skills: ['Solo guitar', 'Kỹ thuật nâng cao', 'Phong cách Van Halen'],
            prerequisites: ['Pentatonic Scale', 'Kỹ thuật solo nâng cao'],
            content: {
              text: 'Eruption là solo guitar kinh điển của Eddie Van Halen. Sử dụng tapping, bending, vibrato và nhiều kỹ thuật nâng cao khác.',
              tabs: [
                'e|--15--12--15--12--15--12--15--12--',
                'B|--15--12--15--12--15--12--15--12--',
                'G|--14--12--14--12--14--12--14--12--',
                'D|--14--12--14--12--14--12--14--12--',
                'A|--12--10--12--10--12--10--12--10--',
                'E|--12--10--12--10--12--10--12--10--'
              ],
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              audioUrl: 'https://example.com/audio/eruption.mp3'
            },
            practice: {
              metronomeBpm: 140,
              minutes: 45,
              checklist: [
                'Học từng đoạn solo',
                'Luyện tập với metronome',
                'Kết hợp tất cả kỹ thuật',
                'Thể hiện phong cách riêng'
              ]
            },
            assessment: {
              type: 'recording',
              config: {
                description: 'Thu âm chơi solo Eruption hoàn chỉnh',
                duration: 240
              }
            },
            order: 1
          }
        ]
      }
    ]
  }
];

// Tạo admin user
const createAdminUser = async () => {
  try {
    let admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      admin = new User({
        username: 'admin',
        email: 'admin@guitar.com',
        fullName: 'Guitar Learning Admin',
        password: 'Admin@123',
        role: 'admin',
        isActive: true
      });
      await admin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    return admin;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

// Tạo sample student user
const createSampleStudent = async () => {
  try {
    let student = await User.findOne({ email: 'student@guitar.com' });
    
    if (!student) {
      student = new User({
        username: 'student',
        email: 'student@guitar.com',
        fullName: 'Guitar Student',
        password: 'Student@123',
        role: 'user',
        isActive: true
      });
      await student.save();
      console.log('✅ Sample student created');
    } else {
      console.log('✅ Sample student already exists');
    }
    
    return student;
  } catch (error) {
    console.error('Error creating sample student:', error);
    throw error;
  }
};

// Seed courses với modules và lessons
const seedCompleteCourses = async () => {
  try {
    console.log('🗑️ Clearing existing courses...');
    await Course.deleteMany({});
    
    const admin = await createAdminUser();
    const student = await createSampleStudent();
    
    console.log('📚 Creating complete course data...');
    
    for (const courseData of completeCourseData) {
      const course = new Course({
        ...courseData,
        createdBy: admin._id,
        stats: {
          totalViews: Math.floor(Math.random() * 1000) + 100,
          totalCompletions: Math.floor(Math.random() * 100) + 10,
          averageRating: Math.round((Math.random() * 2 + 3) * 10) / 10,
          totalRatings: Math.floor(Math.random() * 200) + 50
        }
      });
      
      await course.save();
      console.log(`✅ Created course: ${course.title} (${course.modules.length} modules, ${course.lessonCount} lessons)`);
    }
    
    console.log('🎉 All courses seeded successfully!');
    
    // Hiển thị thống kê
    const totalCourses = await Course.countDocuments();
    const beginnerCourses = await Course.countDocuments({ level: 'beginner' });
    const intermediateCourses = await Course.countDocuments({ level: 'intermediate' });
    const advancedCourses = await Course.countDocuments({ level: 'advanced' });
    const interactiveCourses = await Course.countDocuments({ isInteractive: true });
    
    console.log('\n=== THỐNG KÊ KHÓA HỌC ===');
    console.log(`Tổng số khóa học: ${totalCourses}`);
    console.log(`Khóa học cơ bản: ${beginnerCourses}`);
    console.log(`Khóa học trung bình: ${intermediateCourses}`);
    console.log(`Khóa học nâng cao: ${advancedCourses}`);
    console.log(`Khóa học tương tác: ${interactiveCourses}`);
    
    return { admin, student };
  } catch (error) {
    console.error('Error seeding courses:', error);
    throw error;
  }
};

// Tạo sample progress data
const seedSampleProgress = async (student) => {
  try {
    console.log('📊 Creating sample progress data...');
    
    // Clear existing progress
    await UserProgress.deleteMany({});
    
    const courses = await Course.find({});
    if (courses.length === 0) {
      console.log('❌ No courses found for progress data');
      return;
    }
    
    // Tạo progress cho khóa học đầu tiên
    const firstCourse = courses[0];
    const firstModule = firstCourse.modules[0];
    const firstLesson = firstModule.lessons[0];
    
    const progress = new UserProgress({
      userId: student._id,
      courseId: firstCourse._id,
      lessonKey: `${firstCourse.slug}#${firstModule.order}.${firstLesson.order}`,
      status: 'completed',
      score: 85,
      acquiredSkills: firstLesson.skills,
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
    
  } catch (error) {
    console.error('Error creating sample progress:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting database seeding...');
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    const { admin, student } = await seedCompleteCourses();
    await seedSampleProgress(student);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Admin: admin@guitar.com / Admin@123');
    console.log('Student: student@guitar.com / Student@123');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    console.error('Stack trace:', error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].includes('seedCompleteCourseData.js')) {
  main();
}

export { seedCompleteCourses, createAdminUser, createSampleStudent, seedSampleProgress };
