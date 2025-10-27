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
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    imageUrl: {
      type: String,
    },
    actionUrl: {
      type: String,
    },
    actionText: {
      type: String,
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    clickCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Index for better query performance
notificationSchema.index({ isActive: 1, scheduledAt: 1 });
notificationSchema.index({ targetAudience: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 });

export default mongoose.model('Notification', notificationSchema);
