import mongoose from 'mongoose';

const challengeSongSchema = new mongoose.Schema(
  {
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    artist: { type: String, default: '', trim: true },
    youtubeUrl: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
  },
  { timestamps: true },
);

export default mongoose.model('ChallengeSong', challengeSongSchema);
