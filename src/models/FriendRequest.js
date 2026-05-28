import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

schema.index({ from: 1, to: 1 }, { unique: true });

export default mongoose.model('FriendRequest', schema);
