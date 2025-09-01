import mongoose from 'mongoose';
import slugify from 'slugify';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, index: true },
    country: { type: String, trim: true },
  },
  { timestamps: true },
);

schema.pre('save', function (next) {
  if (this.isModified('name')) this.slug = slugify(this.name, { lower: true });
  next();
});

export default mongoose.model('Brand', schema);
