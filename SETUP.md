# 🎸 Guitar Learning Platform - Setup Guide

Hướng dẫn cài đặt và chạy hệ thống backend cho nền tảng học guitar.

## 📋 Yêu Cầu Hệ Thống

- **Node.js**: >= 16.0.0
- **MongoDB**: >= 4.4.0
- **npm**: >= 8.0.0

## 🚀 Cài Đặt Nhanh

### 1. Clone Repository
```bash
git clone <repository-url>
cd my-guitar-server
```

### 2. Cài Đặt Dependencies
```bash
npm install
```

### 3. Cấu Hình Environment
Tạo file `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/guitar-learning
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
```

### 4. Khởi Động MongoDB
```bash
# Sử dụng MongoDB local
mongod

# Hoặc sử dụng MongoDB Atlas (cloud)
# Cập nhật MONGODB_URI trong .env
```

### 5. Seed Dữ Liệu Mẫu
```bash
npm run seed
```

### 6. Chạy Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🧪 Test API

### 1. Chạy Test Script
```bash
node src/scripts/testAPI.js
```

### 2. Test Manual với cURL

#### Lấy danh sách khóa học
```bash
curl http://localhost:5000/api/courses
```

#### Lấy chi tiết khóa học
```bash
curl http://localhost:5000/api/courses/guitar-co-ban
```

#### Lấy bài học cụ thể
```bash
curl http://localhost:5000/api/courses/guitar-co-ban/lessons/1.1
```

#### Tìm kiếm khóa học
```bash
curl http://localhost:5000/api/courses/search/guitar
```

#### Lấy khóa học theo level
```bash
curl http://localhost:5000/api/courses/level/beginner
```

## 📊 Dữ Liệu Mẫu

Sau khi chạy `npm run seed`, bạn sẽ có:

### 👤 Sample User
- **Email**: student@example.com
- **Password**: password123
- **Role**: student

### 📚 Sample Courses
1. **Guitar Cơ Bản** (beginner)
   - 3 modules, 5 lessons
   - Từ cơ bản đến bài hát đầu tiên

2. **Guitar Trung Cấp** (intermediate)
   - Barre chords, kỹ thuật nâng cao

3. **Guitar Nâng Cao** (advanced)
   - Solo techniques, improvisation

### 📈 Sample Progress
- User progress cho khóa học đầu tiên
- Practice logs và acquired skills
- Completed lessons với scores

## 🔐 Authentication

### Tạo JWT Token (cho testing)
```bash
# Sử dụng auth endpoint (nếu có)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "password123"}'
```

### Sử dụng Token
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/courses
```

## 🛠️ Development

### Cấu Trúc Project
```
src/
├── controllers/     # API controllers
├── models/         # MongoDB models
├── routes/         # API routes
├── services/       # Business logic
├── middlewares/    # Express middlewares
├── validators/     # Input validation
├── utils/          # Utility functions
├── scripts/        # Seed và test scripts
└── server.js       # Main server file
```

### Thêm API Endpoint Mới

1. **Tạo Model** (nếu cần)
```javascript
// src/models/NewModel.js
import mongoose from 'mongoose';

const newModelSchema = new mongoose.Schema({
  // schema definition
});

export default mongoose.model('NewModel', newModelSchema);
```

2. **Tạo Service**
```javascript
// src/services/newModel.service.js
export const createNewModel = async (data) => {
  // business logic
};
```

3. **Tạo Controller**
```javascript
// src/controllers/newModel.controller.js
export const createNewModel = async (req, res) => {
  // controller logic
};
```

4. **Tạo Routes**
```javascript
// src/routes/newModel.routes.js
import express from 'express';
const router = express.Router();

router.post('/', createNewModel);
export default router;
```

5. **Đăng Ký Routes**
```javascript
// src/server.js
import newModelRoutes from './routes/newModel.routes.js';
app.use('/api/new-models', newModelRoutes);
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Kiểm tra MongoDB status
brew services list | grep mongodb

# Restart MongoDB
brew services restart mongodb-community
```

### Port Already in Use
```bash
# Tìm process sử dụng port 5000
lsof -ti:5000

# Kill process
kill -9 $(lsof -ti:5000)
```

### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules và reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📈 Performance Tips

### Database Indexing
- Text search indexes đã được tạo
- Compound indexes cho queries phức tạp
- Monitor query performance

### Caching
- Implement Redis cho caching (optional)
- Cache course data và user progress

### Rate Limiting
- Đã implement rate limiting
- Có thể điều chỉnh limits trong middleware

## 🔒 Security

### Environment Variables
- Không commit .env file
- Sử dụng strong JWT secrets
- Rotate secrets định kỳ

### Input Validation
- Tất cả inputs đều được validate
- Sanitize user inputs
- Prevent injection attacks

### CORS
- Cấu hình CORS cho production
- Chỉ allow trusted origins

## 📝 Logging

### Development
```bash
# Xem logs real-time
npm run dev
```

### Production
```bash
# Sử dụng PM2 hoặc similar
pm2 start src/server.js --name guitar-api
pm2 logs guitar-api
```

## 🚀 Deployment

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/guitar-learning
JWT_SECRET=production_secret_key
JWT_EXPIRE=7d
```

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs
2. Verify environment variables
3. Test database connection
4. Check API endpoints với Postman/curl

## 🎯 Next Steps

1. **Frontend Integration**: Kết nối với React frontend
2. **Real-time Features**: WebSocket cho real-time feedback
3. **File Upload**: Upload video/audio cho lessons
4. **Analytics**: User behavior tracking
5. **Mobile API**: Optimize cho mobile apps
