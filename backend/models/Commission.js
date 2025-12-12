import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema({
  percent: {
    type: Number,
    required: true,
    default: 0
  },
  // Company fee percentage for send (transfers)
  sendPercent: {
    type: Number,
    required: false,
    default: 0
  },
  // Company fee percentage for withdrawal operations
  withdrawPercent: {
    type: Number,
    required: false,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Commission', commissionSchema);
