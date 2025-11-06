import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api'; // [ĐÃ SỬA] Import đúng userAPI

const RegisterPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State cho form đăng ký thủ công
  const [formData, setFormData] = useState({
    name: '', // Sẽ map với 'name' trong DB
    walletAddress: '',
    role: 'buyer', // Giá trị mặc định
    email: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Xử lý khi người dùng nhập liệu vào form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Xử lý khi người dùng nhấn nút "Đăng ký"
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // --- Kiểm tra dữ liệu ---
    if (!formData.name || !formData.walletAddress || !formData.role) {
      setError('Vui lòng điền Tên, Địa chỉ ví và Vai trò.');
      return;
    }
    if (!formData.walletAddress.startsWith('0x') || formData.walletAddress.length !== 42) {
      setError('Địa chỉ ví không hợp lệ. (Phải bắt đầu bằng 0x và dài 42 ký tự)');
      return;
    }
    
    setLoading(true);
    try {
      // [ĐÃ SỬA] Gọi hàm userAPI.register
      await userAPI.register({
        name: formData.name,
        walletAddress: formData.walletAddress,
        role: formData.role,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
      });

      setSuccess('Đăng ký thành công! Giờ bạn có thể "Đến trang đăng nhập" và kết nối ví.');
      // Xóa form
      setFormData({
        name: '', walletAddress: '', role: 'buyer', email: '', phone: '', address: '',
      });

    } catch (err) {
      // Hiển thị lỗi từ backend (ví dụ: "Wallet đã tồn tại")
      const message = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(message);
    }
    setLoading(false);
  };

  // Nếu đã đăng nhập, chuyển hướng về trang chủ
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng ký tài khoản
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Chọn một trong hai cách để bắt đầu
          </p>
        </div>

        {/* ----- KHỐI 1: ĐĂNG KÝ/ĐĂNG NHẬP BẰNG METAMASK (Giữ nguyên) ----- */}
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🦊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Đăng nhập/Đăng ký với MetaMask
            </h3>
            <p className="text-sm text-gray-600">
              Cách nhanh và bảo mật nhất để sử dụng hệ thống.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              to="/login"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition duration-200"
            >
              <span className="text-lg mr-2">🦊</span>
              Đến trang đăng nhập
            </Link>
          </div>
        </div>

        {/* ----- DẤU PHÂN CÁCH "HOẶC" ----- */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">
              Hoặc đăng ký tài khoản thủ công (Nếu bạn chưa có ví)
            </span>
          </div>
        </div>

        {/* ----- KHỐI 2: FORM ĐĂNG KÝ THỦ CÔNG MỚI (KHÔNG CÓ MẬT KHẨU) ----- */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Tên (Username) */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Tên của bạn (hoặc Tên đăng nhập) *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="vidu: Nông dân A"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            {/* Địa chỉ ví */}
            <div>
              <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">
                Địa chỉ ví (0x...) *
              </label>
              <input
                id="walletAddress"
                name="walletAddress"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="0x..."
                value={formData.walletAddress}
                onChange={handleChange}
              />
            </div>

            {/* Vai trò */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Bạn là? *
              </label>
              <select
                id="role"
                name="role"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="buyer">Người mua</option>
                <option value="farmer">Nông dân (Người bán)</option>
              </select>
            </div>
            
            {/* ----- Các trường tùy chọn (Giống DB của bạn) ----- */}
            <hr />
            <p className="text-sm text-gray-500 text-center">Thông tin bổ sung (Không bắt buộc)</p>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="vidu@email.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Địa chỉ
              </label>
              <input
                id="address"
                name="address"
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
            
            {/* Hiển thị lỗi (nếu có) */}
            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}
            {/* Hiển thị thành công (nếu có) */}
            {success && (
              <div className="text-green-600 text-sm text-center">
                {success}
              </div>
            )}

            {/* Nút Đăng ký */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
              >
                {loading ? 'Đang xử lý...' : 'Đăng ký'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Khối ví demo (Giữ nguyên) */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-orange-800 mb-2">🦊 Ví demo từ Ganache:</h4>
          <div className="text-xs text-orange-700 space-y-1">
            <p><strong>Ví 1:</strong> 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1</p>
            <p><strong>Ví 2:</strong> 0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0</p>
            <p><strong>Ví 3:</strong> 0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b</p>
            <p className="mt-2 text-orange-600">
              <strong>Lưu ý:</strong> Import private key từ Ganache vào MetaMask để sử dụng
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;