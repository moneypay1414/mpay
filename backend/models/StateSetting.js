import mongoose from 'mongoose';

const stateSettingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  commissionPercent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('StateSetting', stateSettingSchema);
