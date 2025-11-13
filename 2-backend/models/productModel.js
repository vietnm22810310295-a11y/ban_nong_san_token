const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    blockchainId: {
      type: Number,
      required: [true, 'Blockchain ID là bắt buộc'],
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên sản phẩm'],
      trim: true,
      maxlength: [100, 'Tên sản phẩm không quá 100 ký tự']
    },
    productType: {
      type: String,
      required: [true, 'Vui lòng chọn loại sản phẩm'],
      enum: {
        values: ['lúa', 'cà phê', 'tiêu', 'điều', 'trái cây', 'rau củ', 'khác'],
        message: 'Loại sản phẩm không hợp lệ'
      }
    },
    description: {
      type: String,
      maxlength: [1000, 'Mô tả không quá 1000 ký tự'],
      trim: true
    },
    harvestDate: {
      type: Date,
      required: [true, 'Vui lòng nhập ngày thu hoạch'],
      validate: {
        validator: function(date) {
          return date <= new Date();
        },
        message: 'Ngày thu hoạch không thể ở tương lai'
      }
    },
    region: {
      type: String,
      required: [true, 'Vui lòng nhập vùng trồng'],
      trim: true
    },
    farmName: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá ETH'],
      min: [0, 'Giá không thể âm'],
      max: [1000000, 'Giá quá lớn']
    },
    // Giá VND (cho thanh toán VNPAY/Tiền mặt)
    priceVND: {
      type: Number,
      required: [true, 'Vui lòng nhập giá VND'],
      min: [1000, 'Giá VND tối thiểu là 1,000đ'], 
    },
    isOrganic: {
      type: Boolean,
      default: false
    },
    images: [{
      type: String
    }],
    certifications: [{
      type: String
    }],
    farmerWallet: {
      type: String,
      required: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Địa chỉ ví không hợp lệ']
    },
    currentOwner: {
      type: String,
      required: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Địa chỉ ví không hợp lệ']
    },
    // --- QUẢN LÝ SỐ LƯỢNG (TỒN KHO) ---
    quantity: {
      type: Number,
      default: 1,
      min: [0, 'Số lượng không được âm'] // Cho phép về 0 (hết hàng)
    },
    unit: {
      type: String,
      default: 'kg',
      enum: ['kg', 'tấn', 'tạ', 'bao', 'lô']
    },
    isSold: {
      type: Boolean,
      default: false
    },
    // --- QUẢN LÝ DUYỆT BÀI (ADMIN) ---
    // Tách riêng status duyệt khỏi status giao dịch để tránh lỗi logic cũ
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending' // Mặc định đăng lên là Chờ duyệt, chưa hiện trang chủ
    },
    // Status giao dịch (Giữ nguyên logic cũ của bạn)
    status: {
      type: String,
      enum: ['available', 'sold', 'pending', 'refund-requested', 'refunded', 'cash-pending'],
      default: 'available'
    },
    refundReason: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
productSchema.index({ farmerWallet: 1 });
productSchema.index({ productType: 1 });
productSchema.index({ isSold: 1 });
productSchema.index({ region: 1 });
productSchema.index({ approvalStatus: 1 }); // Index mới để lọc bài đã duyệt nhanh
productSchema.index({ createdAt: -1 });
productSchema.index({ price: 1 });

// Virtual cho số ngày từ khi thu hoạch
productSchema.virtual('daysSinceHarvest').get(function() {
  return Math.floor((new Date() - this.harvestDate) / (1000 * 60 * 60 * 24));
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;