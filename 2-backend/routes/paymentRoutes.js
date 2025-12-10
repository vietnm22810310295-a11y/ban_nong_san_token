const express = require('express');
const router = express.Router();
const { createPaymentUrl, vnpayReturn } = require('../controllers/paymentController');

// POST /api/payment/create_payment_url
router.post('/create_payment_url', createPaymentUrl);

// [MỚI] POST /api/payment/vnpay_return (Frontend gọi cái này sau khi VNPAY redirect về)
router.post('/vnpay_return', vnpayReturn);

module.exports = router;