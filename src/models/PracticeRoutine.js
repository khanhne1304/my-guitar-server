import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 5, min: 1 },
  },
  { _id: false },
);

const practiceRoutineSchema = new mongoose.Schema(
  {
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, unique: true, index: true },
    exercises: { type: [exerciseSchema], default: [] },
    estimatedMinutes: { type: Number, default: 15, min: 1 },
  },
  { timestamps: true },
);

export default mongoose.model('PracticeRoutine', practiceRoutineSchema);
