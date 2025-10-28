import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Variables Check:');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? `Set (${process.env.GMAIL_APP_PASSWORD.length} chars)` : 'Not set');
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

// Test email service
import { testEmailConnection } from './src/services/emailService.js';

async function test() {
  try {
    console.log('\n📧 Testing email connection...');
    const result = await testEmailConnection();
    console.log('Result:', result ? '✅ Success' : '❌ Failed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();


