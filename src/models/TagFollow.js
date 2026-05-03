import mongoose from 'mongoose';

const tagFollowSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Normalized lowercase tag for stable matching */
    tag: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true },
);

tagFollowSchema.index({ user: 1, tag: 1 }, { unique: true });

export default mongoose.model('TagFollow', tagFollowSchema);
