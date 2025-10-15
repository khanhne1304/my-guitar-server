import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

console.log('🔗 Testing MongoDB connection...');
console.log('URI:', MONGO_URI);

try {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected successfully!');
  
  // Test basic operations
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('📚 Collections found:', collections.map(c => c.name));
  
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
  console.log('✅ Connection test completed successfully!');
  
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure MongoDB is running');
  console.log('2. Check if MongoDB is installed');
  console.log('3. Try: mongod (to start MongoDB)');
  console.log('4. Check connection string:', MONGO_URI);
  process.exit(1);
}
