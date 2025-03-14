import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan'
  },
  messages: [{
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  title: {
    type: String,
    default: 'New Chat'
  },
  last_message: {
    type: String
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
chatSchema.index({ user_id: 1, created_at: -1 });
chatSchema.index({ scan_id: 1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat; 