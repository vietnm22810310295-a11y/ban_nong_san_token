import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'; // ĐÃ THÊM LINK
import { AuthProvider } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import FarmerDashboard from './pages/FarmerDashboard';
import './index.css';

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/products" element={<ProductsPage />} />
                
                {/* Protected Routes */}
                <Route 
                  path="/products/:id" 
                  element={
                    <ProtectedRoute>
                      <ProductDetailPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/farmer" 
                  element={
                    <ProtectedRoute requiredRole="farmer">
                      <FarmerDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* 404 Page */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-4">Trang không tồn tại</p>
                      <Link to="/" className="text-green-600 hover:text-green-700 font-medium">
                        Quay về trang chủ
                      </Link>
                    </div>
                  </div>
                } />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-16">
              <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="text-center text-gray-600">
                  <p>🌱 Nông Sản Blockchain - Kết nối nông dân và người tiêu dùng</p>
                  <p className="mt-2 text-sm">© 2024 All rights reserved</p>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;