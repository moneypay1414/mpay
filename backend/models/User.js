import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  // If true, admins can cash out from this agent without asking for agent approval
  autoAdminCashout: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'agent', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  verificationCode: String,
  verificationExpiry: Date,
  profileImage: String,
  idNumber: String,
  agentId: {
    type: String,
    unique: true,
    sparse: true,
    default: undefined
  },
  adminId: {
    type: String,
    unique: true,
    sparse: true,
    default: undefined
  },
  // Optional reference to a StateSetting (admin's assigned state)
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StateSetting',
    default: undefined
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    city: String,
    country: String,
    timestamp: Date
  },
  // When true, admin has indicated users should use server-provided or IP-based location
  adminLocationConsent: {
    type: Boolean,
    default: false
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
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

// Normalize empty strings to undefined before saving so sparse unique indexes ignore missing values
userSchema.pre('save', function (next) {
  if (this.agentId === '') this.agentId = undefined;
  if (this.adminId === '') this.adminId = undefined;
  next();
});

export default mongoose.model('User', userSchema);
