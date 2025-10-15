# Hệ Thống Khóa Học Guitar - Hướng Dẫn Sử Dụng

## Tổng Quan

Hệ thống khóa học guitar được xây dựng với MERN stack, hỗ trợ học guitar từ cơ bản đến nâng cao với các tính năng:

- **Adaptive Learning**: Hệ thống gợi ý bài học tiếp theo dựa trên kỹ năng đã đạt được
- **Progress Tracking**: Theo dõi tiến độ học tập chi tiết
- **Interactive Metronome**: Metronome sử dụng Web Audio API
- **Practice Logging**: Ghi log luyện tập với BPM và ghi chú
- **Assessment System**: Hệ thống đánh giá quiz và recording

## Cấu Trúc Dữ Liệu

### 1. Course Model
```javascript
{
  title: String,
  slug: String (unique),
  level: 'beginner' | 'intermediate' | 'advanced',
  thumbnail: String,
  summary: String,
  durationWeeks: Number,
  modules: [ModuleSchema]
}
```

### 2. Module Schema
```javascript
{
  order: Number,
  title: String,
  description: String,
  lessons: [LessonSchema]
}
```

### 3. Lesson Schema
```javascript
{
  order: Number,
  title: String,
  type: 'THEORY' | 'CHORD' | 'STRUM' | 'SONG' | 'PRACTICE',
  durationMin: Number,
  objectives: [String],
  skills: [String],
  prerequisites: [String],
  content: {
    text: String,
    tabs: [String],
    chords: [{ name: String, fingering: String, difficulty: String }],
    strumPattern: String,
    videoUrl: String,
    audioUrl: String
  },
  practice: {
    metronomeBpm: Number,
    minutes: Number,
    checklist: [String]
  },
  assessment: {
    type: 'none' | 'quiz' | 'recording',
    config: Mixed
  }
}
```

### 4. UserProgress Model
```javascript
{
  userId: ObjectId,
  courseId: ObjectId,
  lessonKey: String, // format: "slug#module.lesson"
  status: 'not_started' | 'in_progress' | 'completed',
  score: Number,
  acquiredSkills: [String],
  practiceLogs: [{ date: Date, minutes: Number, bpm: Number, notes: String }],
  lastPlayedAt: Date
}
```

## API Endpoints

### Courses
- `GET /api/courses` - Danh sách khóa học
- `GET /api/courses/:slug` - Chi tiết khóa học
- `GET /api/courses/:slug/lessons/:ml` - Chi tiết bài học (ml = "1.3")

### Progress
- `POST /api/progress/start` - Bắt đầu học bài
- `POST /api/progress/log-practice` - Ghi log luyện tập
- `POST /api/progress/complete` - Hoàn thành bài học
- `GET /api/progress/lesson/:lessonKey` - Tiến độ bài học
- `GET /api/progress/course/:courseId` - Tiến độ khóa học
- `GET /api/progress/next-lesson?course=:slug` - Bài học tiếp theo

### Assessment
- `POST /api/assess/submit` - Nộp quiz/recording
- `GET /api/assess/results/:lessonKey` - Kết quả đánh giá

## Cài Đặt và Chạy

### 1. Backend Setup
```bash
cd my-guitar-server
npm install
npm run seed:courses  # Seed dữ liệu mẫu
npm run dev
```

### 2. Frontend Setup
```bash
cd my-guitar-client
npm install
npm start
```

## Dữ Liệu Mẫu

Hệ thống được seed với 3 khóa học:

### 1. Guitar Cơ Bản (8 tuần)
- **Module 1**: Làm quen với Guitar
  - Tư thế cầm đàn và cơ bản
  - Tuning đàn guitar
- **Module 2**: Hợp âm cơ bản
  - Hợp âm C (C Major)
  - Hợp âm G (G Major)
- **Module 3**: Tiết tấu cơ bản
  - Tiết tấu D D U U D U
- **Module 4**: Bài hát đầu tiên
  - Happy Birthday - Đơn giản

### 2. Guitar Trung Cấp (10 tuần)
- **Module 1**: Scale đầu tiên
  - Scale C Major
- **Module 2**: Power Chords
  - Power Chord cơ bản

### 3. Guitar Nâng Cao (12 tuần)
- **Module 1**: Barre Chords
  - F Major Barre Chord

## Tính Năng Adaptive Learning

Hệ thống sử dụng logic thông minh để gợi ý bài học tiếp theo:

1. **Kiểm tra Prerequisites**: Đảm bảo học viên đã có đủ kỹ năng cần thiết
2. **Điểm số**: Chỉ unlock bài tiếp theo khi đạt >= 70 điểm
3. **Gợi ý luyện tập**: Nếu chưa đủ kỹ năng, gợi ý bài luyện tập cùng level

## Frontend Components

### 1. CourseList.jsx
- Hiển thị danh sách khóa học
- Lọc theo level (beginner, intermediate, advanced)
- Tìm kiếm theo tên

### 2. CourseDetail.jsx
- Chi tiết khóa học với modules và lessons
- Hiển thị tiến độ học tập
- Navigation đến bài học

### 3. LessonPlayer.jsx
- Giao diện học bài hoàn chỉnh
- Hiển thị mục tiêu, nội dung, video
- Practice checklist
- Metronome tích hợp
- Nút hoàn thành bài học

## Metronome Component

Sử dụng Web Audio API để tạo âm thanh metronome:

```javascript
// Features
- BPM control (60-200)
- Volume control
- Visual indicator
- Start/Stop functionality
- Responsive design
```

## Testing

### 1. Test API Endpoints
```bash
# Test courses
curl http://localhost:4000/api/courses

# Test specific course
curl http://localhost:4000/api/courses/guitar-co-ban

# Test lesson
curl http://localhost:4000/api/courses/guitar-co-ban/lessons/1.1
```

### 2. Test Frontend
1. Truy cập `http://localhost:3000`
2. Navigate đến danh sách khóa học
3. Click vào khóa học để xem chi tiết
4. Click vào bài học để bắt đầu học

## Troubleshooting

### 1. Backend Issues
- Kiểm tra MongoDB connection
- Kiểm tra environment variables
- Chạy `npm run seed:courses` để seed dữ liệu

### 2. Frontend Issues
- Kiểm tra API connection
- Kiểm tra browser console cho errors
- Đảm bảo backend đang chạy

### 3. Metronome Issues
- Kiểm tra browser support cho Web Audio API
- Đảm bảo user đã interact với page trước khi play audio

## Mở Rộng

### 1. Thêm Khóa Học Mới
1. Tạo course data trong `seedCourses.js`
2. Chạy `npm run seed:courses`
3. Hoặc sử dụng API để tạo course mới

### 2. Thêm Tính Năng Mới
1. Cập nhật models nếu cần
2. Thêm API endpoints
3. Cập nhật frontend components

### 3. Customize UI
- Cập nhật CSS modules
- Thêm animations
- Responsive design improvements

## Kết Luận

Hệ thống khóa học guitar đã được xây dựng hoàn chỉnh với đầy đủ tính năng theo yêu cầu. Có thể mở rộng thêm nhiều tính năng khác như:

- Social features (sharing progress)
- Gamification (badges, achievements)
- Advanced analytics
- Mobile app
- Offline support
