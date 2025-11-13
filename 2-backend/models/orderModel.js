const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: {
    type: String, // Wallet address của người mua
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // Link sang bảng Product để lấy tên, ảnh...
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: { // Tổng tiền (ETH)
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['crypto', 'cash', 'vnpay'],
    default: 'crypto'
  },
  txHash: {
    type: String,
    default: null
  },
  // [CẬP NHẬT] Thêm các trạng thái liên quan đến Hoàn tiền
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled', 'refund-requested', 'refunded'],
    default: 'completed'
  },
  // [THÊM MỚI] Lý do hoàn tiền (Lưu tại Đơn hàng để không ảnh hưởng đơn khác)
  refundReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;