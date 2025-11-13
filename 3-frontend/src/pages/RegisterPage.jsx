import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import AlertModal from '../components/AlertModal'; // [SỬA 1] Import AlertModal
import LoadingSpinner from '../components/LoadingSpinner'; // [SỬA 2] Import LoadingSpinner (nếu có)

const RegisterPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    walletAddress: '',
    role: 'buyer',
    email: '',
    phone: '',
    address: '',
  });
  
  // [SỬA 3] Bỏ state error/success, thêm state formErrors và alertInfo
  const [formErrors, setFormErrors] = useState({});
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });
  const [loading, setLoading] = useState(false);

  // [SỬA 4] Hàm validate real-time
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value) error = 'Tên không được để trống.';
        break;
      case 'walletAddress':
        if (!value) error = 'Địa chỉ ví không được để trống.';
        else if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          error = 'Địa chỉ ví không hợp lệ (bắt đầu bằng 0x và 42 ký tự).';
        }
        break;
      case 'email':
        if (value && !/^\S+@\S+\.\S+$/.test(value)) {
          error = 'Email không đúng định dạng.';
        }
        break;
      case 'phone':
        if (value && !/^[0-9]{10,11}$/.test(value)) {
          error = 'Số điện thoại không hợp lệ (phải là 10-11 số).';
        }
        break;
      default:
        break;
    }
    return error;
  };

  // [SỬA 5] Cập nhật handleChange để validate real-time
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Validate ngay khi gõ
    const error = validateField(name, value);
    setFormErrors({ ...formErrors, [name]: error });
  };

  // [SỬA 6] Cập nhật handleSubmit để kiểm tra lại và dùng AlertModal
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertInfo({ isOpen: false, title: '', message: '' }); // Đóng alert cũ

    // Kiểm tra (validate) lại toàn bộ form trước khi gửi
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return; // Dừng lại nếu có lỗi
    }

    setLoading(true);
    try {
      await userAPI.register({
        name: formData.name,
        walletAddress: formData.walletAddress,
        role: formData.role,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
      });

      setAlertInfo({ isOpen: true, title: "Thành công", message: 'Đăng ký thành công! Giờ bạn có thể "Đến trang đăng nhập" và kết nối ví.' });
      
      // Xóa form
      setFormData({
        name: '', walletAddress: '', role: 'buyer', email: '', phone: '', address: '',
      });
      setFormErrors({}); // Xóa các lỗi

    } catch (err) {
      const message = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setAlertInfo({ isOpen: true, title: "Lỗi đăng ký", message: message });
    }
    setLoading(false);
  };

  // Nếu đã đăng nhập, chuyển hướng về trang chủ
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  return (
    <> {/* [SỬA 7] Bọc bằng Fragment */}
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

          {/* KHỐI 1: ĐĂNG NHẬP (Giữ nguyên) */}
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

          {/* DẤU PHÂN CÁCH (Giữ nguyên) */}
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

          {/* KHỐI 2: FORM ĐĂNG KÝ (Sửa JSX) */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <form className="space-y-4" onSubmit={handleSubmit} noValidate> {/* Thêm noValidate để tắt HTML5 validation */}
              
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
            	    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'}`}
            	    placeholder="vidu: Nông dân A"
            	    value={formData.name}
            	    onChange={handleChange}
          	    />
          	    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
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
              	  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${formErrors.walletAddress ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'}`}
              	  placeholder="0x..."
              	  value={formData.walletAddress}
              	  onChange={handleChange}
            	  />
          	    {formErrors.walletAddress && <p className="text-red-500 text-xs mt-1">{formErrors.walletAddress}</p>}
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
              	  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'}`}
              	  placeholder="vidu@email.com"
              	  value={formData.email}
              	  onChange={handleChange}
            	  />
          	    {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
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
              	  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${formErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'}`}
              	  value={formData.phone}
              	  onChange={handleChange}
            	  />
          	    {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
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
          	  
          	  {/* [SỬA] Bỏ hiển thị lỗi/thành công cũ
          	  {error && (...)}
          	  {success && (...)} 
          	  */}

          	  {/* Nút Đăng ký */}
          	  <div>
            	  <button
              	  type="submit"
              	  disabled={loading}
              	  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
            	  >
              	  {loading ? <LoadingSpinner size="small" /> : 'Đăng ký'}
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

    	{/* [SỬA 8] Thêm AlertModal vào đây */}
    	<AlertModal
      	isOpen={alertInfo.isOpen}
      	onClose={() => setAlertInfo({ isOpen: false, title: '', message: '' })}
      	title={alertInfo.title}
    	>
      	<p>{alertInfo.message}</p>
    	</AlertModal>
  	</>
  );
};

export default RegisterPage;