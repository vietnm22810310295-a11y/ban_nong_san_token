const express = require('express');
const { 
  getProducts, 
  getProduct, 
  createProduct, 
  getFarmerProducts,
  updateProduct,
  deleteProduct,
  getProductTypes,
  getProductRegions
} = require('../controllers/productController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getProducts);
router.get('/types', getProductTypes);
router.get('/regions', getProductRegions);
router.get('/:id', getProduct);

// Protected routes
router.post('/', authMiddleware, createProduct);
router.get('/farmer/my-products', authMiddleware, getFarmerProducts);
router.put('/:id', authMiddleware, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;