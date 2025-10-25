import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { loginWithMetaMask } = useAuth();
  const navigate = useNavigate();

  const handleMetaMaskLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await loginWithMetaMask();
      
      if (result.success) {
        navigate('/');
      } else if (result.requiresRegistration) {
        // Modal đăng ký sẽ tự động hiện lên từ AuthContext
        console.log('User needs registration');
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Kết nối với MetaMask để đăng nhập vào hệ thống
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🦊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Đăng nhập với MetaMask
            </h3>
            <p className="text-sm text-gray-600">
              An toàn, bảo mật và dễ dàng
            </p>
          </div>

          <button
            onClick={handleMetaMaskLogin}
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition duration-200"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span className="ml-2">Đang kết nối...</span>
              </>
            ) : (
              <>
                <span className="text-lg mr-2">🦊</span>
                Kết nối MetaMask
              </>
            )}
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Lưu ý:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Đảm bảo bạn đã cài đặt MetaMask</li>
              <li>• Kết nối với mạng Ganache Local</li>
              <li>• Nếu chưa có tài khoản, hệ thống sẽ hướng dẫn bạn đăng ký</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có ví MetaMask?{' '}
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-orange-600 hover:text-orange-500"
              >
                Tải về ngay
              </a>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link 
            to="/products" 
            className="text-sm text-green-600 hover:text-green-500 font-medium"
          >
            🛒 Tiếp tục xem sản phẩm mà không cần đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;