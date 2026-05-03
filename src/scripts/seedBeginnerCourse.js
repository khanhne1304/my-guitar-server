/**
 * Khóa học Cơ bản — nội dung tiếng Việt (lưu trong MongoDB).
 * Chạy: npm run seed:course
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import CourseModule from '../models/CourseModule.js';
import CourseLesson from '../models/CourseLesson.js';
import ModuleQuiz from '../models/ModuleQuiz.js';
import CourseUserProgress from '../models/CourseUserProgress.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

/** Giữ slug ổn định để seed lại không tạo khóa trùng */
const SLUG = 'beginner-guitar-basics';

function q(key, text, options, correctIndex) {
  return { key, text, options, correctIndex };
}

async function wipeExistingCourse() {
  const existing = await Course.findOne({ slug: SLUG });
  if (!existing) return;
  const mods = await CourseModule.find({ course: existing._id }).select('_id');
  const mids = mods.map((m) => m._id);
  await CourseLesson.deleteMany({ module: { $in: mids } });
  await ModuleQuiz.deleteMany({ module: { $in: mids } });
  await CourseModule.deleteMany({ course: existing._id });
  await CourseUserProgress.deleteMany({ course: existing._id });
  await Course.deleteOne({ _id: existing._id });
  console.log('Đã gỡ khóa học cũ để seed lại.');
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Đã kết nối MongoDB');

  await wipeExistingCourse();

  const course = await Course.create({
    slug: SLUG,
    title: 'Guitar cơ bản — Lớp 1',
    subtitle: 'Lộ trình có cấu trúc cho người mới bắt đầu',
    description:
      'Làm quen đàn, hợp âm mở, quạt tay và bài hát đơn giản — kèm video và kiểm tra cuối mỗi học phần (≥60% để mở học phần tiếp theo).',
    level: 'beginner',
    levelLabel: 'Cơ bản',
    order: 1,
    isPublished: true,
    createdBy: null,
    tags: ['guitar', 'co-ban'],
  });

  const modulesData = [
    {
      title: 'Làm quen với guitar',
      description: 'Cấu tạo đàn, tư thế ngồi/đứng và chỉnh dây.',
      order: 1,
      lessons: [
        {
          title: 'Các bộ phận của guitar',
          description: 'Tên các phần chính trên guitar acoustic và electric.',
          videoUrl: 'https://www.youtube.com/watch?v=BBpIV9A2NfU',
          durationMinutes: 10,
          order: 1,
        },
        {
          title: 'Cách cầm và ôm guitar',
          description: 'Tư thế thoải mái khi ngồi và đứng chơi.',
          videoUrl: 'https://www.youtube.com/watch?v=ygpimcBh-qA',
          durationMinutes: 12,
          order: 2,
        },
        {
          title: 'Chỉnh dây cơ bản',
          description: 'Nghe mẫu âm cao và tinh chỉnh từng dây.',
          videoUrl: 'https://www.youtube.com/watch?v=vj72VKjWLMM',
          durationMinutes: 14,
          order: 3,
        },
      ],
      quiz: {
        title: 'Kiểm tra: Làm quen với guitar',
        questions: [
          q(
            'm1q1',
            'Với chỉnh dây chuẩn, thứ tự các dây từ dày đến mảnh là:',
            ['E A D G B E', 'E B G D A E', 'G D A E B E', 'A D G B E A'],
            0,
          ),
          q(
            'm1q2',
            'Bộ phận nào nâng dây lên phía trên đầu cần đàn?',
            ['Ngựa đàn (nut)', 'Ngựa dưới (bridge)', 'Khóa chỉnh dây', 'Pickup (điện từ)'],
            0,
          ),
          q(
            'm1q3',
            'Người thuận tay phổ biến khi ngồi chơi thường đặt guitar lên chân nào?',
            [
              'Chân trái (đầu cần hơi nâng lên)',
              'Để guitar phẳng trên sàn',
              'Chỉ được đứng khi chơi',
              'Chỉ dùng tay phải giữ cần đàn',
            ],
            0,
          ),
          q(
            'm1q4',
            'Cách phổ biến để kiểm tra đàn đã đúng dây?',
            [
              'Dùng máy lên dây gắn đầu cần hoặc app lên dây',
              'Chỉ so một lần với đàn piano',
              'Vặn ngẫu nhiên đến khi dây căng',
              'Dùng capo thay cho việc lên dây',
            ],
            0,
          ),
        ],
      },
    },
    {
      title: 'Hợp âm cơ bản',
      description: 'Các hình hợp âm mở trưởng/thứ thường gặp.',
      order: 2,
      lessons: [
        {
          title: 'Hợp âm C (Đô trưởng)',
          description: 'Đặt ngón và tiếng rõ cho hợp âm C mở.',
          videoUrl: 'https://www.youtube.com/watch?v=LdyBVvyImYE',
          durationMinutes: 11,
          order: 1,
        },
        {
          title: 'Hợp âm G (Son trưởng)',
          description: 'Hình G mở và mẹo chuyển nhanh.',
          videoUrl: 'https://www.youtube.com/watch?v=zZspOQPfF9o',
          durationMinutes: 11,
          order: 2,
        },
        {
          title: 'Hợp âm D (Rê trưởng)',
          description: 'Hợp âm D trên các dây cao.',
          videoUrl: 'https://www.youtube.com/watch?v=THeLV__g2xc',
          durationMinutes: 10,
          order: 3,
        },
        {
          title: 'Hợp âm Am (La thứ)',
          description: 'Âm thứ nhẹ nhàng, hình quen thuộc cho người mới.',
          videoUrl: 'https://www.youtube.com/watch?v=vxQRlk-UvKs',
          durationMinutes: 10,
          order: 4,
        },
      ],
      quiz: {
        title: 'Kiểm tra: Hợp âm cơ bản',
        questions: [
          q(
            'm2q1',
            'Tam âm (ba nốt) của hợp âm C trưởng là:',
            ['C — E — G', 'C — F — A', 'C — D — G', 'D — F — A'],
            0,
          ),
          q(
            'm2q2',
            'Trong nhạc đơn giản, hợp âm trưởng (major) thường mang cảm giác gì?',
            ['Tươi, vui', 'U buồn', 'Căng thẳng', 'Luôn là treo sus'],
            0,
          ),
          q(
            'm2q3',
            'Tiếng “rè/rút” khi bấm hợp âm mở thường do đâu?',
            [
              'Ngón chặn nhầm dây bên cạnh hoặc cong ngón chưa đủ',
              'Luôn do capo',
              'Do quạt quá chậm',
              'Do chỉ được phép đứng khi chơi',
            ],
            0,
          ),
          q(
            'm2q4',
            'Khi chuyển giữa G trưởng và C trưởng, điều gì giúp mượt hơn?',
            [
              'Giữ ngón cong, di chuyển ít nhất có thể giữa các hình',
              'Nhấc mạnh mọi ngón xa khỏi cần mỗi lần',
              'Tránh dùng đầu ngón',
              'Bỏ hẳn ngón cái sau cần đàn',
            ],
            0,
          ),
        ],
      },
    },
    {
      title: 'Quạt tay cơ bản',
      description: 'Quạt xuống, quạt lên và một số pattern nhịp đơn giản.',
      order: 3,
      lessons: [
        {
          title: 'Quạt xuống (downstroke)',
          description: 'Phách xuống rõ ràng với cổ tay thả lỏng.',
          videoUrl: 'https://www.youtube.com/watch?v=BBpIV9A2NfU',
          durationMinutes: 9,
          order: 1,
        },
        {
          title: 'Quạt lên (upstroke)',
          description: 'Quạt lên nhẹ và cân bằng âm lượng.',
          videoUrl: 'https://www.youtube.com/watch?v=ygpimcBh-qA',
          durationMinutes: 9,
          order: 2,
        },
        {
          title: 'Pattern nhịp cơ bản',
          description: 'Kết hợp xuống/lên theo nhịp đều.',
          videoUrl: 'https://www.youtube.com/watch?v=dMpCNPkXViI',
          durationMinutes: 15,
          order: 3,
        },
      ],
      quiz: {
        title: 'Kiểm tra: Quạt tay',
        questions: [
          q(
            'm3q1',
            'Điều gì giúp quạt đều tay?',
            ['Luyện với máy đếm nhịp hoặc vỗ tay theo phách', 'Đổi hợp âm ngẫu nhiên', 'Bỏ qua phách', 'Chỉ quạt xuống mãi'],
            0,
          ),
          q(
            'm3q2',
            'Nhịp 4/4 thường có bao nhiêu phách trong một ô nhịp?',
            ['4', '3', '6', '2'],
            0,
          ),
          q(
            'm3q3',
            'Quạt lên thường hay nghe tốt nhất khi:',
            ['Nhẹ và kiểm soát được', 'Luôn đánh rất mạnh', 'Bỏ hẳn không quạt lên', 'Chỉ dùng trong solo'],
            0,
          ),
          q(
            'm3q4',
            'Thói quen nào giúp giữ nhịp khi học pattern?',
            ['Chậm trước, nhanh dần', 'Luôn chơi tốc độ biểu diễn', 'Không đếm nhịp', 'Đổi guitar giữa bài'],
            0,
          ),
        ],
      },
    },
    {
      title: 'Bài hát đơn giản',
      description: 'Áp dụng hợp âm và quạt tay vào 1–2 bài dễ.',
      order: 4,
      lessons: [
        {
          title: 'Bài dễ: chuyển hợp âm và groove',
          description: 'Chơi một vòng hợp âm ngắn với nhịp ổn định.',
          videoUrl: 'https://www.youtube.com/watch?v=ygpimcBh-qA',
          durationMinutes: 16,
          order: 1,
        },
        {
          title: 'Bài dễ: độ mạnh nhẹ (dynamics)',
          description: 'Đoạn verse nhẹ hơn, điệp khúc rõ hơn.',
          videoUrl: 'https://www.youtube.com/watch?v=vxQRlk-UvKs',
          durationMinutes: 14,
          order: 2,
        },
      ],
      quiz: {
        title: 'Kiểm tra: Bài hát đơn giản',
        questions: [
          q(
            'm4q1',
            'Vì sao người mới thường chơi chậm trước?',
            [
              'Để chính xác trước, rồi mới tăng tốc',
              'Vì bài chậm ít dây hơn',
              'Để không dùng pick',
              'Để bỏ chuyển hợp âm',
            ],
            0,
          ),
          q(
            'm4q2',
            'Dạng bài phổ biến thường gặp là:',
            ['Đoạn A / Điệp khúc', 'Chỉ có intro', 'Các đoạn ngẫu nhiên', 'Chỉ scale đơn âm'],
            0,
          ),
          q(
            'm4q3',
            '“Dynamics” (độ mạnh nhẹ) nghĩa là:',
            [
              'Thay đổi âm lượng và cường độ một cách có chủ đích',
              'Chỉ đánh mạnh',
              'Lên dây giữa mỗi hợp âm',
              'Mua dây mới',
            ],
            0,
          ),
          q(
            'm4q4',
            'Chuyển hợp âm mượt phụ thuộc vào:',
            [
              'Tính toán lộ trình ngón và giữ nhịp thả lỏng',
              'Tránh luyện tập',
              'Bỏ phách',
              'Quạt ngẫu nhiên',
            ],
            0,
          ),
        ],
      },
    },
  ];

  for (const md of modulesData) {
    const mod = await CourseModule.create({
      course: course._id,
      title: md.title,
      description: md.description,
      order: md.order,
    });

    for (const les of md.lessons) {
      await CourseLesson.create({
        module: mod._id,
        title: les.title,
        description: les.description,
        videoUrl: les.videoUrl,
        durationMinutes: les.durationMinutes,
        order: les.order,
      });
    }

    await ModuleQuiz.create({
      module: mod._id,
      title: md.quiz.title,
      questions: md.quiz.questions,
    });
  }

  console.log(`Đã seed khóa "${course.title}" (${course._id})`);
  await mongoose.disconnect();
  console.log('Xong.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
