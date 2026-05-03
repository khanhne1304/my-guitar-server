/**
 * Nội dung lộ trình học — chỉ server biết đáp án quiz (correctIndex).
 * Client nhận bản đã strip qua stripLessonForClient().
 */

export const PLACEMENT_QUESTIONS = [
  {
    id: 'p1',
    prompt: 'Bạn đã từng cầm đàn guitar chưa?',
    options: ['Chưa bao giờ', 'Đã thử vài lần', 'Chơi được một thời gian'],
    weights: [0, 1, 2],
  },
  {
    id: 'p2',
    prompt: 'Bạn có đọc được tab / ký hiệu hợp âm cơ bản không?',
    options: ['Chưa', 'Biết sơ', 'Tương đối thành thạo'],
    weights: [0, 1, 2],
  },
  {
    id: 'p3',
    prompt: 'Bạn có luyện theo nhịp / metronome thường xuyên không?',
    options: ['Chưa', 'Thỉnh thoảng', 'Thường xuyên'],
    weights: [0, 1, 2],
  },
];

/** Modules & lessons — goalTags: nếu có, user phải chọn ít nhất một mục tiêu trùng */
export const MODULES = [
  {
    id: 'm-foundations',
    title: 'Nền tảng',
    description: 'Tư thế, dây, nhịp đập cơ bản — phù hợp mọi hướng đi.',
    goalTags: null,
    lessons: [
      {
        id: 'l-intro-video',
        title: 'Làm quen với guitar',
        type: 'video',
        summary: 'Cách cầm đàn, tên dây và ngón cơ bản.',
        contentUrl: 'https://www.youtube.com/embed/BBpIV9A2NfU',
        estimatedMinutes: 12,
        videoRecap: {
          newKnowledge: [
            'Tên 6 dây từ dày đến mảnh: E A D G B E',
            'Tư thế ngồi và đặt tay trái phải cơ bản',
          ],
          oldKnowledge: ['Không cần kiến thức nền trước đó'],
        },
        videoQuiz: {
          questions: [
            {
              id: 'vq1',
              text: 'Dây mảnh nhất (số 1) là nốt gì khi không bấm?',
              options: ['Mi', 'La', 'Son'],
              correctIndex: 0,
            },
          ],
        },
      },
      {
        id: 'l-rhythm-ex',
        title: 'Đếm nhịp 4/4',
        type: 'exercise',
        summary: 'Tập đập chân/trống đệm theo phách.',
        estimatedMinutes: 10,
        body: `**Bài tập**
1. Bật metronome ở 70 BPM.
2. Đập phách từng nhịp trong 2 phút.
3. Ghi nhận cảm giác “đúng phách” trước khi đệm dây.`,
      },
      {
        id: 'l-found-quiz',
        title: 'Kiểm tra nhanh nền tảng',
        type: 'quiz',
        summary: 'Ôn lại khái niệm cơ bản.',
        estimatedMinutes: 8,
        quiz: {
          questions: [
            {
              id: 'fq1',
              text: 'Ký hiệu 4/4 nghĩa là gì?',
              options: ['4 phách mỗi ô nhịp, nốt đen là một phách', 'Chỉ dùng cho nhạc nhanh', 'Không liên quan nhịp'],
              correctIndex: 0,
            },
            {
              id: 'fq2',
              text: 'Hợp âm C (Đô trưởng) gồm các nốt?',
              options: ['C E G', 'C F A', 'D F A'],
              correctIndex: 0,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'm-strumming',
    title: 'Đệm hát — Strumming',
    description: 'Vòng hợp âm, pattern quạt tay phổ biến.',
    goalTags: ['strumming'],
    lessons: [
      {
        id: 'l-strum-video',
        title: 'Pattern strumming cơ bản',
        type: 'video',
        summary: 'Down — Down — Up và áp dụng vào vòng G — D — Em — C.',
        contentUrl: 'https://www.youtube.com/embed/ygpimcBh-qA',
        estimatedMinutes: 18,
        videoRecap: {
          newKnowledge: ['Xuống / lên có chủ đích trong một ô nhịp', 'Giữ nhịp đều tay phải'],
          oldKnowledge: ['Ôn vòng hợp âm cơ bản'],
        },
        videoQuiz: {
          questions: [
            {
              id: 'sq1',
              text: 'Trong pattern D-D-U-D-U, có mấy lần quạt xuống?',
              options: ['2', '3', '4'],
              correctIndex: 1,
            },
          ],
        },
      },
      {
        id: 'l-strum-quiz',
        title: 'Kiểm tra đệm hát',
        type: 'quiz',
        summary: '',
        estimatedMinutes: 6,
        quiz: {
          questions: [
            {
              id: 'sqz1',
              text: 'Muốn nhịp chắc khi đệm hát, nên ưu tiên điều gì?',
              options: ['Chơi nhanh hết mức', 'Đồng bộ phách & giọng hát', 'Chỉ nhìn tay trái'],
              correctIndex: 1,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'm-fingerstyle',
    title: 'Fingerstyle',
    description: 'Fingerpicking pattern và độc lập ngón.',
    goalTags: ['fingerstyle'],
    lessons: [
      {
        id: 'l-fs-video',
        title: 'Fingerstyle pattern P-I-M-A',
        type: 'video',
        summary: 'Ngón cái — trỏ — giữa — áp dụng trên arpeggio.',
        contentUrl: 'https://www.youtube.com/embed/vxQRlk-UvKs',
        estimatedMinutes: 15,
        videoRecap: {
          newKnowledge: ['Quy tắc P-I-M-A trên 4 dây', 'Tách tiếng bass và melody'],
          oldKnowledge: ['Tên dây và tư thế tay phải'],
        },
        videoQuiz: {
          questions: [
            {
              id: 'fqfs1',
              text: 'Trong ký hiệu P-I-M-A, P thường chỉ ngón nào?',
              options: ['Trỏ', 'Cái', 'Giữa'],
              correctIndex: 1,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'm-lead',
    title: 'Solo / Lead',
    description: 'Scale pentatonic & luyện phrasing.',
    goalTags: ['solo'],
    lessons: [
      {
        id: 'l-penta-video',
        title: 'Pentatonic ô thứ nhất',
        type: 'video',
        summary: 'Hình minh họa pattern và luyện legato nhẹ.',
        contentUrl: 'https://www.youtube.com/embed/dMpCNPkXViI',
        estimatedMinutes: 20,
        videoRecap: {
          newKnowledge: ['5 note trong một ô pentatonic', 'Slide nhẹ giữa phách'],
          oldKnowledge: ['Ôn nhịp với metronome'],
        },
        videoQuiz: {
          questions: [
            {
              id: 'lq1',
              text: 'Pentatonic minor có mấy nốt trong một pattern ô?',
              options: ['5', '7', '3'],
              correctIndex: 0,
            },
          ],
        },
      },
    ],
  },
];

export function stripLessonForClient(lesson) {
  const out = { ...lesson };
  if (out.quiz?.questions) {
    out.quiz = {
      questions: out.quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
      })),
    };
  }
  if (out.videoQuiz?.questions) {
    out.videoQuiz = {
      questions: out.videoQuiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
      })),
    };
  }
  return out;
}
