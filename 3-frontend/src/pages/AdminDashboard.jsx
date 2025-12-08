import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State quản lý Tabs
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'products' | 'users'

  // State dữ liệu
  const [stats, setStats] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [users, setUsers] = useState([]);
  
  // State tìm kiếm & Loading
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Kiểm tra quyền Admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Hàm load dữ liệu dựa trên Tab đang chọn
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'overview') {
        const res = await api.get('/users/stats/overview');
        if (res.data.success) setStats(res.data.data);
      } 
      else if (activeTab === 'products') {
        const res = await api.get('/products/admin/pending');
        if (res.data.success) setPendingProducts(res.data.data);
      } 
      else if (activeTab === 'users') {
        // Có thể thêm params search vào đây
        const res = await api.get(`/users?search=${searchTerm}`);
        if (res.data.success) setUsers(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  // Gọi loadData khi chuyển Tab hoặc search thay đổi (debounce search nếu cần)
  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- HÀM XỬ LÝ SẢN PHẨM ---
  const handleApproveProduct = async (id, action) => {
    if (!window.confirm(`Bạn muốn ${action === 'approved' ? 'DUYỆT' : 'TỪ CHỐI'} sản phẩm này?`)) return;
    try {
      await api.put(`/products/admin/approve/${id}`, { status: action });
      setPendingProducts(prev => prev.filter(p => p._id !== id));
      alert('Thao tác thành công!');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // --- HÀM XỬ LÝ USER ---
  const handleToggleUserStatus = async (walletAddress, currentStatus, userName) => {
    const action = currentStatus ? 'KHÓA (Ban)' : 'MỞ KHÓA';
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản "${userName}"?`)) return;

    try {
      const res = await api.put(`/users/${walletAddress}/active`, { isActive: !currentStatus });
      if (res.data.success) {
        // Cập nhật lại list user ở client
        setUsers(users.map(u => 
          u.walletAddress === walletAddress ? { ...u, isActive: !currentStatus } : u
        ));
        alert(`Đã ${action} thành công!`);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // --- RENDER FUNCTIONS ---

  // 1. Tab Thống kê
  const renderOverview = () => {
    if (!stats) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium">Tổng người dùng</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalUsers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-green-600 font-bold">{stats.activeUsers}</span> đang hoạt động
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium">Tổng sản phẩm</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalProducts}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Sản phẩm trên toàn hệ thống
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium">Người dùng mới</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.recentUsers?.length || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
              
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Trong thời gian gần đây
          </div>
        </div>
      </div>
    );
  };

  // 2. Tab Duyệt Sản Phẩm
  const renderProducts = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden animate-fade-in-up">
      {pendingProducts.length === 0 ? (
        <div className="p-8 text-center text-gray-500">✅ Không có sản phẩm nào cần duyệt.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người bán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingProducts.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-10 w-10 rounded object-cover" src={product.images[0]} alt="" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{new Date(product.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.farmName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {product.price} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => handleApproveProduct(product._id, 'approved')} className="text-green-600 hover:text-green-900 mx-2 font-bold">Duyệt</button>
                    <button onClick={() => handleApproveProduct(product._id, 'rejected')} className="text-red-600 hover:text-red-900 mx-2">Từ chối</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 3. Tab Quản lý User
  const renderUsers = () => (
    <div className="space-y-4 animate-fade-in-up">
      {/* Search Bar */}
      <div className="flex justify-end">
        <input 
          type="text" 
          placeholder="Tìm theo tên, email, ví..." 
          className="border rounded-lg px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ví Blockchain</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.email || 'Chưa có email'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 
                        u.role === 'farmer' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {u.role === 'admin' ? 'Quản trị' : u.role === 'farmer' ? 'Nông dân' : 'Người mua'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                    {u.walletAddress.slice(0, 6)}...{u.walletAddress.slice(-4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                      {u.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    {u.role !== 'admin' && ( // Không được khóa admin
                      <button 
                        onClick={() => handleToggleUserStatus(u.walletAddress, u.isActive, u.name)}
                        className={`${u.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} font-bold`}
                      >
                        {u.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
             Bảng Điều Khiển Admin
          </h1>
          <div className="mt-4 md:mt-0 text-sm text-gray-500">
            Xin chào, <span className="font-bold text-gray-800">{user?.name}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'overview' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Thống kê
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'products' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🛒 Duyệt Sản Phẩm
            {pendingProducts.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingProducts.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'users' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
             Người Dùng
          </button>
        </div>

        {/* Main Content Area */}
        <div className="min-h-[400px]">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'products' && renderProducts()}
              {activeTab === 'users' && renderUsers()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;