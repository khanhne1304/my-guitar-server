// Simple test server for courses API
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Server is running' });
});

// Mock courses endpoint
app.get('/api/courses', (req, res) => {
  const mockCourses = {
    success: true,
    message: 'Lấy danh sách khóa học thành công',
    data: {
      courses: [
        {
          _id: '1',
          title: 'Guitar Cơ Bản',
          slug: 'guitar-co-ban',
          description: 'Khóa học guitar cơ bản cho người mới bắt đầu',
          level: 'beginner',
          thumbnail: '/images/guitar-basic.jpg',
          lessonCount: 10,
          duration: '4 tuần',
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          title: 'Guitar Trung Cấp',
          slug: 'guitar-trung-cap',
          description: 'Khóa học guitar trung cấp',
          level: 'intermediate',
          thumbnail: '/images/guitar-intermediate.jpg',
          lessonCount: 15,
          duration: '6 tuần',
          createdAt: new Date().toISOString()
        }
      ],
      total: 2,
      page: 1,
      limit: 10
    }
  };
  
  res.json(mockCourses);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Courses API: http://localhost:${PORT}/api/courses`);
});

