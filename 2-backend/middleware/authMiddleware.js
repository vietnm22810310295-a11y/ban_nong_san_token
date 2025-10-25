const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Middleware xác thực JWT token
const authMiddleware = async (req, res, next) => {
  try {
    // Lấy token từ header
    const token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không tìm thấy token. Truy cập bị từ chối.' 
      });
    }

    // Loại bỏ "Bearer " nếu có
    const actualToken = token.replace('Bearer ', '');
    
    // Xác thực token
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    
    // Tìm user bằng walletAddress từ token
    const user = await User.findOne({ walletAddress: decoded.walletAddress });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ - User không tồn tại' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tài khoản đã bị vô hiệu hóa' 
      });
    }

    // Thêm user vào request để sử dụng trong controllers
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token không hợp lệ' 
    });
  }
};

// Middleware xác thực tùy chọn (không bắt buộc đăng nhập)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    
    if (token) {
      const actualToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
      const user = await User.findOne({ walletAddress: decoded.walletAddress });
      req.user = user;
    }
    
    next();
  } catch (error) {
    next(); // Vẫn tiếp tục dù token lỗi
  }
};

module.exports = { authMiddleware, optionalAuth };