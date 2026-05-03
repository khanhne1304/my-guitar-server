import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const userLearningPathSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    steps: { type: [stepSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model('UserLearningPath', userLearningPathSchema);
