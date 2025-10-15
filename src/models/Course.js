import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề bài học là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề bài học không được vượt quá 200 ký tự']
  },
  type: {
    type: String,
    enum: {
      values: ['THEORY', 'CHORD', 'STRUM', 'SONG', 'PRACTICE'],
      message: 'Loại bài học phải là THEORY, CHORD, STRUM, SONG hoặc PRACTICE'
    },
    required: [true, 'Loại bài học là bắt buộc']
  },
  durationMin: {
    type: Number,
    required: [true, 'Thời lượng bài học là bắt buộc'],
    min: [1, 'Thời lượng phải ít nhất 1 phút']
  },
  objectives: [{
    type: String,
    trim: true,
    maxlength: [200, 'Mục tiêu không được vượt quá 200 ký tự']
  }],
  skills: [{
    type: String,
    trim: true,
    maxlength: [100, 'Kỹ năng không được vượt quá 100 ký tự']
  }],
  prerequisites: [{
    type: String,
    trim: true,
    maxlength: [100, 'Điều kiện tiên quyết không được vượt quá 100 ký tự']
  }],
  content: {
    text: {
      type: String,
      trim: true,
      maxlength: [5000, 'Nội dung text không được vượt quá 5000 ký tự']
    },
    tabs: [{
      type: String,
      trim: true,
      maxlength: [1000, 'Tab không được vượt quá 1000 ký tự']
    }],
    chords: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      fingering: {
        type: String,
        trim: true
      },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
      }
    }],
    strumPattern: {
      type: String,
      trim: true,
      maxlength: [200, 'Pattern không được vượt quá 200 ký tự']
    },
    videoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/.+\.(mp4|webm|ogg|avi|mov)$/i.test(v) || 
                 /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(v);
        },
        message: 'URL video không hợp lệ'
      }
    },
    audioUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/.+\.(mp3|wav|ogg|m4a)$/i.test(v);
        },
        message: 'URL audio không hợp lệ'
      }
    }
  },
  practice: {
    metronomeBpm: {
      type: Number,
      default: 120,
      min: 60,
      max: 200
    },
    minutes: {
      type: Number,
      default: 10,
      min: 1
    },
    checklist: [{
      type: String,
      trim: true,
      maxlength: [200, 'Checklist item không được vượt quá 200 ký tự']
    }]
  },
  assessment: {
    type: {
      type: String,
      enum: ['none', 'quiz', 'recording'],
      default: 'none'
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  order: {
    type: Number,
    required: [true, 'Thứ tự bài học là bắt buộc'],
    min: [1, 'Thứ tự bài học phải lớn hơn 0']
  }
}, {
  timestamps: true
});

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề module là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề module không được vượt quá 200 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Mô tả module không được vượt quá 1000 ký tự']
  },
  lessons: [lessonSchema],
  order: {
    type: Number,
    required: [true, 'Thứ tự module là bắt buộc'],
    min: [1, 'Thứ tự module phải lớn hơn 0']
  }
}, {
  timestamps: true
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề khóa học là bắt buộc'],
      trim: true,
      maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
    },
    slug: {
      type: String,
      required: [true, 'Slug là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ cái, số và dấu gạch ngang']
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [500, 'Tóm tắt không được vượt quá 500 ký tự']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Mô tả không được vượt quá 2000 ký tự']
    },
    durationWeeks: {
      type: Number,
      required: [true, 'Thời lượng khóa học là bắt buộc'],
      min: [1, 'Thời lượng phải ít nhất 1 tuần']
    },
    thumbnail: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'URL ảnh không hợp lệ'
      }
    },
    level: {
      type: String,
      enum: {
        values: ['beginner', 'intermediate', 'advanced'],
        message: 'Level phải là beginner, intermediate hoặc advanced'
      },
      default: 'beginner'
    },
    modules: [moduleSchema],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Interactive course features
    isInteractive: {
      type: Boolean,
      default: false
    },
    interactiveFeatures: {
      hasMetronome: {
        type: Boolean,
        default: false
      },
      hasPitchDetection: {
        type: Boolean,
        default: false
      },
      hasRealTimeFeedback: {
        type: Boolean,
        default: false
      },
      hasProgressTracking: {
        type: Boolean,
        default: false
      },
      hasExercises: {
        type: Boolean,
        default: false
      },
      hasGamification: {
        type: Boolean,
        default: false
      }
    },
    // Course settings
    courseSettings: {
      allowReplay: {
        type: Boolean,
        default: true
      },
      showProgress: {
        type: Boolean,
        default: true
      },
      enableComments: {
        type: Boolean,
        default: true
      },
      enableRating: {
        type: Boolean,
        default: true
      }
    },
    // Statistics
    stats: {
      totalViews: {
        type: Number,
        default: 0
      },
      totalCompletions: {
        type: Number,
        default: 0
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      totalRatings: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ level: 1 });
courseSchema.index({ isActive: 1 });
courseSchema.index({ createdBy: 1 });
courseSchema.index({ 'modules.title': 'text', 'modules.description': 'text' });
courseSchema.index({ 'modules.lessons.title': 'text' });

