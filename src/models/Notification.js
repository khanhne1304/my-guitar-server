import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['general', 'promotion', 'system', 'order', 'product'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'registered', 'premium', 'specific'],
      default: 'all',
    },
    targetUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    scheduledAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    actionText: {
      type: String,
      trim: true,
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  { timestamps: true },
);

// Indexes
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isActive: 1, expiresAt: 1 });
notificationSchema.index({ targetAudience: 1 });

export default mongoose.model('Notification', notificationSchema);

