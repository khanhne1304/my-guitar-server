// src/scripts/testAPI.js
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test data
const testData = {
  user: {
    email: 'student@example.com',
    password: 'password123'
  },
  course: {
    title: 'Test Course',
    slug: 'test-course',
    level: 'beginner',
    summary: 'Test course for API testing',
    description: 'This is a test course to verify API functionality',
    durationWeeks: 4
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`❌ API call failed: ${endpoint}`, error.message);
    return { status: 500, data: { error: error.message } };
  }
};

// Test functions
const testGetCourses = async () => {
  console.log('\n🧪 Testing GET /api/courses...');
  const result = await apiCall('/courses');
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ GET /api/courses - SUCCESS');
    console.log(`📊 Found ${result.data.data.courses?.length || 0} courses`);
    return result.data.data.courses;
  } else {
    console.log('❌ GET /api/courses - FAILED');
    console.log('Response:', result.data);
    return [];
  }
};

const testGetCourseBySlug = async (slug) => {
  console.log(`\n🧪 Testing GET /api/courses/${slug}...`);
  const result = await apiCall(`/courses/${slug}`);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ GET /api/courses/:slug - SUCCESS');
    console.log(`📚 Course: ${result.data.data.title}`);
    console.log(`📖 Modules: ${result.data.data.modules?.length || 0}`);
    return result.data.data;
  } else {
    console.log('❌ GET /api/courses/:slug - FAILED');
    console.log('Response:', result.data);
    return null;
  }
};

const testGetCoursesByLevel = async (level) => {
  console.log(`\n🧪 Testing GET /api/courses/level/${level}...`);
  const result = await apiCall(`/courses/level/${level}`);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ GET /api/courses/level/:level - SUCCESS');
    console.log(`📊 Found ${result.data.data.length} ${level} courses`);
    return result.data.data;
  } else {
    console.log('❌ GET /api/courses/level/:level - FAILED');
    console.log('Response:', result.data);
    return [];
  }
};

const testSearchCourses = async (searchTerm) => {
  console.log(`\n🧪 Testing GET /api/courses/search/${searchTerm}...`);
  const result = await apiCall(`/courses/search/${searchTerm}`);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ GET /api/courses/search/:term - SUCCESS');
    console.log(`🔍 Found ${result.data.data.length} courses for "${searchTerm}"`);
    return result.data.data;
  } else {
    console.log('❌ GET /api/courses/search/:term - FAILED');
    console.log('Response:', result.data);
    return [];
  }
};

const testGetLesson = async (slug, moduleOrder, lessonOrder) => {
  console.log(`\n🧪 Testing GET /api/courses/${slug}/lessons/${moduleOrder}.${lessonOrder}...`);
  const result = await apiCall(`/courses/${slug}/lessons/${moduleOrder}.${lessonOrder}`);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ GET /api/courses/:slug/lessons/:ml - SUCCESS');
    console.log(`📖 Lesson: ${result.data.data.lesson.title}`);
    console.log(`⏱️ Duration: ${result.data.data.lesson.durationMin} minutes`);
    return result.data.data;
  } else {
    console.log('❌ GET /api/courses/:slug/lessons/:ml - FAILED');
    console.log('Response:', result.data);
    return null;
  }
};

const testCreateCourse = async (courseData) => {
  console.log('\n🧪 Testing POST /api/courses (Create Course)...');
  
  // Note: This requires authentication, so it will likely fail without proper auth
  const result = await apiCall('/courses', {
    method: 'POST',
    body: JSON.stringify(courseData)
  });
  
  if (result.status === 201 && result.data.success) {
    console.log('✅ POST /api/courses - SUCCESS');
    console.log(`📚 Created course: ${result.data.data.title}`);
    return result.data.data;
  } else {
    console.log('❌ POST /api/courses - FAILED (Expected - requires authentication)');
    console.log('Response:', result.data);
    return null;
  }
};

const testProgressAPI = async () => {
  console.log('\n🧪 Testing Progress API...');
  
  // Test get lesson progress (requires authentication)
  const result = await apiCall('/progress/lesson/guitar-co-ban#1.1');
  
  if (result.status === 200) {
    console.log('✅ GET /api/progress/lesson/:lessonKey - SUCCESS');
    console.log('📊 Progress data:', result.data);
  } else {
    console.log('❌ GET /api/progress/lesson/:lessonKey - FAILED (Expected - requires authentication)');
    console.log('Response:', result.data);
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting API Tests...');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Get all courses
    const courses = await testGetCourses();
    
    if (courses.length > 0) {
      const firstCourse = courses[0];
      
      // Test 2: Get course by slug
      const courseDetail = await testGetCourseBySlug(firstCourse.slug);
      
      if (courseDetail && courseDetail.modules.length > 0) {
        const firstModule = courseDetail.modules[0];
        
        if (firstModule.lessons.length > 0) {
          // Test 3: Get specific lesson
          await testGetLesson(
            firstCourse.slug, 
            firstModule.order, 
            firstModule.lessons[0].order
          );
        }
      }
    }
    
    // Test 4: Get courses by level
    await testGetCoursesByLevel('beginner');
    await testGetCoursesByLevel('intermediate');
    await testGetCoursesByLevel('advanced');
    
    // Test 5: Search courses
    await testSearchCourses('guitar');
    await testSearchCourses('cơ bản');
    
    // Test 6: Create course (will fail without auth)
    await testCreateCourse(testData.course);
    
    // Test 7: Progress API (will fail without auth)
    await testProgressAPI();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 API Tests Completed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Public routes should work');
    console.log('❌ Protected routes require authentication');
    console.log('🔐 Use JWT token in Authorization header for protected routes');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run tests
runTests();