// Virtual for total lesson count across all modules
courseSchema.virtual('lessonCount').get(function() {
  if (!this.modules || this.modules.length === 0) return 0;
  return this.modules.reduce((total, module) => {
    return total + (module.lessons ? module.lessons.length : 0);
  }, 0);
});

// Virtual for module count
courseSchema.virtual('moduleCount').get(function() {
  return this.modules ? this.modules.length : 0;
});

// Virtual for total duration (if lessons have duration)
courseSchema.virtual('totalDuration').get(function() {
  if (!this.modules || this.modules.length === 0) return 0;
  return this.modules.reduce((total, module) => {
    if (!module.lessons) return total;
    return total + module.lessons.reduce((moduleTotal, lesson) => {
      return moduleTotal + (lesson.duration || 0);
    }, 0);
  }, 0);
});

// Pre-save middleware to sort modules and lessons by order
courseSchema.pre('save', function(next) {
  if (this.modules) {
    // Sort modules by order
    this.modules.sort((a, b) => a.order - b.order);
    
    // Sort lessons within each module by order
    this.modules.forEach(module => {
      if (module.lessons) {
        module.lessons.sort((a, b) => a.order - b.order);
      }
    });
  }
  next();
});

// Static method to find courses by level
courseSchema.statics.findByLevel = function(level) {
  return this.find({ level, isActive: true });
};

// Static method to search courses by title
courseSchema.statics.searchByTitle = function(searchTerm) {
  return this.find({
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'modules.title': { $regex: searchTerm, $options: 'i' } },
      { 'modules.lessons.title': { $regex: searchTerm, $options: 'i' } }
    ],
    isActive: true
  });
};

// Instance method to add module
courseSchema.methods.addModule = function(moduleData) {
  const newModule = {
    ...moduleData,
    order: this.modules.length + 1
  };
  this.modules.push(newModule);
  return this.save();
};

// Instance method to update module
courseSchema.methods.updateModule = function(moduleId, updateData) {
  const module = this.modules.id(moduleId);
  if (!module) {
    throw new Error('Module không tồn tại');
  }
  Object.assign(module, updateData);
  return this.save();
};

// Instance method to remove module
courseSchema.methods.removeModule = function(moduleId) {
  this.modules.pull(moduleId);
  return this.save();
};

// Instance method to add lesson to module
courseSchema.methods.addLessonToModule = function(moduleId, lessonData) {
  const module = this.modules.id(moduleId);
  if (!module) {
    throw new Error('Module không tồn tại');
  }
  
  const newLesson = {
    ...lessonData,
    order: module.lessons.length + 1
  };
  module.lessons.push(newLesson);
  return this.save();
};

// Instance method to update lesson in module
courseSchema.methods.updateLessonInModule = function(moduleId, lessonId, updateData) {
  const module = this.modules.id(moduleId);
  if (!module) {
    throw new Error('Module không tồn tại');
  }
  
  const lesson = module.lessons.id(lessonId);
  if (!lesson) {
    throw new Error('Bài học không tồn tại');
  }
  
  Object.assign(lesson, updateData);
  return this.save();
};

