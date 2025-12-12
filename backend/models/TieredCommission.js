import mongoose from 'mongoose';

const tieredCommissionSchema = new mongoose.Schema({
  // Tiers for send-money transactions
  // Each tier has a minimum amount threshold and separate agent/company commission percentages
  tiers: [
    {
      minAmount: {
        type: Number,
        required: true,
        default: 0
      },
      agentPercent: {
        type: Number,
        required: true,
        default: 0
      },
      companyPercent: {
        type: Number,
        required: true,
        default: 0
      }
    }
  ],
  // Tiers for withdrawal transactions
  withdrawalTiers: [
    {
      minAmount: {
        type: Number,
        required: true,
        default: 0
      },
      agentPercent: {
        type: Number,
        required: true,
        default: 0
      },
      companyPercent: {
        type: Number,
        required: true,
        default: 0
      }
    }
  ],
  type: {
    type: String,
    enum: ['send-money', 'withdraw'],
    default: 'send-money'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('TieredCommission', tieredCommissionSchema);
