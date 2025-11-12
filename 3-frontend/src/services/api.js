import axios from 'axios';

// Base URL cho API backend
const API_BASE_URL = 'http://localhost:5000/api';

// Tạo instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

// Interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn, xóa và chuyển về login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// User API calls
export const userAPI = {
  register: (userData) => api.post('/users/register', userData),
  login: (walletAddress) => api.post('/users/login', { walletAddress }),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
};

// Product API calls
export const productAPI = {
  getProducts: (params = {}) => api.get('/products', { params }),
  // Route này dùng [blockchainId]
  getProduct: (id) => api.get(`/products/${id}`), 
  createProduct: (productData) => api.post('/products', productData),
  getMyProducts: () => api.get('/products/farmer/my-products'), // Của Farmer
  updateProduct: (mongoId, productData) => api.put(`/products/update/${mongoId}`, productData),
  deleteProduct: (mongoId) => api.delete(`/products/delete/${mongoId}`),
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

// [SỬA] Payment API calls (VNPAY)
export const paymentAPI = {
  // Hàm này giờ đây nhận 3 tham số
  createPaymentUrl: (amount, orderInfo, orderId) => 
    api.post('/payment/create_payment_url', { amount, orderInfo, orderId }),
};

export default api;