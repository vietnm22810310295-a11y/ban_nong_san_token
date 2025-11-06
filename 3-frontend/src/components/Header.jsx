import React, { useState, useEffect, useCallback } from 'react'; // [SỬA] Thêm hook
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context'; // [SỬA] Thêm Web3Context
import WalletConnect from './WalletConnect';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  // [SỬA] Thêm logic để lấy số dư
  const { isConnected, account, getBalance } = useWeb3();
  const [balance, setBalance] = useState('0.00');
  const [balanceLoading, setBalanceLoading] = useState(false);

  // [SỬA] Thêm hàm load số dư (tương tự như ở ProductsPage)
  const loadWalletBalance = useCallback(async () => {
    if (!isConnected || !getBalance) return;
    try {
      setBalanceLoading(true);
      const balanceResult = await getBalance();
      if (balanceResult.success) {
        // Cập nhật số dư với 4 chữ số thập phân
        setBalance(parseFloat(balanceResult.balance).toFixed(4));
      }
    } catch (error) {
      console.error('Lỗi khi tải số dư ở Header:', error);
    } finally {
      setBalanceLoading(false);
    }
  }, [isConnected, getBalance]); // Dependency

  // [SỬA] Tự động load số dư khi kết nối hoặc đổi ví
  useEffect(() => {
    if (isConnected && account) {
      loadWalletBalance();
    }
  }, [isConnected, account, loadWalletBalance]);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-green-600 hover:text-green-700">
              🌱 Nông Sản Blockchain
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            {/* Public Navigation */}
            <Link 
              to="/products" 
              className="text-gray-700 hover:text-green-600 transition duration-200 font-medium"
            >
              🛒 Marketplace
            </Link>

            {/* [SỬA] Nhóm WalletConnect và Số dư */}
            <div className="flex items-center space-x-3">
              <WalletConnect />

              {/* [SỬA] Thêm hiển thị số dư tại đây */}
              {isConnected && (
                <div className="flex items-center space-x-1 text-sm font-medium text-purple-800 bg-purple-100 px-3 py-1 rounded-lg">
                  <span>💰</span>
                  {balanceLoading ? (
      	            <span className="w-12 text-center">...</span>
                  ) : (
                    <span>{balance} ETH</span>
                  )}
                </div>
              )}
            </div>


            {isAuthenticated ? (
              <>
                {user?.role === 'farmer' && (
                  <Link 
                    to="/farmer" 
                    className="text-gray-700 hover:text-green-600 transition duration-200 font-medium"
                  >
                    👨‍🌾 Farmer Dashboard
                  </Link>
          	    )}
                
                {user?.role === 'buyer' && (
          	      <Link 
                    to="/my-purchases" 
                    className="text-gray-700 hover:text-green-600 transition duration-200 font-medium"
                  >
                    🛍️ Hàng đã mua
  	            </Link>
                )}
                
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                  <span className="text-gray-700 text-sm">
                    Xin chào, <strong>{user?.name || user?.walletAddress?.slice(0, 8)}</strong>
            	    </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                  	  user?.role === 'farmer' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user?.role === 'farmer' ? '👨‍🌾 Nông dân' : '🛒 Người mua'}
              </span>
                  <button
                	  onClick={logout}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition duration-200"
            	  >
                    Đăng xuất
            	  </button>
            	</div>
              </>
    	      ) : (
              <div className="flex space-x-2">
    	          <Link
                  to="/login"
                s   className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition duration-200 font-medium"
          	  >
      	          Đăng nhập
            	  </Link>
  	            <Link
            	    to="/register"
                  className="border border-green-500 text-green-500 hover:bg-green-50 px-4 py-2 rounded-lg text-sm transition duration-200 font-medium"
          	  >
                	Đăng ký
          	    </Link>
          	  </div>
  	        )}
          </nav>
    	  </div>
      </div>
    </header>
  );
};

export default Header;