import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema({
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
  // Progress tracking
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped'],
    default: 'not_started'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Time tracking
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  // Interactive features usage
  interactiveStats: {
    metronomeUsage: {
      totalTime: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 }
    },
    pitchDetectionUsage: {
      totalAttempts: { type: Number, default: 0 },
      successfulDetections: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 }
    },
    exercisesCompleted: {
      total: { type: Number, default: 0 },
      successful: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 }
    },
    feedbackReceived: {
      success: { type: Number, default: 0 },
      warning: { type: Number, default: 0 },
      error: { type: Number, default: 0 }
    }
  },
  // Practice sessions
  practiceSessions: [{
    sessionId: String,
    startTime: Date,
    endTime: Date,
    duration: Number, // in seconds
    bpm: Number,
    accuracy: Number,
    exercisesCompleted: Number,
    notes: String
  }],
  // Achievements and badges
  achievements: [{
    id: String,
    name: String,
    description: String,
    earnedAt: Date,
    points: Number
  }],
  // User feedback
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },
  userFeedback: {
    type: String,
    maxlength: 500
  },
  // Difficulty progression
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  // Learning analytics
  learningAnalytics: {
    averageSessionDuration: { type: Number, default: 0 },
    preferredPracticeTime: { type: String },
    improvementRate: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
courseProgressSchema.index({ userId: 1, courseId: 1 });
courseProgressSchema.index({ userId: 1, lessonId: 1 });
courseProgressSchema.index({ status: 1 });
courseProgressSchema.index({ completedAt: 1 });

// Virtual for completion percentage
courseProgressSchema.virtual('completionPercentage').get(function() {
  return Math.round(this.progress);
});

// Virtual for total points earned
courseProgressSchema.virtual('totalPoints').get(function() {
  return this.achievements.reduce((total, achievement) => total + (achievement.points || 0), 0);
});

// Virtual for practice efficiency
courseProgressSchema.virtual('practiceEfficiency').get(function() {
  if (this.timeSpent === 0) return 0;
  const totalExercises = this.interactiveStats.exercisesCompleted.total;
  return Math.round((totalExercises / (this.timeSpent / 60)) * 100) / 100; // exercises per minute
});

// Instance methods
courseProgressSchema.methods.startSession = function(sessionData = {}) {
  const sessionId = new mongoose.Types.ObjectId().toString();
  const session = {
    sessionId,
    startTime: new Date(),
    bpm: sessionData.bpm || 120,
    ...sessionData
  };
  
  this.practiceSessions.push(session);
  this.status = 'in_progress';
  return this.save();
};

courseProgressSchema.methods.endSession = function(sessionId, sessionData = {}) {
  const session = this.practiceSessions.id(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  session.endTime = new Date();
  session.duration = Math.round((session.endTime - session.startTime) / 1000);
  session.accuracy = sessionData.accuracy || 0;
  session.exercisesCompleted = sessionData.exercisesCompleted || 0;
  session.notes = sessionData.notes || '';
  
  // Update overall stats
  this.timeSpent += session.duration;
  this.interactiveStats.metronomeUsage.sessions += 1;
  this.interactiveStats.metronomeUsage.totalTime += session.duration;
  
  return this.save();
};

courseProgressSchema.methods.updateProgress = function(progressData) {
  this.progress = Math.min(100, Math.max(0, progressData.progress || this.progress));
  
  if (this.progress >= 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

courseProgressSchema.methods.addAchievement = function(achievement) {
  const existingAchievement = this.achievements.find(a => a.id === achievement.id);
  if (!existingAchievement) {
    this.achievements.push({
      ...achievement,
      earnedAt: new Date()
    });
  }
  return this.save();
};

courseProgressSchema.methods.updateInteractiveStats = function(stats) {
  if (stats.pitchDetection) {
    this.interactiveStats.pitchDetectionUsage.totalAttempts += 1;
    if (stats.pitchDetection.successful) {
      this.interactiveStats.pitchDetectionUsage.successfulDetections += 1;
    }
    this.interactiveStats.pitchDetectionUsage.accuracy = 
      Math.round((this.interactiveStats.pitchDetectionUsage.successfulDetections / 
                 this.interactiveStats.pitchDetectionUsage.totalAttempts) * 100);
  }
  
  if (stats.exercise) {
    this.interactiveStats.exercisesCompleted.total += 1;
    if (stats.exercise.successful) {
      this.interactiveStats.exercisesCompleted.successful += 1;
    }
    this.interactiveStats.exercisesCompleted.averageScore = 
      Math.round((this.interactiveStats.exercisesCompleted.successful / 
                 this.interactiveStats.exercisesCompleted.total) * 100);
  }
  
  if (stats.feedback) {
    this.interactiveStats.feedbackReceived[stats.feedback.type] += 1;
  }
  
  return this.save();
};

// Static methods
courseProgressSchema.statics.getUserProgress = function(userId, courseId) {
  return this.find({ userId, courseId }).populate('courseId');
};

courseProgressSchema.statics.getCourseStats = function(courseId) {
  return this.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        completedStudents: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        averageProgress: { $avg: '$progress' },
        averageTimeSpent: { $avg: '$timeSpent' },
        averageRating: { $avg: '$userRating' }
      }
    }
  ]);
};

courseProgressSchema.statics.getUserLearningPath = function(userId) {
  return this.find({ userId })
    .populate('courseId')
    .sort({ createdAt: 1 });
};

export default mongoose.model('CourseProgress', courseProgressSchema);



