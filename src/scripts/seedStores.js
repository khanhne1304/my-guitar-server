import 'dotenv/config';
import mongoose from 'mongoose';
import Store from '../models/Store.js';
import { connectDB } from '../config/db.js';

async function main() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connected. Seeding stores...');

    const demo = [
      {
        name: 'Quận 1',
        address: '386 Cách Mạng Tháng 8, Q.1, TP.HCM',
        phone: '028 38 123 456',
        inventory: {
          'guitar-acoustic-yamaha-f310': 7,
          'guitar-electric-fender-stratocaster': 2,
          'guitar-acoustic-taylor-214ce': 4,
        },
      },
      {
        name: 'Quận 7',
        address: '180 Nguyễn Thị Thập, Q.7, TP.HCM',
        phone: '028 37 888 999',
        inventory: {
          'guitar-acoustic-yamaha-f310': 3,
          'guitar-electric-fender-stratocaster': 0,
          'guitar-acoustic-taylor-214ce': 1,
        },
      },
      {
        name: 'Hà Nội',
        address: '46 Hàng Bài, Hoàn Kiếm, Hà Nội',
        phone: '024 39 777 888',
        inventory: {
          'guitar-acoustic-yamaha-f310': 0,
          'guitar-electric-fender-stratocaster': 1,
          'guitar-acoustic-taylor-214ce': 2,
        },
      },
    ];

    await Store.deleteMany({});
    await Store.insertMany(demo);
    console.log('Seeded stores:', demo.length);
    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();



