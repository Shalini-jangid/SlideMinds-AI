const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,  // This already creates an index
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: String,
    default: null
  },
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

// Remove this line - email already has unique: true which creates an index
// userSchema.index({ email: 1 });  ← DELETE THIS LINE

module.exports = mongoose.model('User', userSchema);