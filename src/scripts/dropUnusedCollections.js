/**
 * Drop MongoDB collections that have models but are not used in application code.
 * Run: node src/scripts/dropUnusedCollections.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const UNUSED_COLLECTIONS = ['forumvotes', 'aipracticeresults'];

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/my_guitar';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  for (const name of UNUSED_COLLECTIONS) {
    const exists = (await db.listCollections({ name }).toArray()).length > 0;
    if (!exists) {
      console.log(`[skip] ${name} — không tồn tại`);
      continue;
    }
    const count = await db.collection(name).countDocuments();
    await db.collection(name).drop();
    console.log(`[dropped] ${name} (${count} document(s))`);
  }

  await mongoose.disconnect();
  console.log('\nHoàn tất.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
