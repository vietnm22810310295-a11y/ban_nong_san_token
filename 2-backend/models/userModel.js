const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: [true, 'Wallet address là bắt buộc'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Tên là bắt buộc'],
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Cho phép nhiều 'null' nhưng email phải là duy nhất
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['farmer', 'buyer', 'admin'],
    required: [true, 'Vai trò là bắt buộc']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// Index để tìm kiếm nhanh theo vai trò
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;