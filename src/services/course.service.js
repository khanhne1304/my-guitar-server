import Course from '../models/Course.js';
import mongoose from 'mongoose';

// Get all courses with filtering, searching, and pagination
export async function getAllCoursesService(queryParams = {}) {
  const {
    level,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = queryParams;

  // Build filter object
  const filter = { isActive: true };

  // Add level filter
  if (level) {
    filter.level = level;
  }

  // Add search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Calculate pagination
  const skip = (page - 1) * limit;

  try {
    // Get total count for pagination
    const total = await Course.countDocuments(filter);

    // Get courses with pagination
    const courses = await Course.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      courses,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    };
  } catch (error) {
    throw new Error(`Lỗi khi lấy danh sách khóa học: ${error.message}`);
  }
}

// Get course by ID or slug
export async function getCourseByIdService(identifier, isSlug = false) {
  try {
    let query;
    
    if (isSlug) {
      // Search by slug
      query = { slug: identifier, isActive: true };
    } else {
      // Search by ID
      if (!mongoose.Types.ObjectId.isValid(identifier)) {
        throw new Error('ID khóa học không hợp lệ');
      }
      query = { _id: identifier, isActive: true };
    }

    const course = await Course.findOne(query)
      .populate('createdBy', 'name email')
      .lean();

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    return course;
  } catch (error) {
    throw new Error(`Lỗi khi lấy khóa học: ${error.message}`);
  }
}

// Create new course
export async function createCourseService(courseData, userId) {
  try {
    // Check if course with same title already exists
    const existingCourse = await Course.findOne({
      title: courseData.title,
      isActive: true
    });

    if (existingCourse) {
      throw new Error('Đã tồn tại khóa học với tiêu đề này');
    }

    // Validate modules and lessons structure
    if (courseData.modules) {
      courseData.modules.forEach((module, moduleIndex) => {
        if (module.lessons) {
          module.lessons.forEach((lesson, lessonIndex) => {
            // Set order if not provided
            if (!lesson.order) {
              lesson.order = lessonIndex + 1;
            }
          });
        }
        // Set module order if not provided
        if (!module.order) {
          module.order = moduleIndex + 1;
        }
      });
    }

    // Create new course
    const course = new Course({
      ...courseData,
      createdBy: userId
    });

    const savedCourse = await course.save();

    // Populate the created course
    const populatedCourse = await Course.findById(savedCourse._id)
      .populate('createdBy', 'name email')
      .lean();

    return populatedCourse;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Đã tồn tại khóa học với tiêu đề này');
    }
    throw new Error(`Lỗi khi tạo khóa học: ${error.message}`);
  }
}

// Update course
export async function updateCourseService(courseId, updateData, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    // Check if course exists and user has permission
    const existingCourse = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!existingCourse) {
      throw new Error('Không tìm thấy khóa học');
    }

    // Check if user is the creator or admin (you can add admin check here)
    if (existingCourse.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền cập nhật khóa học này');
    }

    // Check for duplicate title if title is being updated
    if (updateData.title && updateData.title !== existingCourse.title) {
      const duplicateCourse = await Course.findOne({
        title: updateData.title,
        isActive: true,
        _id: { $ne: courseId }
      });

      if (duplicateCourse) {
        throw new Error('Đã tồn tại khóa học với tiêu đề này');
      }
    }

    // Validate modules and lessons structure if updating modules
    if (updateData.modules) {
      updateData.modules.forEach((module, moduleIndex) => {
        if (module.lessons) {
          module.lessons.forEach((lesson, lessonIndex) => {
            // Set order if not provided
            if (!lesson.order) {
              lesson.order = lessonIndex + 1;
            }
          });
        }
        // Set module order if not provided
        if (!module.order) {
          module.order = moduleIndex + 1;
        }
      });
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .lean();

    return updatedCourse;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Đã tồn tại khóa học với tiêu đề này');
    }
    throw new Error(`Lỗi khi cập nhật khóa học: ${error.message}`);
  }
}

