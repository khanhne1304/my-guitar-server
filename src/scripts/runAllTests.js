import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const runCommand = async (command, description) => {
  try {
    log(`\n${colors.cyan}🔄 ${description}...${colors.reset}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.log(stderr);
    }
    
    log(`✅ ${description} completed successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return false;
  }
};

const main = async () => {
  log('🚀 Starting Complete Course System Setup...', 'bright');
  
  const steps = [
    {
      command: 'npm run seed:admin',
      description: 'Creating admin user'
    },
    {
      command: 'npm run seed:complete',
      description: 'Seeding complete course data with modules and lessons'
    },
    {
      command: 'npm run test:api',
      description: 'Testing course API endpoints'
    }
  ];
  
  let successCount = 0;
  
  for (const step of steps) {
    const success = await runCommand(step.command, step.description);
    if (success) {
      successCount++;
    }
  }
  
  log(`\n📊 Results: ${successCount}/${steps.length} steps completed successfully`, 'blue');
  
  if (successCount === steps.length) {
    log('\n🎉 All setup steps completed successfully!', 'green');
    log('\n📋 Available Commands:', 'bright');
    log('  npm run seed:admin     - Create admin user', 'cyan');
    log('  npm run seed:complete  - Seed complete course data', 'cyan');
    log('  npm run seed:courses   - Seed basic course data', 'cyan');
    log('  npm run seed:all       - Seed all data (legacy)', 'cyan');
    log('  npm run test:api       - Test course API', 'cyan');
    log('  npm run dev            - Start development server', 'cyan');
    
    log('\n🔑 Test Accounts:', 'bright');
    log('  Admin: admin@guitar.com / Admin@123', 'yellow');
    log('  Student: student@guitar.com / Student@123', 'yellow');
    
    log('\n📚 Course Data Summary:', 'bright');
    log('  - 3 Complete courses with modules and lessons', 'cyan');
    log('  - Beginner: Guitar Cơ Bản (3 modules, 6 lessons)', 'cyan');
    log('  - Intermediate: Fingerstyle Guitar (3 modules, 4 lessons)', 'cyan');
    log('  - Advanced: Guitar Lead (3 modules, 4 lessons)', 'cyan');
    log('  - Interactive features enabled', 'cyan');
    log('  - Sample progress data created', 'cyan');
    
  } else {
    log('\n❌ Some steps failed. Please check the errors above.', 'red');
    process.exit(1);
  }
};

main().catch(error => {
  log(`❌ Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
