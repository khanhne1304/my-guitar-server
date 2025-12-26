import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema(
  {
    accuracy: { type: Number, default: 0 },
    timingScore: { type: Number, default: 0 },
    clarityScore: { type: Number, default: 0 },
    speedScore: { type: Number, default: 0 },
    consistency: { type: Number, default: 0 },
  },
  { _id: false },
);

const chunkSchema = new mongoose.Schema(
  {
    start: { type: Number },
    end: { type: Number },
  },
  { _id: false },
);

const legatoPracticeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonId: { type: String, trim: true },
    lessonTitle: { type: String, trim: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    bpm: { type: Number, default: 80 },
    targetBpm: { type: Number, default: 80 },
    practiceDuration: { type: Number, default: 0 }, // seconds
    notesDetected: { type: Number, default: 0 },
    notesExpected: { type: Number, default: 0 },
    chunkUsed: chunkSchema,
    scores: { type: scoreSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default mongoose.model('LegatoPractice', legatoPracticeSchema);













