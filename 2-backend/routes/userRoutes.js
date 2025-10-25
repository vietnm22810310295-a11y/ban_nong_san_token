const express = require('express');
const { 
  registerUser, 
  loginUser,
  getUserProfile, 
  getUsers,
  updateUserProfile,
  updateUserRole,
  toggleUserActive,
  getOverviewStats
} = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ======================================
// PUBLIC ROUTES (Không cần xác thực)
// ======================================

/**
 * @route   POST /api/users/register
 * @desc    Đăng ký user mới
 * @access  Public
 * @body    { walletAddress, name, email, role, phone, address }
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/users/login
 * @desc    Đăng nhập với wallet address
 * @access  Public
 * @body    { walletAddress }
 */
router.post('/login', loginUser);

// ======================================
// PROTECTED ROUTES (Cần xác thực JWT)
// ======================================

/**
 * @route   GET /api/users/profile
 * @desc    Lấy thông tin profile của user hiện tại
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/profile', authMiddleware, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Cập nhật thông tin profile của user hiện tại
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    { name, email, phone, address }
 */
router.put('/profile', authMiddleware, updateUserProfile);

/**
 * @route   GET /api/users
 * @desc    Lấy danh sách tất cả users (Chỉ Admin)
 * @access  Private (Admin only)
 * @header  Authorization: Bearer <token>
 * @query   { page, limit, role, search, isActive }
 */
router.get('/', authMiddleware, getUsers);

/**
 * @route   GET /api/users/stats/overview
 * @desc    Lấy thống kê tổng quan hệ thống (Chỉ Admin)
 * @access  Private (Admin only)
 * @header  Authorization: Bearer <token>
 */
router.get('/stats/overview', authMiddleware, getOverviewStats);

/**
 * @route   PUT /api/users/:walletAddress/role
 * @desc    Cập nhật role của user (Chỉ Admin)
 * @access  Private (Admin only)
 * @header  Authorization: Bearer <token>
 * @param   :walletAddress - Địa chỉ ví của user cần update
 * @body    { role } - farmer, buyer, admin
 */
router.put('/:walletAddress/role', authMiddleware, updateUserRole);

/**
 * @route   PUT /api/users/:walletAddress/active
 * @desc    Kích hoạt/vô hiệu hóa user (Chỉ Admin)
 * @access  Private (Admin only)
 * @header  Authorization: Bearer <token>
 * @param   :walletAddress - Địa chỉ ví của user cần update
 * @body    { isActive } - true/false
 */
router.put('/:walletAddress/active', authMiddleware, toggleUserActive);

module.exports = router;