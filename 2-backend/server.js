const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Kết nối database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
// [THÊM MỚI] Thêm route cho VNPAY
app.use('/api/payment', require('./routes/paymentRoutes'));

// Route chính
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Nông Sản Blockchain API is running!',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      products: '/api/products',
      payment: '/api/payment' // [THÊM MỚI]
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại: ' + req.originalUrl
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Lỗi server nội bộ: ' + error.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 NÔNG SẢN BLOCKCHAIN BACKEND');
  console.log('=================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: Connected`); // Ẩn MONGODB_URI khỏi log cho an toàn
  console.log(`⚡ Server: http://localhost:${PORT}`);
  console.log('=================================');
});