import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // [ĐÃ SỬA] Logic kiểm tra quyền nâng cao
  if (requiredRole) {
    // Trường hợp 1: requiredRole là một mảng (Ví dụ: ['farmer', 'admin'])
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(user?.role)) {
        return <AccessDeniedScreen />;
      }
    } 
    // Trường hợp 2: requiredRole là một chuỗi đơn (Ví dụ: 'buyer')
    else {
      if (user?.role !== requiredRole) {
        return <AccessDeniedScreen />;
      }
    }
  }

  return children;
};

// Tách màn hình từ chối ra component con cho gọn
const AccessDeniedScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Truy cập bị từ chối</h2>
      <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
    </div>
  </div>
);

export default ProtectedRoute;