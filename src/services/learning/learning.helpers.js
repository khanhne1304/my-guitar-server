import Course from '../../models/Course.js';
import Module from '../../models/Module.js';
import { httpError } from '../../utils/httpError.js';

export function uid(user) {
  return user?._id?.toString?.() || user?.id?.toString?.() || null;
}

export function canReadCourse(course, viewer) {
  if (!course) return false;
  if (course.isPublished) return true;
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  return course.createdBy?.toString() === uid(viewer);
}

export function assertCourseOwner(course, user) {
  if (!course) throw httpError(404, 'Không tìm thấy khóa học');
  if (user.role === 'admin') return;
  if (course.createdBy?.toString() !== uid(user)) {
    throw httpError(403, 'Bạn không có quyền chỉnh sửa khóa học này');
  }
}

export async function getCourseForModule(moduleId) {
  const mod = await Module.findById(moduleId).lean();
  if (!mod) throw httpError(404, 'Không tìm thấy module');
  const course = await Course.findById(mod.courseId);
  if (!course) throw httpError(404, 'Không tìm thấy khóa học');
  return { module: mod, course };
}

export function mapCourseBase(c) {
  return {
    id: c._id.toString(),
    title: c.title,
    description: c.description || '',
    thumbnail: c.thumbnail || '',
    level: c.level,
    tags: c.tags || [],
    isPublished: c.isPublished,
    createdBy: c.createdBy?.toString() || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
