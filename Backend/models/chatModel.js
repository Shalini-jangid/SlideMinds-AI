const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: String,
    required: true,
    unique: true  // This already creates an index
  },
  title: {
    type: String,
    required: true,
    default: 'New Presentation'
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    pptData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isError: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
chatSchema.index({ userId: 1, updatedAt: -1 });
// Remove this line - chatId already has unique: true which creates an index
// chatSchema.index({ chatId: 1 });  ← DELETE THIS LINE

module.exports = mongoose.model('Chat', chatSchema);