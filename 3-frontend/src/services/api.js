import axios from 'axios';

// [SỬA LỚN] Đọc URL từ biến môi trường (của Vercel hoặc file .env)
// Nếu không tìm thấy, nó sẽ tự dùng localhost (cho máy bạn)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log("API đang gọi đến:", API_BASE_URL); // Dòng này giúp bạn debug

// Tạo instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, 
  headers: {
    'Content-Type': 'application/json',
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
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
  getProducts: (params = {}) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`), 
  createProduct: (productData) => api.post('/products', productData),
  
  // [SỬA] Đã thêm API lấy danh sách hoàn tiền
  getMyProducts: () => api.get('/products/farmer/my-products'), 
  getFarmerRefundRequests: () => api.get('/products/farmer/refund-requests'),

  updateProduct: (mongoId, productData) => api.put(`/products/update/${mongoId}`, productData),
  deleteProduct: (mongoId) => api.delete(`/products/delete/${mongoId}`),
  
  getProductTypes: () => api.get('/products/types'),
  getProductRegions: () => api.get('/products/regions'),
  
  getMyPurchases: () => api.get('/products/buyer/my-purchases'),
  requestRefund: (mongoId, reason) => api.post(`/products/request-refund/${mongoId}`, { reason }),
  approveRefund: (mongoId) => api.post(`/products/approve-refund/${mongoId}`),

  requestCashPurchase: (mongoId) => api.post(`/products/request-cash/${mongoId}`),
  confirmCashPurchase: (mongoId) => api.post(`/products/confirm-cash/${mongoId}`),
};

// --- Payment API calls (VNPAY) ---
export const paymentAPI = {
  createPaymentUrl: (payload) => api.post('/payment/create_payment_url', payload),
};

export default api;