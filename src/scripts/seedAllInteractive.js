import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Bắt đầu seed dữ liệu khóa học tương tác...\n');

// Danh sách các script cần chạy theo thứ tự
const scripts = [
  'seedAdmin.js',
  'seedInteractiveCourses.js',
  'seedLessonData.js'
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
  
  console.log('🎉 Hoàn thành seed dữ liệu khóa học tương tác!');
  console.log('\n📋 Dữ liệu đã được tạo:');
  console.log('   - Admin user');
  console.log('   - Khóa học tương tác với metronome');
  console.log('   - Fingerstyle guitar tương tác');
  console.log('   - Guitar lead tương tác');
  console.log('   - Bài học với tabData chi tiết');
  console.log('   - Timeline và exercises');
  console.log('   - Feedback và thống kê');
}

runScripts().catch((error) => {
  console.error('❌ Lỗi khi seed dữ liệu:', error.message);
  process.exit(1);
});








