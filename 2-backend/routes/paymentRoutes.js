const express = require('express');
const router = express.Router();
const { createPaymentUrl } = require('../controllers/paymentController');

// POST /api/payment/create_payment_url
router.post('/create_payment_url', createPaymentUrl);

module.exports = router;