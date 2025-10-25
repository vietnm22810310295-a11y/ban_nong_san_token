import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WalletConnect from './WalletConnect';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();

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

            {/* Wallet Connect Component */}
            <WalletConnect />

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
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition duration-200 font-medium"
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