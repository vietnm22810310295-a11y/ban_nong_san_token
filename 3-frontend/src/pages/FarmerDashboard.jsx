import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { productAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const { isConnected, registerProductOnChain, account } = useWeb3();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    sold: 0
  });

  const [formData, setFormData] = useState({
    blockchainId: '',
    name: '',
    productType: 'lúa',
    description: '',
    harvestDate: '',
    region: '',
    farmName: '',
    price: '',
    isOrganic: false,
    quantity: 1,
    unit: 'kg'
  });

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const fetchMyProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getMyProducts();
      setProducts(response.data.data);
      
      const total = response.data.data.length;
      const available = response.data.data.filter(p => p.status === 'available').length;
      const sold = response.data.data.filter(p => p.status === 'sold').length;
      
      setStats({ total, available, sold });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Vui lòng kết nối MetaMask trước khi tạo sản phẩm');
      return;
    }

    try {
      setBlockchainLoading(true);

      // BƯỚC 1: Đăng ký lên Blockchain
      const blockchainResult = await registerProductOnChain({
        ...formData,
        blockchainId: parseInt(formData.blockchainId)
      });

      if (!blockchainResult.success) {
        throw new Error(blockchainResult.error || 'Lỗi khi đăng ký trên blockchain');
      }

      // BƯỚC 2: Lưu vào Database (Backend)
      await productAPI.createProduct({
        ...formData,
        blockchainId: parseInt(formData.blockchainId)
      });

      // Thành công
      setShowCreateForm(false);
      setFormData({
        blockchainId: '',
        name: '',
        productType: 'lúa',
        description: '',
        harvestDate: '',
        region: '',
        farmName: '',
        price: '',
        isOrganic: false,
        quantity: 1,
        unit: 'kg'
      });
      
      fetchMyProducts();
      
      alert('✅ Tạo sản phẩm thành công trên cả Blockchain và Database!');

    } catch (error) {
      console.error('Error creating product:', error);
      alert('❌ Lỗi khi tạo sản phẩm: ' + error.message);
    } finally {
      setBlockchainLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Web3 Connection Status */}
      <div className={`p-4 rounded-lg mb-6 ${
        isConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            isConnected ? 'bg-green-500' : 'bg-yellow-500'
          }`}></div>
          <div>
            <p className="font-medium">
              {isConnected ? '✅ Đã kết nối MetaMask' : '⚠️ Chưa kết nối MetaMask'}
            </p>
            {isConnected && (
              <p className="text-sm text-gray-600 mt-1">
                Ví: {account?.slice(0, 8)}...{account?.slice(-6)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">👨‍🌾 Farmer Dashboard</h1>
        <p className="mt-2 text-gray-600">Quản lý sản phẩm nông sản của bạn</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-900">Tổng sản phẩm</h3>
          <p className="text-3xl font-bold text-green-600">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-900">Đang bán</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.available}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-900">Đã bán</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.sold}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex space-x-4">
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200"
        >
          + Thêm sản phẩm mới
        </button>
      </div>

      {/* Create Product Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              Thêm sản phẩm mới {blockchainLoading && '(Đang xử lý trên Blockchain...)'}
            </h2>
            
            {blockchainLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2 text-blue-700">
                    Đang ghi dữ liệu lên Blockchain... Vui lòng chờ và xác nhận trong MetaMask
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Blockchain ID *</label>
                  <input
                    type="number"
                    name="blockchainId"
                    value={formData.blockchainId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên sản phẩm *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Loại sản phẩm *</label>
                  <select
                    name="productType"
                    value={formData.productType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="lúa">Lúa</option>
                    <option value="cà phê">Cà phê</option>
                    <option value="tiêu">Tiêu</option>
                    <option value="điều">Điều</option>
                    <option value="trái cây">Trái cây</option>
                    <option value="rau củ">Rau củ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giá (ETH) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày thu hoạch *</label>
                  <input
                    type="date"
                    name="harvestDate"
                    value={formData.harvestDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vùng trồng *</label>
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên nông trại</label>
                  <input
                    type="text"
                    name="farmName"
                    value={formData.farmName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số lượng</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isOrganic"
                  checked={formData.isOrganic}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Sản phẩm hữu cơ</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={blockchainLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={blockchainLoading || !isConnected}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {blockchainLoading ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Đang xử lý...</span>
                    </>
                  ) : (
                    'Tạo sản phẩm'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Sản phẩm của tôi</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {products.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">Bạn chưa có sản phẩm nào.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-2 text-green-600 hover:text-green-700 font-medium"
              >
                Thêm sản phẩm đầu tiên
              </button>
            </div>
          ) : (
            products.map((product) => (
              <div key={product._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600">
                      {product.productType} • {product.region} • {product.price} ETH
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status === 'available' ? 'Đang bán' : 'Đã bán'}
                      </span>
                      {product.isOrganic && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Hữu cơ
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ID: {product.blockchainId}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Chỉnh sửa
                    </button>
                    <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;