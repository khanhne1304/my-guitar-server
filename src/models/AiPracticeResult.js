import mongoose from 'mongoose';

const regressionScoreSchema = new mongoose.Schema(
  {
    pitch_accuracy: { type: Number, default: 0 },
    timing_accuracy: { type: Number, default: 0 },
    timing_stability: { type: Number, default: 0 },
    tempo_deviation_percent: { type: Number, default: 0 },
    chord_cleanliness_score: { type: Number, default: 0 },
    overall_score: { type: Number, default: 0 },
  },
  { _id: false },
);

const classificationScoreSchema = new mongoose.Schema(
  {
    level_class: { type: Number, default: 0 },
    probabilities: {
      type: [Number],
      default: undefined,
    },
  },
  { _id: false },
);

const featureSchema = new mongoose.Schema(
  {
    mean_pitch_error_semitones: Number,
    std_pitch_error_semitones: Number,
    mean_timing_offset_ms: Number,
    std_timing_offset_ms: Number,
    onset_density: Number,
    tempo_variation_pct: Number,
    buzz_ratio: Number,
    missing_strings_ratio: Number,
    extra_noise_level: Number,
    mean_snr_db: Number,
    attack_smoothness: Number,
    sustain_consistency: Number,
  },
  { _id: false },
);

const aiPracticeResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    lessonId: { type: String, trim: true },
    lessonTitle: { type: String, trim: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'custom'],
      default: 'beginner',
    },
    bpm: { type: Number },
    targetBpm: { type: Number },
    practiceDuration: { type: Number },
    metadata: { type: mongoose.Schema.Types.Mixed },
    features: featureSchema,
    scores: {
      regression: { type: regressionScoreSchema, default: () => ({}) },
      classification: { type: classificationScoreSchema, default: () => ({}) },
    },
  },
  { timestamps: true },
);

export default mongoose.model('AiPracticeResult', aiPracticeResultSchema);

