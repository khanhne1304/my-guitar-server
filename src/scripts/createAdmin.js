import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Kiểm tra xem đã có admin chưa
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Tạo admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@guitar.com',
      password: 'admin123',
      fullName: 'Administrator',
      role: 'admin'
    });

    await adminUser.save();
    console.log('Admin user created successfully:');
    console.log('Email:', adminUser.email);
    console.log('Password: admin123');
    console.log('Please change the password after first login!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

createAdminUser();
