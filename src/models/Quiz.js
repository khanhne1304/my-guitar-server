import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const quizSchema = new mongoose.Schema(
  {
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null, index: true },
    title: { type: String, required: true, trim: true },
    questions: { type: [questionSchema], required: true },
    passingScore: { type: Number, default: 60, min: 0, max: 100 },
  },
  { timestamps: true },
);

export default mongoose.model('Quiz', quizSchema);
