// Test script để kiểm tra API courses
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api';

async function testCoursesAPI() {
  console.log('🧪 Testing Courses API...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test courses endpoint
    console.log('\n2. Testing courses endpoint...');
    const coursesResponse = await fetch(`${BASE_URL}/courses`);
    const coursesData = await coursesResponse.json();
    console.log('✅ Courses response:', coursesData);
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testCoursesAPI();

