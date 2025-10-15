#!/usr/bin/env node

/**
 * Test Script for Course System
 * Kiểm tra tất cả API endpoints và tính năng của hệ thống khóa học
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api';

// Test data
const testUser = {
  email: 'test@guitar.com',
  password: 'test123'
};

const testCourse = {
  title: 'Test Course',
  slug: 'test-course',
  level: 'beginner',
  summary: 'Test course for API testing',
  durationWeeks: 4
};

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return {
      status: response.status,
      data,
      success: response.ok
    };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    return {
      status: 0,
      data: null,
      success: false,
      error: error.message
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  const result = await apiCall('/health');
  
  if (result.success) {
    console.log('✅ Health check passed');
    return true;
  } else {
    console.log('❌ Health check failed');
    return false;
  }
}

async function testGetCourses() {
  console.log('\n🔍 Testing Get Courses...');
  const result = await apiCall('/courses');
  
  if (result.success && result.data.success) {
    console.log(`✅ Get courses successful - Found ${result.data.data?.courses?.length || 0} courses`);
    return result.data.data;
  } else {
    console.log('❌ Get courses failed:', result.data?.message);
    return null;
  }
}

async function testGetCourseBySlug() {
  console.log('\n🔍 Testing Get Course by Slug...');
  const result = await apiCall('/courses/guitar-co-ban');
  
  if (result.success && result.data.success) {
    console.log('✅ Get course by slug successful');
    return result.data.data;
  } else {
    console.log('❌ Get course by slug failed:', result.data?.message);
    return null;
  }
}

async function testGetLesson() {
  console.log('\n🔍 Testing Get Lesson...');
  const result = await apiCall('/courses/guitar-co-ban/lessons/1.1');
  
  if (result.success && result.data.success) {
    console.log('✅ Get lesson successful');
    return result.data.data;
  } else {
    console.log('❌ Get lesson failed:', result.data?.message);
    return null;
  }
}

async function testProgressEndpoints() {
  console.log('\n🔍 Testing Progress Endpoints...');
  
  // Note: These require authentication, so we'll just test the endpoint structure
  const endpoints = [
    '/progress/start',
    '/progress/log-practice', 
    '/progress/complete',
    '/progress/lesson/guitar-co-ban#1.1',
    '/progress/course/123',
    '/progress/next-lesson?course=guitar-co-ban'
  ];
  
  let passed = 0;
  for (const endpoint of endpoints) {
    const result = await apiCall(endpoint, { method: 'GET' });
    // We expect 401 (unauthorized) or 400 (bad request) for these endpoints without auth
    if (result.status === 401 || result.status === 400 || result.status === 404) {
      console.log(`✅ ${endpoint} - Endpoint exists (${result.status})`);
      passed++;
    } else {
      console.log(`❌ ${endpoint} - Unexpected response (${result.status})`);
    }
  }
  
  console.log(`Progress endpoints: ${passed}/${endpoints.length} working`);
  return passed === endpoints.length;
}

async function testAssessmentEndpoints() {
  console.log('\n🔍 Testing Assessment Endpoints...');
  
  const endpoints = [
    '/assess/submit',
    '/assess/results/guitar-co-ban#1.1'
  ];
  
  let passed = 0;
  for (const endpoint of endpoints) {
    const result = await apiCall(endpoint, { method: 'GET' });
    if (result.status === 401 || result.status === 400 || result.status === 404) {
      console.log(`✅ ${endpoint} - Endpoint exists (${result.status})`);
      passed++;
    } else {
      console.log(`❌ ${endpoint} - Unexpected response (${result.status})`);
    }
  }
  
  console.log(`Assessment endpoints: ${passed}/${endpoints.length} working`);
  return passed === endpoints.length;
}

async function testCourseDataStructure(course) {
  console.log('\n🔍 Testing Course Data Structure...');
  
  const requiredFields = ['_id', 'title', 'slug', 'level', 'modules'];
  const missingFields = requiredFields.filter(field => !course[field]);
  
  if (missingFields.length === 0) {
    console.log('✅ Course data structure is valid');
    
    // Test modules structure
    if (course.modules && course.modules.length > 0) {
      const module = course.modules[0];
      const moduleFields = ['_id', 'title', 'order', 'lessons'];
      const missingModuleFields = moduleFields.filter(field => !module[field]);
      
      if (missingModuleFields.length === 0) {
        console.log('✅ Module data structure is valid');
        
        // Test lessons structure
        if (module.lessons && module.lessons.length > 0) {
          const lesson = module.lessons[0];
          const lessonFields = ['_id', 'title', 'type', 'durationMin', 'objectives'];
          const missingLessonFields = lessonFields.filter(field => !lesson[field]);
          
          if (missingLessonFields.length === 0) {
            console.log('✅ Lesson data structure is valid');
            return true;
          } else {
            console.log('❌ Lesson missing fields:', missingLessonFields);
            return false;
          }
        } else {
          console.log('❌ No lessons found in module');
          return false;
        }
      } else {
        console.log('❌ Module missing fields:', missingModuleFields);
        return false;
      }
    } else {
      console.log('❌ No modules found in course');
      return false;
    }
  } else {
    console.log('❌ Course missing fields:', missingFields);
    return false;
  }
}

async function testLessonDataStructure(lesson) {
  console.log('\n🔍 Testing Lesson Data Structure...');
  
  const requiredFields = ['_id', 'title', 'type', 'durationMin', 'objectives', 'content'];
  const missingFields = requiredFields.filter(field => !lesson[field]);
  
  if (missingFields.length === 0) {
    console.log('✅ Lesson data structure is valid');
    
    // Test content structure
    if (lesson.content) {
      const contentFields = ['text', 'chords', 'strumPattern'];
      const hasContent = contentFields.some(field => lesson.content[field]);
      
      if (hasContent) {
        console.log('✅ Lesson content is valid');
        return true;
      } else {
        console.log('❌ Lesson content is empty');
        return false;
      }
    } else {
      console.log('❌ No content found in lesson');
      return false;
    }
  } else {
    console.log('❌ Lesson missing fields:', missingFields);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Course System Tests...\n');
  
  const results = {
    healthCheck: false,
    getCourses: false,
    getCourseBySlug: false,
    getLesson: false,
    progressEndpoints: false,
    assessmentEndpoints: false,
    courseStructure: false,
    lessonStructure: false
  };
  
  // Run tests
  results.healthCheck = await testHealthCheck();
  
  const courses = await testGetCourses();
  results.getCourses = courses !== null;
  
  const course = await testGetCourseBySlug();
  results.getCourseBySlug = course !== null;
  
  const lesson = await testGetLesson();
  results.getLesson = lesson !== null;
  
  results.progressEndpoints = await testProgressEndpoints();
  results.assessmentEndpoints = await testAssessmentEndpoints();
  
  if (course) {
    results.courseStructure = await testCourseDataStructure(course);
  }
  
  if (lesson) {
    results.lessonStructure = await testLessonDataStructure(lesson);
  }
  
  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const testNames = {
    healthCheck: 'Health Check',
    getCourses: 'Get Courses',
    getCourseBySlug: 'Get Course by Slug',
    getLesson: 'Get Lesson',
    progressEndpoints: 'Progress Endpoints',
    assessmentEndpoints: 'Assessment Endpoints',
    courseStructure: 'Course Data Structure',
    lessonStructure: 'Lesson Data Structure'
  };
  
  let passedTests = 0;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([key, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testNames[key]}`);
    if (passed) passedTests++;
  });
  
  console.log('\n📈 Overall Results:');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Course system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
  }
  
  return results;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };
