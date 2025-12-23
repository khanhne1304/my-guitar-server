import mongoose from 'mongoose';
import slugify from 'slugify';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, index: true },
    country: { type: String, trim: true },

    // Tham chiếu Category qua ObjectId (nhất quán với các model khác)
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
  },
  { timestamps: true },
);

// Tự sinh slug cho Brand
schema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

export default mongoose.model('Brand', schema);
