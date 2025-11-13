import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // [SỬA] Dùng useAuth thay vì AuthContext
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboard = () => {
  // [SỬA] Gọi hook useAuth()
  const { user } = useAuth(); 
  
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Bảo vệ route: Chỉ admin mới được vào
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchPendingProducts();
  }, [user, navigate]);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products/admin/pending');
      if (response.data.success) {
        setPendingProducts(response.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách duyệt:", err);
      setError('Không thể tải danh sách sản phẩm chờ duyệt.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, currentStatus, action) => {
    // action: 'approved' hoặc 'rejected'
    if(!window.confirm(`Bạn chắc chắn muốn ${action === 'approved' ? 'DUYỆT' : 'TỪ CHỐI'} sản phẩm này?`)) return;

    try {
      const response = await api.put(`/products/admin/approve/${id}`, {
        status: action
      });

      if (response.data.success) {
        alert(`Đã ${action === 'approved' ? 'duyệt' : 'từ chối'} thành công!`);
        // Refresh lại danh sách, bỏ item đã xử lý đi
        setPendingProducts(prev => prev.filter(p => p._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-700 mb-6 flex items-center gap-2">
        🛡️ Trang Quản Trị (Admin)
      </h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Sản phẩm chờ duyệt ({pendingProducts.length})</h2>
        
        {pendingProducts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-lg">Hiện không có sản phẩm nào cần duyệt.</p>
            <p className="text-sm text-gray-400 mt-2">Các sản phẩm mới đăng sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-2">Hình ảnh</th>
                  <th className="px-4 py-2">Tên sản phẩm</th>
                  <th className="px-4 py-2">Nông dân</th>
                  <th className="px-4 py-2">Giá (ETH)</th>
                  <th className="px-4 py-2">Ngày đăng</th>
                  <th className="px-4 py-2 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pendingProducts.map((product) => (
                  <tr key={product._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <img 
                        src={product.images[0] || 'https://via.placeholder.com/50'} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded"
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">{product.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{product.farmName}</td>
                    <td className="px-4 py-2 font-bold text-green-600">{product.price} ETH</td>
                    <td className="px-4 py-2 text-sm">
                      {new Date(product.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 flex justify-center gap-2">
                      <button
                        onClick={() => handleApprove(product._id, product.approvalStatus, 'approved')}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1"
                      >
                        ✅ Duyệt
                      </button>
                      <button
                        onClick={() => handleApprove(product._id, product.approvalStatus, 'rejected')}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1"
                      >
                         Từ chối
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;