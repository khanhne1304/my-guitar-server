// scripts/seedAdmin.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const username = 'admin';
  const email = 'admin@example.com';
  const password = 'Admin@123';

  const exists = await User.findOne({ $or: [{ username }, { email }] });
  if (exists) {
    exists.role = 'admin';
    exists.password = await bcrypt.hash(password, 10);
    await exists.save();
    console.log('Updated existing user to admin:', exists.username);
  } else {
    const admin = await User.create({
      username,
      email,
      fullName: 'Site Administrator',
      address: '',
      phone: '',
      password,
      role: 'admin',
    });
    console.log('Created new admin:', admin.username);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