// Delete course (soft delete)
export async function deleteCourseService(courseId, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    // Check if course exists and user has permission
    const existingCourse = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!existingCourse) {
      throw new Error('Không tìm thấy khóa học');
    }

    // Check if user is the creator or admin
    if (existingCourse.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền xóa khóa học này');
    }

    // Soft delete
    const deletedCourse = await Course.findByIdAndUpdate(
      courseId,
      { isActive: false },
      { new: true }
    );

    return deletedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi xóa khóa học: ${error.message}`);
  }
}

// Add lesson to course
export async function addLessonToCourseService(courseId, lessonId, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      throw new Error('ID bài học không hợp lệ');
    }

    // Check if course exists and user has permission
    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền thêm bài học vào khóa học này');
    }

    // Check if lesson already exists in course
    if (course.lessons.includes(lessonId)) {
      throw new Error('Bài học đã tồn tại trong khóa học');
    }

    // Add lesson to course
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { lessons: lessonId } },
      { new: true, runValidators: true }
    )
      // .populate('lessons', 'title duration') // Commented out - no Lesson model yet
      .populate('createdBy', 'name email')
      .lean();

    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi thêm bài học: ${error.message}`);
  }
}

// Remove lesson from course
export async function removeLessonFromCourseService(courseId, lessonId, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      throw new Error('ID bài học không hợp lệ');
    }

    // Check if course exists and user has permission
    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền xóa bài học khỏi khóa học này');
    }

    // Remove lesson from course
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { $pull: { lessons: lessonId } },
      { new: true, runValidators: true }
    )
      // .populate('lessons', 'title duration') // Commented out - no Lesson model yet
      .populate('createdBy', 'name email')
      .lean();

    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi xóa bài học: ${error.message}`);
  }
}

// Get courses by level
export async function getCoursesByLevelService(level) {
  try {
    const courses = await Course.findByLevel(level);
    return courses;
  } catch (error) {
    throw new Error(`Lỗi khi lấy khóa học theo level: ${error.message}`);
  }
}

// Search courses by title
export async function searchCoursesByTitleService(searchTerm) {
  try {
    const courses = await Course.searchByTitle(searchTerm);
    return courses;
  } catch (error) {
    throw new Error(`Lỗi khi tìm kiếm khóa học: ${error.message}`);
  }
}

// Get courses created by user
export async function getCoursesByUserService(userId) {
  try {
    const courses = await Course.find({
      createdBy: userId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .lean();

    return courses;
  } catch (error) {
    throw new Error(`Lỗi khi lấy khóa học của người dùng: ${error.message}`);
  }
}

// Add module to course
export async function addModuleToCourseService(courseId, moduleData, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền thêm module vào khóa học này');
    }

    const updatedCourse = await course.addModule(moduleData);
    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi thêm module: ${error.message}`);
  }
}

// Update module in course
export async function updateModuleInCourseService(courseId, moduleId, updateData, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền cập nhật module trong khóa học này');
    }

    const updatedCourse = await course.updateModule(moduleId, updateData);
    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi cập nhật module: ${error.message}`);
  }
}

// Remove module from course
export async function removeModuleFromCourseService(courseId, moduleId, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền xóa module khỏi khóa học này');
    }

    const updatedCourse = await course.removeModule(moduleId);
    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi xóa module: ${error.message}`);
  }
}

// Add lesson to module
export async function addLessonToModuleService(courseId, moduleId, lessonData, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền thêm bài học vào khóa học này');
    }

    const updatedCourse = await course.addLessonToModule(moduleId, lessonData);
    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi thêm bài học: ${error.message}`);
  }
}

// Update lesson in module
export async function updateLessonInModuleService(courseId, moduleId, lessonId, updateData, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền cập nhật bài học trong khóa học này');
    }

    const updatedCourse = await course.updateLessonInModule(moduleId, lessonId, updateData);
    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi cập nhật bài học: ${error.message}`);
  }
}

// Remove lesson from module
export async function removeLessonFromModuleService(courseId, moduleId, lessonId, userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('ID khóa học không hợp lệ');
    }

    const course = await Course.findOne({
      _id: courseId,
      isActive: true
    });

    if (!course) {
      throw new Error('Không tìm thấy khóa học');
    }

    if (course.createdBy.toString() !== userId.toString()) {
      throw new Error('Bạn không có quyền xóa bài học khỏi khóa học này');
    }

    const updatedCourse = await course.removeLessonFromModule(moduleId, lessonId);
    return updatedCourse;
  } catch (error) {
    throw new Error(`Lỗi khi xóa bài học: ${error.message}`);
  }
}
