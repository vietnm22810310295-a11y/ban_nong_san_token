import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
            Vui lòng đăng nhập với MetaMask để bắt đầu
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🦊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Đăng ký với MetaMask
            </h3>
            <p className="text-sm text-gray-600">
              Hệ thống sử dụng MetaMask để đăng ký và đăng nhập
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

            <Link
              to="/products"
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-200"
            >
              🛒 Tiếp tục xem sản phẩm
            </Link>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Quy trình đăng ký:</h4>
            <ol className="text-xs text-blue-700 space-y-1 text-left">
              <li>1. Truy cập trang <strong>Đăng nhập</strong></li>
              <li>2. Kết nối với MetaMask</li>
              <li>3. Hệ thống tự động tạo tài khoản mới</li>
              <li>4. Chọn vai trò (Nông dân/Người mua)</li>
              <li>5. Hoàn tất thông tin cá nhân</li>
            </ol>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có ví MetaMask?{' '}
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-green-600 hover:text-green-500"
              >
                Tải về ngay
              </a>
            </p>
          </div>
        </div>

        {/* Demo Wallets Info */}
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