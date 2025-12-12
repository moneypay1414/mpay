import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['transfer', 'topup', 'withdrawal', 'user_withdraw', 'agent_deposit', 'agent_cash_out_money', 'admin_push', 'admin_state_push', 'money_exchange'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: String,
  commission: {
    type: Number,
    default: 0
  },
  commissionPercent: {
    type: Number,
    default: 0
  },
  // Agent commission (amount paid to the agent for this transaction)
  agentCommission: {
    type: Number,
    default: 0
  },
  agentCommissionPercent: {
    type: Number,
    default: 0
  },
  // Company commission (fee) collected for this transaction
  companyCommission: {
    type: Number,
    default: 0
  },
  companyCommissionPercent: {
    type: Number,
    default: 0
  },
  // Amount the receiver should be credited when a pending transaction is completed
  receiverCredit: {
    type: Number,
    default: null
  },
  // Currency information for the transaction (selected by admin)
  currencyCode: { type: String },
  currencySymbol: { type: String },
  exchangeRate: { type: Number, default: 1 },
  currencyTier: { type: String },
  senderBalance: Number,
  receiverBalance: Number,
  senderLocation: {
    latitude: Number,
    longitude: Number,
    city: String,
    country: String
  },
  receiverLocation: {
    latitude: Number,
    longitude: Number,
    city: String,
    country: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Transaction', transactionSchema);
