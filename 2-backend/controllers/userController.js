const User = require('../models/userModel');
const Product = require('../models/productModel');
const jwt = require('jsonwebtoken');

// Tạo JWT token
const generateToken = (walletAddress) => {
  return jwt.sign({ walletAddress }, process.env.JWT_SECRET, { 
    expiresIn: '30d'
  });
};

// @desc    Đăng ký user mới
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { walletAddress, name, email, role, phone, address } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!walletAddress || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address, tên và vai trò là bắt buộc'
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ ví không hợp lệ'
      });
    }

    // Kiểm tra role hợp lệ
    if (!['farmer', 'buyer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò phải là farmer, buyer hoặc admin'
      });
    }

    // Validate email format
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không hợp lệ'
      });
    }

    // Kiểm tra user đã tồn tại chưa
    const userExists = await User.findOne({ 
      $or: [
        { walletAddress: walletAddress.toLowerCase() },
        { email: email?.toLowerCase() }
      ]
    });

    if (userExists) {
      if (userExists.walletAddress === walletAddress.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address đã được sử dụng'
        });
      }
      if (userExists.email === email?.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }
    }

    // Tạo user mới
    const user = await User.create({
      walletAddress: walletAddress.toLowerCase(),
      name: name.trim(),
      email: email?.toLowerCase(),
      role,
      phone: phone?.trim(),
      address: address?.trim()
    });

    // Tạo token
    const token = generateToken(user.walletAddress);

    // Trả về response
    res.status(201).json({
      success: true,
      message: 'Đăng ký user thành công',
      data: {
        _id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        isActive: user.isActive,
        token: token
      }
    });

  } catch (error) {
    console.error('Register user error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ: ' + messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Đăng nhập với wallet address - SỬA LẠI: YÊU CẦU ĐĂNG KÝ TRƯỚC
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    console.log('🔐 Login attempt for wallet:', walletAddress);

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address là bắt buộc'
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ ví không hợp lệ'
      });
    }

    // Tìm user - KHÔNG TỰ TẠO MỚI NỮA
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    // 🎯 QUAN TRỌNG: User phải đăng ký trước
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User chưa đăng ký. Vui lòng đăng ký tài khoản trước.',
        requiresRegistration: true // Thêm flag để frontend biết
      });
    }

    // Kiểm tra user có active không
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Tạo token mới
    const token = generateToken(user.walletAddress);

    console.log('✅ Login successful for:', walletAddress, 'Role:', user.role);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: {
          _id: user._id,
          walletAddress: user.walletAddress,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        token: token
      }
    });

  } catch (error) {
    console.error('❌ Login user error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ: ' + messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy thông tin user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    // Lấy thống kê nếu là farmer
    let stats = {};
    if (user.role === 'farmer') {
      const productStats = await Product.aggregate([
        { $match: { farmerWallet: user.walletAddress } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$price' }
          }
        }
      ]);

      stats = {
        totalProducts: await Product.countDocuments({ farmerWallet: user.walletAddress }),
        availableProducts: await Product.countDocuments({ 
          farmerWallet: user.walletAddress, 
          status: 'available' 
        }),
        soldProducts: await Product.countDocuments({ 
          farmerWallet: user.walletAddress, 
          status: 'sold' 
        }),
        productStats
      };
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stats
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy tất cả users (chỉ admin)
// @route   GET /api/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập'
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      role, 
      search,
      isActive 
    } = req.query;

    // Tạo filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { walletAddress: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Cập nhật user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Kiểm tra email đã được sử dụng chưa
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        walletAddress: { $ne: req.user.walletAddress }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }
    }

    const updateData = {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.toLowerCase() }),
      ...(phone && { phone: phone.trim() }),
      ...(address && { address: address.trim() }),
      updatedAt: new Date()
    };

    const user = await User.findOneAndUpdate(
      { walletAddress: req.user.walletAddress },
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: {
        _id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ: ' + messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Cập nhật user role (admin only)
// @route   PUT /api/users/:walletAddress/role
// @access  Private (Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { role } = req.body;

    // Kiểm tra admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền này'
      });
    }

    if (!['farmer', 'buyer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ'
      });
    }

    // Không cho phép tự đổi role của chính mình
    if (walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể thay đổi role của chính mình'
      });
    }

    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { role, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật role thành công',
      data: {
        walletAddress: user.walletAddress,
        name: user.name,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Toggle user active status (admin only)
// @route   PUT /api/users/:walletAddress/active
// @access  Private (Admin only)
const toggleUserActive = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { isActive } = req.body;

    // Kiểm tra admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền này'
      });
    }

    // Không cho phép tự vô hiệu hóa tài khoản của chính mình
    if (walletAddress.toLowerCase() === req.user.walletAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể vô hiệu hóa tài khoản của chính mình'
      });
    }

    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { isActive, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    res.json({
      success: true,
      message: `User đã được ${isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
      data: {
        walletAddress: user.walletAddress,
        name: user.name,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Toggle user active error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy thống kê tổng quan (admin only)
// @route   GET /api/users/stats/overview
// @access  Private (Admin only)
const getOverviewStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập'
      });
    }

    const [userStats, productStats, recentUsers] = await Promise.all([
      // Thống kê users
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]),
      // Thống kê products
      Product.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$price' }
          }
        }
      ]),
      // Users mới nhất
      User.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name walletAddress role createdAt')
    ]);

    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        activeUsers,
        userStats,
        productStats,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Get overview stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getUsers,
  updateUserProfile,
  updateUserRole,
  toggleUserActive,
  getOverviewStats
};