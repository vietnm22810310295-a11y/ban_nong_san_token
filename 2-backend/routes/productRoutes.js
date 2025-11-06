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
  // [THÊM MỚI] Hai hàm cho chức năng Tiền Mặt
  requestCashPurchase,
  confirmCashPurchase
} = require('../controllers/productController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// === CÁC ROUTE CÔNG KHAI ===
router.get('/', optionalAuth, getProducts);
router.get('/types', getProductTypes);
router.get('/regions', getProductRegions);
// Route này dùng [blockchainId]
router.get('/:id', getProduct); 

// === CÁC ROUTE BẢO MẬT ===
router.post('/', authMiddleware, createProduct);
router.get('/farmer/my-products', authMiddleware, getFarmerProducts);

// Route dùng [_id] (MongoDB ID)
router.put('/update/:mongoId', authMiddleware, updateProduct); 
router.delete('/delete/:mongoId', authMiddleware, deleteProduct);

// Routes cho Lịch sử mua hàng và Hoàn tiền (Buyer)
router.get('/buyer/my-purchases', authMiddleware, getMyPurchases);
router.post('/request-refund/:mongoId', authMiddleware, requestRefund);
// Routes cho Lịch sử mua hàng và Hoàn tiền (Farmer)
router.post('/approve-refund/:mongoId', authMiddleware, approveRefund);

// [THÊM MỚI] - Routes cho Mua Tiền Mặt
// Dành cho Buyer (Người mua)
router.post('/request-cash/:mongoId', authMiddleware, requestCashPurchase);
// Dành cho Farmer (Người bán)
router.post('/confirm-cash/:mongoId', authMiddleware, confirmCashPurchase);

module.exports = router;