import mongoose from 'mongoose';
import { isTransactionSupported } from '../utils/transactionHelper.js';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');
  
  // Kiểm tra transaction support sau khi connect
  // Chỉ check một lần khi app khởi động
  await isTransactionSupported();
}
