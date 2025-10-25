import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          🌱 Nông Sản Blockchain
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
          Ứng dụng mua bán nông sản minh bạch với công nghệ Blockchain
        </p>
        
        <div className="mt-10 flex justify-center space-x-4">
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            🛒 Khám phá Marketplace
          </Link>
          
          {!isAuthenticated ? (
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 border border-green-600 text-base font-medium rounded-md text-green-600 bg-white hover:bg-green-50"
            >
              Đăng nhập
            </Link>
          ) : (
            <Link
              to={user?.role === 'farmer' ? '/farmer' : '/products'}
              className="inline-flex items-center px-6 py-3 border border-green-600 text-base font-medium rounded-md text-green-600 bg-white hover:bg-green-50"
            >
              {user?.role === 'farmer' ? '👨‍🌾 Farmer Dashboard' : '🛒 Mua sắm'}
            </Link>
          )}
        </div>

        {isAuthenticated && (
          <div className="mt-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-green-800">
                👋 Chào mừng trở lại, {user?.name || user?.walletAddress?.slice(0, 8)}!
              </h3>
              <p className="mt-2 text-green-600">
                Vai trò: <strong>
                  {user?.role === 'farmer' ? '👨‍🌾 Nông dân' : '🛒 Người mua'}
                </strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="mt-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Tại sao chọn Nông Sản Blockchain?
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xl">🔍</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Minh Bạch</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Theo dõi nguồn gốc nông sản từ trang trại đến tay người tiêu dùng
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xl">🛡️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Bảo mật</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Giao dịch an toàn với công nghệ Blockchain và Smart Contract
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Trực tiếp</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Mua bán trực tiếp giữa nông dân và người tiêu dùng, không qua trung gian
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xl">🌾</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Chất lượng</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Sản phẩm hữu cơ, có nguồn gốc rõ ràng từ các nông trại uy tín
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xl">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Chi phí tốt</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Giá cả cạnh tranh, loại bỏ chi phí trung gian không cần thiết
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xl">📱</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Dễ dàng</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Giao diện thân thiện, dễ sử dụng cho cả nông dân và người mua
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-20 text-center">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng tham gia?</h2>
          <p className="text-lg mb-6 opacity-90">
            Tham gia ngay để trải nghiệm mua bán nông sản minh bạch và hiệu quả
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-green-600 bg-white hover:bg-green-50"
            >
              🛒 Khám phá sản phẩm
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-green-700"
              >
                Đăng nhập ngay
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;