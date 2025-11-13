const express = require('express');
const { 
  getProducts, 
  getProduct, 
  createProduct, 
  getFarmerProducts,
  updateProduct,
  deleteProduct,
  getProductTypes,
  getProductRegions,
  // Hàm hoàn tiền
  getMyPurchases,
  requestRefund,
  approveRefund,
  // Hàm Tiền Mặt
  requestCashPurchase,
  confirmCashPurchase,
  // Hàm Admin
  getPendingProducts,
  approveProduct,
  // [MỚI] Hàm lấy danh sách hoàn tiền cho Farmer
  getFarmerRefundRequests
} = require('../controllers/productController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// === CÁC ROUTE ADMIN (Phải đặt trước /:id) ===
// Xem danh sách chờ duyệt
router.get('/admin/pending', authMiddleware, getPendingProducts);
// Duyệt hoặc Từ chối
router.put('/admin/approve/:mongoId', authMiddleware, approveProduct);

// === CÁC ROUTE CÔNG KHAI ===
router.get('/', optionalAuth, getProducts);
router.get('/types', getProductTypes);
router.get('/regions', getProductRegions);

// === CÁC ROUTE BẢO MẬT (FARMER & BUYER) ===
router.post('/', authMiddleware, createProduct);

// Nhóm Route cho Farmer
router.get('/farmer/my-products', authMiddleware, getFarmerProducts);
// [MỚI] Route lấy danh sách yêu cầu hoàn tiền (dựa trên Order)
router.get('/farmer/refund-requests', authMiddleware, getFarmerRefundRequests);

// Route dùng [_id] (MongoDB ID)
router.put('/update/:mongoId', authMiddleware, updateProduct); 
router.delete('/delete/:mongoId', authMiddleware, deleteProduct);

// Routes cho Lịch sử mua hàng và Hoàn tiền (Buyer)
router.get('/buyer/my-purchases', authMiddleware, getMyPurchases);
router.post('/request-refund/:mongoId', authMiddleware, requestRefund);

// Routes cho Lịch sử mua hàng và Hoàn tiền (Farmer)
router.post('/approve-refund/:mongoId', authMiddleware, approveRefund);

// Routes cho Mua Tiền Mặt
router.post('/request-cash/:mongoId', authMiddleware, requestCashPurchase);
router.post('/confirm-cash/:mongoId', authMiddleware, confirmCashPurchase);

// Route này dùng [blockchainId] hoặc [mongoId] (Đặt cuối cùng để tránh trùng lặp)
router.get('/:id', getProduct); 

module.exports = router;