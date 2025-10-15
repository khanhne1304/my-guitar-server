# Course API Documentation

## Tổng quan
Module Course cung cấp các API endpoints để quản lý khóa học trong hệ thống. Hỗ trợ CRUD operations, tìm kiếm, lọc và phân trang.

## Base URL
```
http://localhost:4000/api/courses
```

## Authentication
- Một số endpoints yêu cầu authentication (Bearer token)
- Các endpoints public: GET operations
- Các endpoints protected: POST, PUT, DELETE operations

## Response Format
Tất cả responses đều theo format:
```json
{
  "success": true|false,
  "message": "Thông báo",
  "data": {} // Chỉ có khi success = true
}
```

## Endpoints

### 1. GET /api/courses
Lấy danh sách tất cả khóa học với filtering và pagination.

**Query Parameters:**
- `level` (optional): `beginner` | `intermediate` | `advanced`
- `search` (optional): Từ khóa tìm kiếm
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số items per page (default: 10, max: 100)
- `sortBy` (optional): `title` | `createdAt` | `updatedAt` | `level`
- `sortOrder` (optional): `asc` | `desc` (default: desc)

**Example:**
```bash
GET /api/courses?level=beginner&search=guitar&page=1&limit=5
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách khóa học thành công",
  "data": {
    "courses": [
      {
        "_id": "64a1b2c3d4e5f6789012345",
        "title": "Học Guitar Cơ Bản",
        "description": "Khóa học guitar cơ bản...",
        "thumbnail": "https://example.com/image.jpg",
        "level": "beginner",
        "lessons": [],
        "lessonCount": 0,
        "createdBy": {
          "_id": "64a1b2c3d4e5f6789012346",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2023-07-01T10:00:00.000Z",
        "updatedAt": "2023-07-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 2. GET /api/courses/:id
Lấy chi tiết một khóa học theo ID.

**Path Parameters:**
- `id`: MongoDB ObjectId của khóa học

**Example:**
```bash
GET /api/courses/64a1b2c3d4e5f6789012345
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy thông tin khóa học thành công",
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "Học Guitar Cơ Bản",
    "description": "Khóa học guitar cơ bản...",
    "thumbnail": "https://example.com/image.jpg",
    "level": "beginner",
    "lessons": [
      {
        "_id": "64a1b2c3d4e5f6789012347",
        "title": "Bài 1: Giới thiệu",
        "description": "Giới thiệu về guitar...",
        "duration": 30,
        "videoUrl": "https://example.com/video1.mp4",
        "order": 1
      }
    ],
    "lessonCount": 1,
    "createdBy": {
      "_id": "64a1b2c3d4e5f6789012346",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2023-07-01T10:00:00.000Z",
    "updatedAt": "2023-07-01T10:00:00.000Z"
  }
}
```

### 3. POST /api/courses
Tạo khóa học mới. **Yêu cầu authentication.**

**Request Body:**
```json
{
  "title": "Học Guitar Cơ Bản",
  "description": "Khóa học guitar cơ bản dành cho người mới bắt đầu",
  "thumbnail": "https://example.com/guitar-basic.jpg",
  "level": "beginner",
  "lessons": ["64a1b2c3d4e5f6789012347", "64a1b2c3d4e5f6789012348"]
}
```

**Validation Rules:**
- `title`: Required, 1-200 characters
- `description`: Optional, max 2000 characters
- `thumbnail`: Optional, valid URL with image extension
- `level`: Optional, enum: `beginner` | `intermediate` | `advanced`
- `lessons`: Optional, array of valid ObjectIds

**Response:**
```json
{
  "success": true,
  "message": "Tạo khóa học thành công",
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "Học Guitar Cơ Bản",
    "description": "Khóa học guitar cơ bản...",
    "thumbnail": "https://example.com/guitar-basic.jpg",
    "level": "beginner",
    "lessons": [],
    "lessonCount": 0,
    "createdBy": "64a1b2c3d4e5f6789012346",
    "createdAt": "2023-07-01T10:00:00.000Z",
    "updatedAt": "2023-07-01T10:00:00.000Z"
  }
}
```

### 4. PUT /api/courses/:id
Cập nhật khóa học. **Yêu cầu authentication và quyền sở hữu.**

**Path Parameters:**
- `id`: MongoDB ObjectId của khóa học

**Request Body:** (Tất cả fields đều optional)
```json
{
  "title": "Học Guitar Cơ Bản - Phiên bản mới",
  "description": "Khóa học guitar cơ bản được cập nhật",
  "thumbnail": "https://example.com/new-image.jpg",
  "level": "intermediate",
  "lessons": ["64a1b2c3d4e5f6789012347"],
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật khóa học thành công",
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "Học Guitar Cơ Bản - Phiên bản mới",
    "description": "Khóa học guitar cơ bản được cập nhật",
    "thumbnail": "https://example.com/new-image.jpg",
    "level": "intermediate",
    "lessons": [],
    "lessonCount": 0,
    "createdBy": "64a1b2c3d4e5f6789012346",
    "createdAt": "2023-07-01T10:00:00.000Z",
    "updatedAt": "2023-07-01T11:00:00.000Z"
  }
}
```

### 5. DELETE /api/courses/:id
Xóa khóa học (soft delete). **Yêu cầu authentication và quyền sở hữu.**

**Path Parameters:**
- `id`: MongoDB ObjectId của khóa học

**Response:**
```json
{
  "success": true,
  "message": "Xóa khóa học thành công"
}
```

### 6. GET /api/courses/level/:level
Lấy danh sách khóa học theo level.

**Path Parameters:**
- `level`: `beginner` | `intermediate` | `advanced`

**Example:**
```bash
GET /api/courses/level/beginner
```

### 7. GET /api/courses/search/:searchTerm
Tìm kiếm khóa học theo tiêu đề.

**Path Parameters:**
- `searchTerm`: Từ khóa tìm kiếm

**Example:**
```bash
GET /api/courses/search/guitar
```

### 8. GET /api/courses/my-courses
Lấy danh sách khóa học của user hiện tại. **Yêu cầu authentication.**

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách khóa học của bạn thành công",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345",
      "title": "Học Guitar Cơ Bản",
      "description": "Khóa học guitar cơ bản...",
      "level": "beginner",
      "lessonCount": 5,
      "createdAt": "2023-07-01T10:00:00.000Z"
    }
  ]
}
```

