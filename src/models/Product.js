import mongoose from 'mongoose';
import slugify from 'slugify';

const imageSchema = new mongoose.Schema(
  {
    url: String,
    alt: String,
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, unique: true, index: true },
    sku: { type: String, unique: true, sparse: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    description: String,
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    images: [imageSchema],
    attributes: {
      type: {
        type: String,
        enum: [
          'acoustic',
          'electric',
          'classical',
          'bass',
          'ukulele',
          'piano',
          'other',
        ],
        default: 'acoustic',
      },
      bodyMaterial: String,
      strings: Number,
      color: String,
    },
    price: {
      base: { type: Number, required: true },
      sale: { type: Number },
      currency: { type: String, default: 'VND' },
    },
    stock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

export default mongoose.model('Product', productSchema);
