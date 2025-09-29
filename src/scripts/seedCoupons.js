// scripts/seedCoupons.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_guitar';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const coupons = [
    {
      code: 'WELCOME10', // 10% tối đa 50k, min order 200k
      type: 'percent',
      amount: 10,
      maxDiscount: 50000,
      minOrder: 200000,
      startAt: now,
      endAt: nextMonth,
      usageLimit: 0,
      isActive: true,
    },
    {
      code: 'FREESHIP15', // giảm 15k (cố định), min order 150k
      type: 'fixed',
      amount: 15000,
      maxDiscount: 0,
      minOrder: 150000,
      startAt: now,
      endAt: nextMonth,
      usageLimit: 0,
      isActive: true,
    },
    {
      code: 'SALE50K', // giảm 50k cố định, min order 500k
      type: 'fixed',
      amount: 50000,
      maxDiscount: 0,
      minOrder: 500000,
      startAt: now,
      endAt: nextMonth,
      usageLimit: 100, // giới hạn 100 lượt
      isActive: true,
    },
  ];

  for (const c of coupons) {
    const exists = await Coupon.findOne({ code: c.code });
    if (exists) {
      await Coupon.updateOne({ _id: exists._id }, { $set: c });
      console.log('Updated coupon:', c.code);
    } else {
      await Coupon.create(c);
      console.log('Inserted coupon:', c.code);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