### 9. POST /api/courses/:id/lessons
Thêm bài học vào khóa học. **Yêu cầu authentication và quyền sở hữu.**

**Path Parameters:**
- `id`: MongoDB ObjectId của khóa học

**Request Body:**
```json
{
  "lessonId": "64a1b2c3d4e5f6789012347"
}
```

### 10. DELETE /api/courses/:id/lessons/:lessonId
Xóa bài học khỏi khóa học. **Yêu cầu authentication và quyền sở hữu.**

**Path Parameters:**
- `id`: MongoDB ObjectId của khóa học
- `lessonId`: MongoDB ObjectId của bài học

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    {
      "msg": "Tiêu đề khóa học là bắt buộc",
      "param": "title",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Bạn cần đăng nhập để thực hiện hành động này"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Bạn không có quyền cập nhật khóa học này"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Không tìm thấy khóa học"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Đã tồn tại khóa học với tiêu đề này"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi tạo khóa học: [error details]"
}
```

## Testing

### Sử dụng cURL

1. **Get all courses:**
```bash
curl -X GET "http://localhost:4000/api/courses"
```

2. **Create course (with auth):**
```bash
curl -X POST "http://localhost:4000/api/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Học Guitar Cơ Bản",
    "description": "Khóa học guitar cơ bản",
    "level": "beginner"
  }'
```

3. **Update course:**
```bash
curl -X PUT "http://localhost:4000/api/courses/COURSE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Học Guitar Cơ Bản - Updated"
  }'
```

### Sử dụng Postman
1. Import collection từ file `Course_API.postman_collection.json` (nếu có)
2. Set up environment variables: `BASE_URL`, `AUTH_TOKEN`
3. Run tests

## Notes
- Tất cả timestamps đều theo UTC
- Soft delete được sử dụng (isActive = false)
- Pagination mặc định: page=1, limit=10
- Search không phân biệt hoa thường
- File upload cho thumbnail cần implement riêng
