import mongoose from 'mongoose';

const lessonProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  // Progress tracking for interactive lessons
  progressData: {
    attempts: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    bestScore: {
      type: Number,
      default: 0
    },
    practiceTime: {
      type: Number, // in minutes
      default: 0
    }
  },
  // User notes for the lesson
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Ghi chú không được vượt quá 1000 ký tự']
  },
  // Rating for the lesson (1-5 stars)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
lessonProgressSchema.index({ userId: 1, courseId: 1 });
lessonProgressSchema.index({ userId: 1, lessonId: 1 });
lessonProgressSchema.index({ courseId: 1, isCompleted: 1 });

// Static method to get user progress for a course
lessonProgressSchema.statics.getUserCourseProgress = function(userId, courseId) {
  return this.find({ userId, courseId });
};

// Static method to get lesson progress
lessonProgressSchema.statics.getLessonProgress = function(userId, lessonId) {
  return this.findOne({ userId, lessonId });
};

// Static method to update lesson progress
lessonProgressSchema.statics.updateLessonProgress = function(userId, lessonId, updateData) {
  return this.findOneAndUpdate(
    { userId, lessonId },
    { 
      ...updateData,
      lastAccessedAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// Static method to mark lesson as completed
lessonProgressSchema.statics.markLessonCompleted = function(userId, lessonId) {
  return this.findOneAndUpdate(
    { userId, lessonId },
    { 
      isCompleted: true,
      completedAt: new Date(),
      lastAccessedAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// Static method to get course completion percentage
lessonProgressSchema.statics.getCourseCompletionPercentage = function(userId, courseId, totalLessons) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), courseId: mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: null,
        completedLessons: { $sum: { $cond: ['$isCompleted', 1, 0] } },
        totalLessons: { $sum: 1 }
      }
    },
    {
      $project: {
        completionPercentage: {
          $cond: [
            { $gt: ['$totalLessons', 0] },
            { $multiply: [{ $divide: ['$completedLessons', '$totalLessons'] }, 100] },
            0
          ]
        }
      }
    }
  ]);
};

// Instance method to update progress data
lessonProgressSchema.methods.updateProgressData = function(progressData) {
  this.progressData = {
    ...this.progressData,
    ...progressData
  };
  return this.save();
};

// Instance method to add practice time
lessonProgressSchema.methods.addPracticeTime = function(minutes) {
  this.progressData.practiceTime += minutes;
  this.timeSpent += minutes;
  return this.save();
};

// Instance method to update accuracy
lessonProgressSchema.methods.updateAccuracy = function(accuracy) {
  this.progressData.accuracy = accuracy;
  if (accuracy > this.progressData.bestScore) {
    this.progressData.bestScore = accuracy;
  }
  return this.save();
};

export default mongoose.model('LessonProgress', lessonProgressSchema);
