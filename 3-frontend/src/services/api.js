import axios from 'axios';

// Base URL cho API backend (Link ngrok của bạn)
const API_BASE_URL = 'https://tearful-florencia-nonnegligibly.ngrok-free.dev/api';

// Tạo instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // [SỬA] Tăng lên 30 giây để tránh lỗi timeout khi mạng chậm hoặc ngrok lag
  headers: {
    'Content-Type': 'application/json',
    // [QUAN TRỌNG] Header này giúp bỏ qua trang cảnh báo của Ngrok (tránh lỗi trả về HTML)
    'ngrok-skip-browser-warning': 'true', 
  },
});

// Interceptor để tự động thêm token vào headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý lỗi phản hồi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý lỗi 401 (Unauthorized) - Token hết hạn hoặc không hợp lệ
    if (error.response?.status === 401) {
      // Kiểm tra nếu không phải đang ở trang login thì mới redirect để tránh loop vô tận
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Sử dụng window.location để reload sạch state
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- User API calls ---
export const userAPI = {
  register: (userData) => api.post('/users/register', userData),
  login: (walletAddress) => api.post('/users/login', { walletAddress }),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
};

// --- Product API calls ---
export const productAPI = {
  // Lấy tất cả sản phẩm (cho Marketplace)
  getProducts: (params = {}) => api.get('/products', { params }),
  
  // Lấy chi tiết 1 sản phẩm
  getProduct: (id) => api.get(`/products/${id}`), 
  
  // Tạo sản phẩm mới
  createProduct: (productData) => api.post('/products', productData),
  
  // [LƯU Ý] Kiểm tra kỹ Route bên Backend. 
  // Nếu Backend là router.get('/my-products', ...) nằm trong file productRoutes
  // Thì đường dẫn này đúng nếu file server.js khai báo app.use('/api/products/farmer', ...)
  // Nếu server.js khai báo app.use('/api/products', ...) thì đường dẫn dưới này phải sửa thành '/products/my-products' hoặc '/products/farmer-products' tùy backend.
  getMyProducts: () => api.get('/products/farmer/my-products'), 

  // Update & Delete
  updateProduct: (mongoId, productData) => api.put(`/products/update/${mongoId}`, productData),
  deleteProduct: (mongoId) => api.delete(`/products/delete/${mongoId}`),
  
  // Metadata
  getProductTypes: () => api.get('/products/types'),
  getProductRegions: () => api.get('/products/regions'),
  
  // API cho Lịch sử mua hàng và Hoàn tiền
  getMyPurchases: () => api.get('/products/buyer/my-purchases'),
  requestRefund: (mongoId, reason) => api.post(`/products/request-refund/${mongoId}`, { reason }),
  approveRefund: (mongoId) => api.post(`/products/approve-refund/${mongoId}`),

  // API cho Mua tiền mặt
  requestCashPurchase: (mongoId) => api.post(`/products/request-cash/${mongoId}`),
  confirmCashPurchase: (mongoId) => api.post(`/products/confirm-cash/${mongoId}`),
};

// --- Payment API calls (VNPAY) ---
export const paymentAPI = {
  createPaymentUrl: (payload) => api.post('/payment/create_payment_url', payload),
};

export default api;