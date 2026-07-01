import mongoose from 'mongoose';
import slugify from 'slugify';

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '', trim: true },
    thumbnail: { type: String, default: '', trim: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    tags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

courseSchema.pre('save', async function () {
  if (!this.isModified('title') && this.slug) return;

  const base =
    slugify(this.title || '', { lower: true, strict: false, locale: 'vi' }) ||
    `course-${this._id?.toString?.() || Date.now()}`;

  let slug = base;
  let suffix = 1;
  const Model = this.constructor;

  while (await Model.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${suffix++}`;
  }

  this.slug = slug;
});

export default mongoose.model('Course', courseSchema);
