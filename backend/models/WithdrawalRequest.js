import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  agentCommission: {
    type: Number,
    default: 0
  },
  agentCommissionPercent: {
    type: Number,
    default: 0
  },
  // company commission for this withdrawal request
  companyCommission: {
    type: Number,
    default: 0
  },
  companyCommissionPercent: {
    type: Number,
    default: 0
  },
  // Legacy fields for backwards compatibility
  commission: {
    type: Number,
    default: 0
  },
  commissionPercent: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  reason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  rejectedAt: Date
});

export default mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
