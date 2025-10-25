const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Thêm options để fix lỗi kết nối
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout sau 5 giây
      socketTimeoutMS: 45000, // Socket timeout
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('💡 Hãy đảm bảo MongoDB đang chạy trên port 27017');
    process.exit(1);
  }
};

module.exports = connectDB;