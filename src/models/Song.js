import mongoose from 'mongoose';
import slugify from 'slugify';

const ratingSchema = new mongoose.Schema(
  {
    user: { type: String },
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String },
  },
  { _id: false },
);

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    subtitle: { type: String },
    artists: { type: [String], default: [] },
    slug: { type: String, unique: true, index: true },
    posterName: { type: String },
    postedAt: { type: Date },
    views: { type: Number, default: 0 },
    styleLabel: { type: String },
    tags: { type: [String], default: [] },
    excerpt: { type: String },
    lyrics: { type: String, required: true },
    ratings: { type: [ratingSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

songSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true });
  }
  next();
});

export default mongoose.model('Song', songSchema);


