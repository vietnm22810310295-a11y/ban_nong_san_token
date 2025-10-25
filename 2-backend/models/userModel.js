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
    sparse: true,
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
  timestamps: true
});

// CHỈ DÙNG 1 CÁCH TẠO INDEX - XÓA DÒNG NÀY NẾU ĐÃ CÓ "unique: true"
// userSchema.index({ walletAddress: 1 }); // XÓA DÒNG NÀY
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;