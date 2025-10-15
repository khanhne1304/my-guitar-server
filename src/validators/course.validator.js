import { body, param, query } from 'express-validator';

// Validation for creating a new course
export const createCourseValidator = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề khóa học là bắt buộc')
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề phải từ 1-200 ký tự')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không được vượt quá 2000 ký tự')
    .trim(),

  body('thumbnail')
    .optional()
    .isURL()
    .withMessage('URL ảnh không hợp lệ')
    .custom((value) => {
      if (value && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(value)) {
        throw new Error('URL ảnh phải là định dạng ảnh hợp lệ (jpg, jpeg, png, gif, webp)');
      }
      return true;
    }),

  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level phải là beginner, intermediate hoặc advanced'),

  body('modules')
    .optional()
    .isArray()
    .withMessage('Modules phải là một mảng')
    .custom((value) => {
      if (value && value.length > 0) {
        const isValid = value.every(module => {
          return module.title && 
                 typeof module.title === 'string' &&
                 module.title.length >= 1 && 
                 module.title.length <= 200;
        });
        if (!isValid) {
          throw new Error('Mỗi module phải có title hợp lệ (1-200 ký tự)');
        }
      }
      return true;
    })
];

// Validation for updating a course
export const updateCourseValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề phải từ 1-200 ký tự')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không được vượt quá 2000 ký tự')
    .trim(),

  body('thumbnail')
    .optional()
    .isURL()
    .withMessage('URL ảnh không hợp lệ')
    .custom((value) => {
      if (value && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(value)) {
        throw new Error('URL ảnh phải là định dạng ảnh hợp lệ (jpg, jpeg, png, gif, webp)');
      }
      return true;
    }),

  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level phải là beginner, intermediate hoặc advanced'),

  body('modules')
    .optional()
    .isArray()
    .withMessage('Modules phải là một mảng')
    .custom((value) => {
      if (value && value.length > 0) {
        const isValid = value.every(module => {
          return module.title && 
                 typeof module.title === 'string' &&
                 module.title.length >= 1 && 
                 module.title.length <= 200;
        });
        if (!isValid) {
          throw new Error('Mỗi module phải có title hợp lệ (1-200 ký tự)');
        }
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive phải là boolean')
];

// Validation for getting a course by ID
export const getCourseValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ')
];

// Validation for deleting a course
export const deleteCourseValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ')
];

// Validation for query parameters when getting courses list
export const getCoursesValidator = [
  query('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level phải là beginner, intermediate hoặc advanced'),

  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Từ khóa tìm kiếm phải từ 1-100 ký tự')
    .trim(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit phải từ 1-100')
    .toInt(),

  query('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'updatedAt', 'level'])
    .withMessage('sortBy phải là title, createdAt, updatedAt hoặc level'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder phải là asc hoặc desc')
];

// Validation for adding lesson to course
export const addLessonValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  body('lessonId')
    .isMongoId()
    .withMessage('ID bài học không hợp lệ')
];

// Validation for adding module to course
export const addModuleValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  body('title')
    .notEmpty()
    .withMessage('Tiêu đề module là bắt buộc')
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề module phải từ 1-200 ký tự')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả module không được vượt quá 1000 ký tự')
    .trim()
];

// Validation for updating module in course
export const updateModuleValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  param('moduleId')
    .isMongoId()
    .withMessage('ID module không hợp lệ'),

  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề module phải từ 1-200 ký tự')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả module không được vượt quá 1000 ký tự')
    .trim()
];

// Validation for removing module from course
export const removeModuleValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  param('moduleId')
    .isMongoId()
    .withMessage('ID module không hợp lệ')
];

// Validation for adding lesson to module
export const addLessonToModuleValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  param('moduleId')
    .isMongoId()
    .withMessage('ID module không hợp lệ'),

  body('title')
    .notEmpty()
    .withMessage('Tiêu đề bài học là bắt buộc')
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề bài học phải từ 1-200 ký tự')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả bài học không được vượt quá 1000 ký tự')
    .trim(),

  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('URL video không hợp lệ')
    .custom((value) => {
      if (value && !/^https?:\/\/.+\.(mp4|webm|ogg|avi|mov)$/i.test(value)) {
        throw new Error('URL video phải là định dạng video hợp lệ (mp4, webm, ogg, avi, mov)');
      }
      return true;
    }),

  body('contentType')
    .optional()
    .isIn(['note', 'chord', 'rhythm'])
    .withMessage('Loại nội dung phải là note, chord hoặc rhythm'),

  body('tabData')
    .optional()
    .custom((value) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('Tab data phải là object hoặc null');
      }
      return true;
    })
];

// Validation for updating lesson in module
export const updateLessonInModuleValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  param('moduleId')
    .isMongoId()
    .withMessage('ID module không hợp lệ'),

  param('lessonId')
    .isMongoId()
    .withMessage('ID bài học không hợp lệ'),

  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề bài học phải từ 1-200 ký tự')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả bài học không được vượt quá 1000 ký tự')
    .trim(),

  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('URL video không hợp lệ')
    .custom((value) => {
      if (value && !/^https?:\/\/.+\.(mp4|webm|ogg|avi|mov)$/i.test(value)) {
        throw new Error('URL video phải là định dạng video hợp lệ (mp4, webm, ogg, avi, mov)');
      }
      return true;
    }),

  body('contentType')
    .optional()
    .isIn(['note', 'chord', 'rhythm'])
    .withMessage('Loại nội dung phải là note, chord hoặc rhythm'),

  body('tabData')
    .optional()
    .custom((value) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('Tab data phải là object hoặc null');
      }
      return true;
    })
];

// Validation for removing lesson from module
export const removeLessonFromModuleValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),

  param('moduleId')
    .isMongoId()
    .withMessage('ID module không hợp lệ'),

  param('lessonId')
    .isMongoId()
    .withMessage('ID bài học không hợp lệ')
];
