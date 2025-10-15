import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

// Test API functions
const testCourseAPI = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    console.log('\n=== TESTING COURSE API ===\n');
    
    // Test 1: Get all courses
    console.log('1. Testing: Get all courses');
    const allCourses = await Course.find({}).populate('createdBy', 'username email');
    console.log(`✅ Found ${allCourses.length} courses`);
    allCourses.forEach(course => {
      console.log(`   - ${course.title} (${course.level}) - ${course.lessonCount} lessons`);
    });
    
    // Test 2: Get courses by level
    console.log('\n2. Testing: Get courses by level');
    const beginnerCourses = await Course.findByLevel('beginner');
    const intermediateCourses = await Course.findByLevel('intermediate');
    const advancedCourses = await Course.findByLevel('advanced');
    console.log(`✅ Beginner: ${beginnerCourses.length} courses`);
    console.log(`✅ Intermediate: ${intermediateCourses.length} courses`);
    console.log(`✅ Advanced: ${advancedCourses.length} courses`);
    
    // Test 3: Search courses
    console.log('\n3. Testing: Search courses');
    const searchResults = await Course.searchByTitle('guitar');
    console.log(`✅ Search "guitar": ${searchResults.length} results`);
    
    // Test 4: Get interactive courses
    console.log('\n4. Testing: Get interactive courses');
    const interactiveCourses = await Course.findInteractiveCourses();
    console.log(`✅ Interactive courses: ${interactiveCourses.length}`);
    
    // Test 5: Get course with modules and lessons
    console.log('\n5. Testing: Get course details');
    if (allCourses.length > 0) {
      const course = await Course.findById(allCourses[0]._id);
      console.log(`✅ Course: ${course.title}`);
      console.log(`   - Modules: ${course.moduleCount}`);
      console.log(`   - Lessons: ${course.lessonCount}`);
      console.log(`   - Duration: ${course.totalDuration} minutes`);
      console.log(`   - Interactive: ${course.isInteractive}`);
      
      if (course.modules.length > 0) {
        const firstModule = course.modules[0];
        console.log(`   - First module: ${firstModule.title} (${firstModule.lessons.length} lessons)`);
        
        if (firstModule.lessons.length > 0) {
          const firstLesson = firstModule.lessons[0];
          console.log(`   - First lesson: ${firstLesson.title} (${firstLesson.type})`);
        }
      }
    }
    
    // Test 6: Test course statistics
    console.log('\n6. Testing: Course statistics');
    allCourses.forEach(course => {
      console.log(`✅ ${course.title}:`);
      console.log(`   - Views: ${course.stats.totalViews}`);
      console.log(`   - Completions: ${course.stats.totalCompletions}`);
      console.log(`   - Rating: ${course.stats.averageRating}/5 (${course.stats.totalRatings} ratings)`);
      console.log(`   - Completion rate: ${course.completionRate}%`);
    });
    
    // Test 7: Test user progress
    console.log('\n7. Testing: User progress');
    const progressCount = await UserProgress.countDocuments();
    console.log(`✅ Total progress records: ${progressCount}`);
    
    if (progressCount > 0) {
      const progress = await UserProgress.findOne().populate('userId', 'username email').populate('courseId', 'title');
      console.log(`✅ Sample progress:`);
      console.log(`   - User: ${progress.userId.username}`);
      console.log(`   - Course: ${progress.courseId.title}`);
      console.log(`   - Status: ${progress.status}`);
      console.log(`   - Score: ${progress.score}`);
      console.log(`   - Time spent: ${progress.timeSpent} minutes`);
    }
    
    // Test 8: Test course methods
    console.log('\n8. Testing: Course methods');
    if (allCourses.length > 0) {
      const course = allCourses[0];
      
      // Test updateStats
      console.log('   - Testing updateStats...');
      await course.updateStats({ views: 10, rating: 4.5 });
      console.log('   ✅ updateStats completed');
      
      // Test enableInteractiveFeatures
      console.log('   - Testing enableInteractiveFeatures...');
      await course.enableInteractiveFeatures({
        hasMetronome: true,
        hasPitchDetection: true,
        hasRealTimeFeedback: true
      });
      console.log('   ✅ enableInteractiveFeatures completed');
    }
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Test specific course operations
const testCourseOperations = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n=== TESTING COURSE OPERATIONS ===\n');
    
    const courses = await Course.find({});
    if (courses.length === 0) {
      console.log('❌ No courses found. Please run seed script first.');
      return;
    }
    
    const course = courses[0];
    console.log(`Testing with course: ${course.title}`);
    
    // Test adding module
    console.log('\n1. Testing: Add module');
    const newModule = {
      title: 'Test Module',
      description: 'This is a test module',
      lessons: []
    };
    await course.addModule(newModule);
    console.log('✅ Module added successfully');
    
    // Test adding lesson to module
    console.log('\n2. Testing: Add lesson to module');
    const newLesson = {
      title: 'Test Lesson',
      type: 'THEORY',
      durationMin: 15,
      objectives: ['Test objective'],
      skills: ['Test skill'],
      prerequisites: [],
      content: {
        text: 'This is a test lesson content'
      },
      practice: {
        metronomeBpm: 60,
        minutes: 10,
        checklist: ['Test checklist']
      },
      assessment: {
        type: 'quiz',
        config: {
          questions: [{
            question: 'Test question?',
            options: ['A', 'B', 'C', 'D'],
            correct: 0
          }]
        }
      }
    };
    
    const moduleId = course.modules[course.modules.length - 1]._id;
    await course.addLessonToModule(moduleId, newLesson);
    console.log('✅ Lesson added successfully');
    
    // Test updating lesson
    console.log('\n3. Testing: Update lesson');
    const lessonId = course.modules[course.modules.length - 1].lessons[0]._id;
    await course.updateLessonInModule(moduleId, lessonId, {
      title: 'Updated Test Lesson',
      durationMin: 20
    });
    console.log('✅ Lesson updated successfully');
    
    // Test removing lesson
    console.log('\n4. Testing: Remove lesson');
    await course.removeLessonFromModule(moduleId, lessonId);
    console.log('✅ Lesson removed successfully');
    
    // Test removing module
    console.log('\n5. Testing: Remove module');
    await course.removeModule(moduleId);
    console.log('✅ Module removed successfully');
    
    console.log('\n🎉 All course operations completed successfully!');
    
  } catch (error) {
    console.error('❌ Course operations test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Main test function
const main = async () => {
  console.log('🚀 Starting Course API Tests...\n');
  
  try {
    await testCourseAPI();
    await testCourseOperations();
    
    console.log('\n✅ All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].includes('testCourseAPI.js')) {
  main();
}

export { testCourseAPI, testCourseOperations };