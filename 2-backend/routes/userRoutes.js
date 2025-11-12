const express = require('express');
const router = express.Router();

// Import Middleware xác thực
const { authMiddleware } = require('../middleware/authMiddleware');

// Import các Controller
const { 
  registerUser, 
  loginUser,
  getUserProfile, 
  updateUserProfile, // [ĐÃ THÊM] Hàm cập nhật thông tin
  getUsers,
  updateUserRole,
  toggleUserActive,
  getOverviewStats
} = require('../controllers/userController');

// ======================================
// PUBLIC ROUTES (Ai cũng truy cập được)
// ======================================

/**
 * @route   POST /api/users/register
 * @desc    Đăng ký user mới
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/users/login
 * @desc    Đăng nhập (Wallet/Email)
 */
router.post('/login', loginUser);

// ======================================
// PRIVATE ROUTES (Cần đăng nhập)
// ======================================

/**
 * @route   GET /api/users/profile
 * @desc    Xem thông tin cá nhân
 */
router.get('/profile', authMiddleware, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Cập nhật thông tin cá nhân (Tên, Email, SĐT)
 */
router.put('/profile', authMiddleware, updateUserProfile);

// ======================================
// ADMIN ROUTES (Chỉ dành cho Admin)
// ======================================

/**
 * @route   GET /api/users
 * @desc    Lấy danh sách tất cả users
 */
router.get('/', authMiddleware, getUsers);

/**
 * @route   GET /api/users/stats/overview
 * @desc    Thống kê hệ thống
 */
router.get('/stats/overview', authMiddleware, getOverviewStats);

/**
 * @route   PUT /api/users/:walletAddress/role
 * @desc    Thay đổi quyền hạn user
 */
router.put('/:walletAddress/role', authMiddleware, updateUserRole);

/**
 * @route   PUT /api/users/:walletAddress/active
 * @desc    Khóa/Mở khóa tài khoản
 */
router.put('/:walletAddress/active', authMiddleware, toggleUserActive);

module.exports = router;