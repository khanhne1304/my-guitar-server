import mongoose from 'mongoose';

const practiceLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  minutes: {
    type: Number,
    required: true,
    min: 1
  },
  bpm: {
    type: Number,
    min: 60,
    max: 200
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Ghi chú không được vượt quá 500 ký tự']
  }
}, { _id: false });

const userProgressSchema = new mongoose.Schema({
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
  lessonKey: {
    type: String,
    required: true,
    match: [/^[a-z0-9-]+#\d+\.\d+$/, 'lessonKey phải có định dạng slug#module.lesson']
  },
  status: {
    type: String,
    enum: {
      values: ['not_started', 'in_progress', 'completed'],
      message: 'Trạng thái phải là not_started, in_progress hoặc completed'
    },
    default: 'not_started'
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  acquiredSkills: [{
    type: String,
    trim: true,
    maxlength: [100, 'Kỹ năng không được vượt quá 100 ký tự']
  }],
  practiceLogs: [practiceLogSchema],
  lastPlayedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  attempts: {
    type: Number,
    default: 0
  },
  bestScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
userProgressSchema.index({ userId: 1, courseId: 1 });
userProgressSchema.index({ userId: 1, lessonKey: 1 });
userProgressSchema.index({ courseId: 1, status: 1 });
userProgressSchema.index({ userId: 1, status: 1 });

// Static method to get user progress for a course
userProgressSchema.statics.getUserCourseProgress = function(userId, courseId) {
  return this.find({ userId, courseId });
};

// Static method to get lesson progress
userProgressSchema.statics.getLessonProgress = function(userId, lessonKey) {
  return this.findOne({ userId, lessonKey });
};

// Static method to start a lesson
userProgressSchema.statics.startLesson = function(userId, courseId, lessonKey) {
  return this.findOneAndUpdate(
    { userId, courseId, lessonKey },
    { 
      status: 'in_progress',
      lastPlayedAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// Static method to log practice
userProgressSchema.statics.logPractice = function(userId, lessonKey, practiceData) {
  return this.findOneAndUpdate(
    { userId, lessonKey },
    { 
      $push: { practiceLogs: practiceData },
      $inc: { timeSpent: practiceData.minutes },
      lastPlayedAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// Static method to complete lesson
userProgressSchema.statics.completeLesson = function(userId, lessonKey, score, acquiredSkills = []) {
  return this.findOneAndUpdate(
    { userId, lessonKey },
    { 
      status: 'completed',
      score: Math.max(score, 0),
      bestScore: Math.max(score, 0),
      acquiredSkills: [...new Set(acquiredSkills)], // Remove duplicates
      completedAt: new Date(),
      lastPlayedAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// Static method to get user's acquired skills
userProgressSchema.statics.getUserSkills = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $unwind: '$acquiredSkills' },
    { $group: { _id: '$acquiredSkills' } },
    { $project: { skill: '$_id', _id: 0 } }
  ]);
};

// Static method to get course completion percentage
userProgressSchema.statics.getCourseCompletionPercentage = function(userId, courseId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), courseId: mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: null,
        completedLessons: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
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

// Instance method to add practice time
userProgressSchema.methods.addPracticeTime = function(minutes) {
  this.timeSpent += minutes;
  this.lastPlayedAt = new Date();
  return this.save();
};

// Instance method to update score
userProgressSchema.methods.updateScore = function(score) {
  this.score = Math.max(score, 0);
  if (score > this.bestScore) {
    this.bestScore = score;
  }
  return this.save();
};

// Instance method to add acquired skill
userProgressSchema.methods.addAcquiredSkill = function(skill) {
  if (!this.acquiredSkills.includes(skill)) {
    this.acquiredSkills.push(skill);
  }
  return this.save();
};

export default mongoose.model('UserProgress', userProgressSchema);
