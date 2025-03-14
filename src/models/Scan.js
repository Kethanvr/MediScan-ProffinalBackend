import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicine_name: {
    type: String,
    required: true
  },
  ingredients: {
    type: [String],
    default: []
  },
  uses: {
    type: String
  },
  warnings: {
    type: String
  },
  scan_data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  image_url: {
    type: String,
    required: true
  }
}, {
  timestamps: true // This will add created_at and updated_at fields
});

// Add indexes for better query performance
scanSchema.index({ user_id: 1, created_at: -1 });
scanSchema.index({ medicine_name: 'text' }); // Enable text search on medicine name

const Scan = mongoose.model('Scan', scanSchema);

export default Scan; 