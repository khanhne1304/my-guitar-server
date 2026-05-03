import mongoose from 'mongoose';

/** userA & userB luôn sắp xếp theo string id tăng dần để cặp là duy nhất */
const schema = new mongoose.Schema(
  {
    userA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

schema.index({ userA: 1, userB: 1 }, { unique: true });

export default mongoose.model('Friendship', schema);
