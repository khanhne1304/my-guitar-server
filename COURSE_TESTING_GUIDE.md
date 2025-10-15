# Hướng Dẫn Test Chức Năng Khóa Học

## Tổng Quan
Hệ thống đã được setup với dữ liệu test hoàn chỉnh cho chức năng khóa học, bao gồm:
- 3 khóa học với cấu trúc modules và lessons đầy đủ
- Dữ liệu test cho các level: beginner, intermediate, advanced
- Interactive features và progress tracking
- Sample users và progress data

## Cách Chạy Test

### 1. Chạy Tất Cả (Khuyến Nghị)
```bash
npm run setup
```
Hoặc:
```bash
npm run test:all
```

### 2. Chạy Từng Phần Riêng Lẻ

#### Tạo Admin User
```bash
npm run seed:admin
```

#### Seed Dữ Liệu Khóa Học Hoàn Chỉnh
```bash
npm run seed:complete
```

#### Test API Endpoints
```bash
npm run test:api
```

#### Seed Dữ Liệu Cơ Bản (Legacy)
```bash
npm run seed:courses
```

## Dữ Liệu Test Được Tạo

### 1. Khóa Học Cơ Bản (Beginner)
**Guitar Cơ Bản - Từ Zero Đến Hero**
- 3 modules, 6 lessons
- Làm quen với guitar, hợp âm cơ bản, bài hát đầu tiên
- Interactive features: metronome, progress tracking, exercises

### 2. Khóa Học Trung Cấp (Intermediate)  
**Fingerstyle Guitar - Nghệ Thuật Đánh Đàn**
- 3 modules, 4 lessons
- Kỹ thuật fingerpicking, hợp âm mở rộng, bài hát fingerstyle
- Interactive features: metronome, pitch detection, real-time feedback

### 3. Khóa Học Nâng Cao (Advanced)
**Guitar Lead - Kỹ Thuật Solo Nâng Cao**
- 3 modules, 4 lessons  
- Kỹ thuật solo, scale và modes, solo guitar kinh điển
- Interactive features: đầy đủ tính năng tương tác

## Cấu Trúc Dữ Liệu

### Course Schema
```javascript
{
  title: String,
  slug: String,
  summary: String,
  description: String,
  durationWeeks: Number,
  thumbnail: String,
  level: 'beginner' | 'intermediate' | 'advanced',
  modules: [ModuleSchema],
  isInteractive: Boolean,
  interactiveFeatures: {
    hasMetronome: Boolean,
    hasPitchDetection: Boolean,
    hasRealTimeFeedback: Boolean,
    hasProgressTracking: Boolean,
    hasExercises: Boolean,
    hasGamification: Boolean
  },
  courseSettings: {
    allowReplay: Boolean,
    showProgress: Boolean,
    enableComments: Boolean,
    enableRating: Boolean
  },
  stats: {
    totalViews: Number,
    totalCompletions: Number,
    averageRating: Number,
    totalRatings: Number
  }
}
```

### Module Schema
```javascript
{
  title: String,
  description: String,
  order: Number,
  lessons: [LessonSchema]
}
```

### Lesson Schema
```javascript
{
  title: String,
  type: 'THEORY' | 'CHORD' | 'STRUM' | 'SONG' | 'PRACTICE',
  durationMin: Number,
  objectives: [String],
  skills: [String],
  prerequisites: [String],
  content: {
    text: String,
    tabs: [String],
    chords: [ChordSchema],
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
    config: Object
  },
  order: Number
}
```

## Test Accounts

### Admin Account
- **Email**: admin@guitar.com
- **Password**: Admin@123
- **Role**: admin

### Student Account  
- **Email**: student@guitar.com
- **Password**: Student@123
- **Role**: student

## API Endpoints Được Test

### Course Endpoints
- `GET /api/courses` - Lấy danh sách khóa học
- `GET /api/courses/:id` - Lấy chi tiết khóa học
- `GET /api/courses/level/:level` - Lấy khóa học theo level
- `GET /api/courses/search?q=keyword` - Tìm kiếm khóa học
- `GET /api/courses/interactive` - Lấy khóa học tương tác

### Progress Endpoints
- `GET /api/progress/:userId` - Lấy tiến độ học của user
- `POST /api/progress` - Tạo/cập nhật tiến độ học
- `GET /api/progress/:userId/:courseId` - Lấy tiến độ khóa học cụ thể

## Tính Năng Interactive

### Metronome
- BPM settings cho từng lesson
- Practice sessions với metronome
- Progress tracking theo BPM

### Pitch Detection
- Real-time pitch analysis
- Feedback cho kỹ thuật
- Accuracy scoring

### Progress Tracking
- Lesson completion status
- Skill acquisition tracking
- Practice time logging
- Score tracking

### Exercises
- Interactive practice sessions
- Checklist-based learning
- Assessment integration

## Troubleshooting

### Lỗi Kết Nối MongoDB
```bash
# Kiểm tra MongoDB đang chạy
mongosh
# Hoặc khởi động MongoDB
mongod
```

### Lỗi Permission
```bash
# Đảm bảo có quyền ghi trong thư mục
chmod +x src/scripts/*.js
```

### Lỗi Import
```bash
# Cài đặt dependencies
npm install
```

### Xóa Dữ Liệu Test
```bash
# Kết nối MongoDB và xóa
mongosh
use mern_guitar
db.courses.deleteMany({})
db.users.deleteMany({})
db.userprogress.deleteMany({})
```

## Kết Quả Mong Đợi

Sau khi chạy thành công, bạn sẽ có:
- ✅ 3 khóa học hoàn chỉnh với modules và lessons
- ✅ 14 lessons tổng cộng
- ✅ 3 level khác nhau (beginner, intermediate, advanced)
- ✅ Interactive features được enable
- ✅ Sample users và progress data
- ✅ API endpoints hoạt động đầy đủ
- ✅ Dữ liệu sẵn sàng cho frontend testing

## Scripts Available

| Script | Mô Tả |
|--------|-------|
| `npm run setup` | Chạy tất cả setup và test |
| `npm run seed:admin` | Tạo admin user |
| `npm run seed:complete` | Seed dữ liệu khóa học hoàn chỉnh |
| `npm run seed:courses` | Seed dữ liệu khóa học cơ bản |
| `npm run test:api` | Test API endpoints |
| `npm run dev` | Khởi động development server |

## Next Steps

1. **Chạy setup**: `npm run setup`
2. **Khởi động server**: `npm run dev`
3. **Test frontend**: Kết nối với frontend để test UI
4. **API testing**: Sử dụng Postman hoặc curl để test endpoints
5. **Database inspection**: Sử dụng MongoDB Compass để xem dữ liệu
