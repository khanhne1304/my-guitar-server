# Hướng Dẫn Seed Dữ Liệu Khóa Học

## Tổng Quan
Script này sẽ tạo dữ liệu khóa học thực tế cho ứng dụng guitar learning. Bao gồm 10 khóa học với các level khác nhau và bài học chi tiết.

## Cách Chạy

### 1. Chạy tất cả dữ liệu (Khuyến nghị)
```bash
npm run seed:all
```

### 2. Chạy từng phần riêng lẻ
```bash
# Tạo admin user (nếu chưa có)
npm run seed:admin

# Tạo khóa học
npm run seed:courses

# Tạo bài học (mock data)
npm run seed:lessons
```

## Dữ Liệu Được Tạo

### Khóa Học Cơ Bản (Beginner)
1. **Guitar Cơ Bản - Từ Zero Đến Hero**
   - 5 bài học từ cơ bản đến nâng cao
   - Học hợp âm cơ bản, chuyển hợp âm
   - Bài hát thực tế: Happy Birthday

2. **Guitar Đệm Hát - Từ Cơ Bản Đến Chuyên Nghiệp**
   - 4 bài học về đệm hát
   - Strumming patterns cho pop, rock, ballad
   - Bài hát: Let It Be

### Khóa Học Trung Bình (Intermediate)
3. **Fingerstyle Guitar - Nghệ Thuật Đánh Đàn**
   - 5 bài học fingerpicking
   - Travis picking, hợp âm mở rộng
   - Bài hát: Blackbird

4. **Acoustic Guitar - Phong Cách Dân Gian**
   - 4 bài học acoustic
   - Strumming patterns, fingerpicking folk
   - Bài hát: House of the Rising Sun

5. **Classical Guitar - Nền Tảng Cổ Điển**
   - 4 bài học classical
   - Đọc sheet music, kỹ thuật classical
   - Tác phẩm: Romance

6. **Guitar Rock - Sức Mạnh Và Tốc Độ**
   - 4 bài học rock
   - Power chords, palm muting, alternate picking
   - Riff: Smoke on the Water

### Khóa Học Nâng Cao (Advanced)
7. **Guitar Lead - Kỹ Thuật Solo Nâng Cao**
   - 5 bài học solo
   - Bending, vibrato, sweep picking
   - Solo: Eruption

8. **Guitar Blues - Cảm Xúc Và Kỹ Thuật**
   - 4 bài học blues
   - Blues scale, bending, rhythm patterns
   - Solo: Stormy Monday

9. **Guitar Jazz - Hòa Âm Phức Tạp**
   - 4 bài học jazz
   - Jazz chords, scales, comping
   - Solo: Autumn Leaves

10. **Guitar Flamenco - Đam Mê Tây Ban Nha**
    - 4 bài học flamenco
    - Rasgueado, picado, alzapua
    - Tác phẩm: Malagueña

## Cấu Trúc Dữ Liệu

### Course Schema
```javascript
{
  title: String (required, max 200 chars),
  description: String (max 2000 chars),
  thumbnail: String (valid image URL),
  level: String (beginner|intermediate|advanced),
  lessons: Array of lesson objects,
  isActive: Boolean (default: true),
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Lesson Structure (Mock Data)
```javascript
{
  title: String,
  description: String,
  duration: String,
  order: Number
}
```

## Lưu Ý

1. **Admin User**: Script sẽ tự động tạo admin user nếu chưa có
2. **Duplicate Prevention**: Script sẽ kiểm tra và bỏ qua khóa học đã tồn tại
3. **Image URLs**: Sử dụng Unsplash images với kích thước 400x300
4. **Mock Lessons**: Hiện tại lessons được lưu dưới dạng mock data trong course document

## Troubleshooting

### Lỗi kết nối MongoDB
```bash
# Kiểm tra MongoDB đang chạy
mongosh
# Hoặc khởi động MongoDB
mongod
```

### Lỗi permission
```bash
# Đảm bảo có quyền ghi trong thư mục
chmod +x src/scripts/seedAll.js
```

### Lỗi import
```bash
# Cài đặt dependencies
npm install
```

## Kết Quả Mong Đợi

Sau khi chạy thành công, bạn sẽ có:
- 10 khóa học với đầy đủ thông tin
- 42 bài học tổng cộng
- 3 level khác nhau (beginner, intermediate, advanced)
- Admin user để quản lý
- Dữ liệu sẵn sàng cho frontend

## Xóa Dữ Liệu (Nếu Cần)

```bash
# Kết nối MongoDB và xóa
mongosh
use mern_guitar
db.courses.deleteMany({})
db.users.deleteMany({role: "admin"})
```
