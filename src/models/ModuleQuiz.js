import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: [(v) => v.length === 4, 'Each question must have exactly 4 options'],
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: false },
);

const moduleQuizSchema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, trim: true },
    questions: { type: [questionSchema], required: true, validate: [(q) => q.length >= 3 && q.length <= 5, '3–5 questions'] },
  },
  { timestamps: true },
);

export default mongoose.model('ModuleQuiz', moduleQuizSchema);
