// Test email connection
import { testEmailConnection } from './src/services/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('🔍 Testing email connection...');
  console.log('Gmail User:', process.env.GMAIL_USER);
  console.log('App Password:', process.env.GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not set');
  
  try {
    const result = await testEmailConnection();
    if (result) {
      console.log('✅ Email connection successful!');
    } else {
      console.log('❌ Email connection failed!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEmail();