// Instance method to remove lesson from module
courseSchema.methods.removeLessonFromModule = function(moduleId, lessonId) {
  const module = this.modules.id(moduleId);
  if (!module) {
    throw new Error('Module không tồn tại');
  }
  
  module.lessons.pull(lessonId);
  return this.save();
};

// Interactive course methods
courseSchema.methods.enableInteractiveFeatures = function(features = {}) {
  this.isInteractive = true;
  this.interactiveFeatures = {
    hasMetronome: features.hasMetronome || false,
    hasPitchDetection: features.hasPitchDetection || false,
    hasRealTimeFeedback: features.hasRealTimeFeedback || false,
    hasProgressTracking: features.hasProgressTracking || false,
    hasExercises: features.hasExercises || false,
    hasGamification: features.hasGamification || false
  };
  return this.save();
};

courseSchema.methods.updateStats = function(stats) {
  if (stats.views) this.stats.totalViews += stats.views;
  if (stats.completion) this.stats.totalCompletions += 1;
  if (stats.rating) {
    const newTotalRatings = this.stats.totalRatings + 1;
    const newAverageRating = ((this.stats.averageRating * this.stats.totalRatings) + stats.rating) / newTotalRatings;
    this.stats.totalRatings = newTotalRatings;
    this.stats.averageRating = Math.round(newAverageRating * 10) / 10;
  }
  return this.save();
};

courseSchema.methods.addInteractiveLesson = function(moduleId, lessonData) {
  const module = this.modules.id(moduleId);
  if (!module) {
    throw new Error('Module không tồn tại');
  }
  
  const newLesson = {
    ...lessonData,
    order: module.lessons.length + 1,
    interactiveFeatures: {
      hasMetronome: lessonData.interactiveFeatures?.hasMetronome || false,
      hasPitchDetection: lessonData.interactiveFeatures?.hasPitchDetection || false,
      hasRealTimeFeedback: lessonData.interactiveFeatures?.hasRealTimeFeedback || false,
      hasProgressTracking: lessonData.interactiveFeatures?.hasProgressTracking || false,
      hasExercises: lessonData.interactiveFeatures?.hasExercises || false
    },
    practiceSettings: {
      defaultBpm: lessonData.practiceSettings?.defaultBpm || 120,
      difficulty: lessonData.practiceSettings?.difficulty || 'beginner',
      estimatedDuration: lessonData.practiceSettings?.estimatedDuration || 10
    }
  };
  
  module.lessons.push(newLesson);
  return this.save();
};

// Static method to find interactive courses
courseSchema.statics.findInteractiveCourses = function() {
  return this.find({ isInteractive: true, isActive: true });
};

// Static method to find courses by interactive features
courseSchema.statics.findByInteractiveFeatures = function(features) {
  const query = { isActive: true };
  
  if (features.hasMetronome) {
    query['interactiveFeatures.hasMetronome'] = true;
  }
  if (features.hasPitchDetection) {
    query['interactiveFeatures.hasPitchDetection'] = true;
  }
  if (features.hasRealTimeFeedback) {
    query['interactiveFeatures.hasRealTimeFeedback'] = true;
  }
  if (features.hasExercises) {
    query['interactiveFeatures.hasExercises'] = true;
  }
  
  return this.find(query);
};

// Virtual for interactive lesson count
courseSchema.virtual('interactiveLessonCount').get(function() {
  if (!this.modules || this.modules.length === 0) return 0;
  return this.modules.reduce((total, module) => {
    if (!module.lessons) return total;
    return total + module.lessons.filter(lesson => 
      lesson.interactiveFeatures && Object.values(lesson.interactiveFeatures).some(feature => feature === true)
    ).length;
  }, 0);
});

// Virtual for course completion rate
courseSchema.virtual('completionRate').get(function() {
  if (this.stats.totalViews === 0) return 0;
  return Math.round((this.stats.totalCompletions / this.stats.totalViews) * 100);
});

export default mongoose.model('Course', courseSchema);
