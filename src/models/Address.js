import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: [true, 'Địa chỉ phải thuộc về một người dùng'],
      index: true 
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    ward: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    label: { 
      type: String, 
      enum: ['home', 'office', 'other'], 
      default: 'home',
      trim: true 
    },
    customLabel: { type: String, trim: true }, // For custom labels when label = 'other'
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Index to ensure only one default address per user
addressSchema.index({ user: 1, isDefault: 1 }, { 
  unique: true, 
  partialFilterExpression: { isDefault: true } 
});

// Pre-save hook to ensure only one default address per user
addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Unset default on other addresses of the same user
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

export default mongoose.model('Address', addressSchema);
