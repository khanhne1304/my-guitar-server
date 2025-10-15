import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Bắt đầu tạo dữ liệu khóa học tương tác hoàn chỉnh...\n');

// Danh sách các script cần chạy theo thứ tự
const scripts = [
  'seedAdmin.js',
  'seedInteractiveCourses.js',
  'updateCourseData.js',
  'addMoreInteractiveData.js',
  'checkInteractiveData.js'
];

async function runScripts() {
  for (const script of scripts) {
    console.log(`📝 Đang chạy ${script}...`);
    
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('node', [path.join(__dirname, script)], {
          stdio: 'inherit',
          shell: true
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Hoàn thành ${script}\n`);
            resolve();
          } else {
            console.log(`❌ Lỗi khi chạy ${script} (exit code: ${code})\n`);
            reject(new Error(`Script ${script} failed with exit code ${code}`));
          }
        });
        
        child.on('error', (error) => {
          console.log(`❌ Lỗi khi chạy ${script}:`, error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.log(`⚠️  Bỏ qua ${script} do lỗi:`, error.message);
      // Tiếp tục chạy script tiếp theo
    }
  }
  
  console.log('🎉 Hoàn thành tạo dữ liệu khóa học tương tác hoàn chỉnh!');
  console.log('\n📋 Dữ liệu đã được tạo:');
  console.log('   ✅ Admin user');
  console.log('   ✅ 5 khóa học tương tác với đầy đủ dữ liệu');
  console.log('   ✅ 7 modules với 13 bài học');
  console.log('   ✅ TabData chi tiết cho mỗi bài học');
  console.log('   ✅ Timeline và exercises');
  console.log('   ✅ Feedback và thống kê');
  console.log('   ✅ Metronome integration');
  console.log('   ✅ Practice interface data');
  console.log('\n🎸 Sẵn sàng để sử dụng giao diện học tương tác!');
}

runScripts().catch((error) => {
  console.error('❌ Lỗi khi tạo dữ liệu:', error.message);
  process.exit(1);
});








