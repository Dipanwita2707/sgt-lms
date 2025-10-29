const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  contentBlock: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentBlock' },
  sequence: { type: Number, default: 1 }, // Sequence within unit or content block
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  videoUrl: { type: String, required: true },
  duration: { type: Number }, // Duration in seconds
  resourceFiles: [{ type: String }],
  warned: { type: Boolean, default: false },
  watchRecords: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timeSpent: { type: Number, default: 0 },
    lastWatched: { type: Date },
    completed: { type: Boolean, default: false }
  }],
  analytics: {
    totalViews: { type: Number, default: 0 },
    totalWatchTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    lastUpdated: { type: Date }
  },
  // To mark which video should have a quiz after it
  hasQuizAfter: { type: Boolean, default: false },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }
}, { timestamps: true });

// Create indexes for common queries
videoSchema.index({ course: 1 });
videoSchema.index({ unit: 1 });
videoSchema.index({ teacher: 1 });

// Add a pre-save middleware to ensure sequence is set
videoSchema.pre('save', async function(next) {
  // If this is a new video and sequence isn't explicitly set
  if (this.isNew && this.sequence === 1) {
    try {
      let maxSequence = 1;
      
      // If this video belongs to a unit, find the highest sequence in that unit
      if (this.unit) {
        const Video = mongoose.model('Video');
        const videos = await Video.find({ unit: this.unit })
          .sort('-sequence')
          .limit(1);
          
        if (videos.length > 0) {
          maxSequence = videos[0].sequence + 1;
        }
      } else if (this.course) {
        // Otherwise, find the highest sequence in the course
        const Video = mongoose.model('Video');
        const videos = await Video.find({ 
          course: this.course,
          unit: { $exists: false }
        })
        .sort('-sequence')
        .limit(1);
        
        if (videos.length > 0) {
          maxSequence = videos[0].sequence + 1;
        }
      }
      
      this.sequence = maxSequence;
    } catch (err) {
      console.error('Error setting video sequence:', err);
    }
  }
  
  next();
});

module.exports = mongoose.model('Video', videoSchema);
