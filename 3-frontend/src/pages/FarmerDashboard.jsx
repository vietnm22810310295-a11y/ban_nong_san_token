import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { productAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const FarmerDashboard = () => {
  const { isConnected, registerProductOnChain, account, web3, contract, getProductCount, updateProductPriceOnChain } = useWeb3(); 
  
  const [products, setProducts] = useState([]); 
  const [refundRequests, setRefundRequests] = useState([]); 
  const [activeTab, setActiveTab] = useState('myProducts'); 
  
  // [SỬA MỚI 1] Thêm state cho các yêu cầu tiền mặt
  const [cashPendingRequests, setCashPendingRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    sold: 0,
    pending: 0, 
    cashPending: 0 // [SỬA MỚI 1.1] Thêm stat cho tiền mặt
  });

  const [formData, setFormData] = useState({
    name: '',
    productType: 'lúa',
    description: '',
    harvestDate: '',
    region: '',
    farmName: '',
    price: '',
    isOrganic: false,
    image: ''
  });

  // [SỬA MỚI 2] Cập nhật hàm fetch để lọc cả 2 loại yêu cầu
  const fetchMyProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productAPI.getMyProducts();
      const allProducts = response.data.data;
      setProducts(allProducts); 
      
      const available = allProducts.filter(p => p.status === 'available').length;
      const sold = allProducts.filter(p => p.status === 'sold' || p.status === 'refunded').length;
      
      // Lọc yêu cầu hoàn tiền
      const pendingList = allProducts.filter(p => p.status === 'refund-requested');
      setRefundRequests(pendingList); 
      
      // Lọc yêu cầu tiền mặt
      const cashList = allProducts.filter(p => p.status === 'cash-pending');
      setCashPendingRequests(cashList);

      setStats({ 
        total: allProducts.length, 
        available, 
        sold, 
        pending: pendingList.length,
        cashPending: cashList.length // Set stat mới
      });

    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Vui lòng kết nối MetaMask trước khi tạo sản phẩm');
      return;
    }

    if (!web3 || !contract) {
      alert('Lỗi: Web3 hoặc contract chưa khởi tạo. Vui lòng đợi vài giây và thử lại.');
      return;
    }

    try {
      setBlockchainLoading(true);

      // BƯỚC 1: LẤY ID MỚI TỪ BLOCKCHAIN
      const countResult = await getProductCount();
      if (!countResult.success) {
        throw new Error('Không thể lấy số lượng sản phẩm từ contract.');
      }
      const newProductId = countResult.count + 1;

      // BƯỚC 2: Đăng ký lên Blockchain
      const blockchainResult = await registerProductOnChain(formData);

      if (!blockchainResult.success) {
        throw new Error(blockchainResult.error || 'Lỗi khi đăng ký trên blockchain');
      }

      // BƯỚC 3: Lưu vào Database (Backend) VỚI ID ĐÚNG
      await productAPI.createProduct({
        ...formData,
        blockchainId: newProductId, 
        images: formData.image ? [formData.image] : [] 
      });

      // Thành công
      setShowCreateForm(false);
      setFormData({
        name: '',
        productType: 'lúa',
        description: '',
        harvestDate: '',
        region: '',
        farmName: '',
        price: '',
        isOrganic: false,
        image: ''
      });
      
      fetchMyProducts(); // Tải lại danh sách sản phẩm
      
      alert(`✅ Tạo sản phẩm (ID: ${newProductId}) thành công!`);

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

  // Hàm "Xóa"
  const handleDelete = async (product) => {
    if (product.status === 'available') {
        const confirmDelete = window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?\n\n(Lưu ý: Hành động này chỉ xóa khỏi Database, không thể xóa khỏi Blockchain.)`);
        if (!confirmDelete) return;
    } else {
        alert('Sản phẩm này đã bán hoặc đang xử lý, chỉ có thể xóa khỏi Database.');
        const confirmDelete = window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}" khỏi Database?`);
        if (!confirmDelete) return;
    }

    try {
      setLoading(true);
      await productAPI.deleteProduct(product._id);
      alert('✅ Đã xóa sản phẩm khỏi Database thành công!');
      fetchMyProducts(); 
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('❌ Lỗi khi xóa sản phẩm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Hàm "Chỉnh sửa"
  const handleEdit = async (product) => {
    if (product.isSold || product.status === 'sold' || product.status === 'refund-requested') {
      alert('❌ Không thể chỉnh sửa sản phẩm đã bán hoặc đang chờ hoàn tiền.');
      return;
    }

    const newPrice = window.prompt(`Nhập giá mới (ETH) cho sản phẩm "${product.name}":`, product.price);

    if (!newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) {
      alert('Giá không hợp lệ. Vui lòng nhập một số lớn hơn 0.');
      return;
    }

    try {
      setBlockchainLoading(true);
      alert('Đang gửi giao dịch lên Blockchain... Vui lòng xác nhận trong MetaMask.');

      // BƯỚC 1: Cập nhật Blockchain
      const blockchainResult = await updateProductPriceOnChain(product.blockchainId, newPrice);
      if (!blockchainResult.success) {
        throw new Error(blockchainResult.error || 'Lỗi cập nhật giá trên Blockchain');
      }

      // BƯỚC 2: Cập nhật Database
      alert('Blockchain thành công. Đang cập nhật Database...');
      await productAPI.updateProduct(product._id, {
        price: parseFloat(newPrice)
      });

      alert('✅ Cập nhật giá thành công!');
      fetchMyProducts(); 

    } catch (error) {
      console.error('Error updating price:', error);
      alert('❌ Lỗi khi cập nhật giá: ' + error.message);
    } finally {
      setBlockchainLoading(false);
    }
  };

  // HÀM MỚI - Đồng ý hoàn tiền
  const handleApproveRefund = async (product) => {
    const confirmApprove = window.confirm(`Bạn có chắc muốn CHẤP NHẬN hoàn tiền cho sản phẩm "${product.name}"?\n\nLý do của khách: "${product.refundReason}"\n\nLƯU Ý: Bạn phải TỰ THAO TÁC chuyển ETH trả lại cho người mua. Hành động này chỉ cập nhật trạng thái.`);
    if (!confirmApprove) return;

    try {
      setBlockchainLoading(true); // Dùng loading chung
      await productAPI.approveRefund(product._id);
      alert('✅ Đã chấp nhận hoàn tiền. Trạng thái sản phẩm đã được cập nhật.');
      fetchMyProducts(); // Tải lại tất cả danh sách
    } catch (error) {
      console.error('Error approving refund:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || 'Thao tác thất bại'));
    } finally {
      setBlockchainLoading(false);
    }
  };

  // [SỬA MỚI 3] Thêm hàm xử lý xác nhận tiền mặt
  const handleConfirmCash = async (product) => {
     const confirmCash = window.confirm(`XÁC NHẬN GIAO DỊCH TIỀN MẶT?\n\nSản phẩm: "${product.name}"\n\nBạn chắc chắn đã nhận được tiền mặt và chuyển hàng cho người mua?`);
    if (!confirmCash) return;

    try {
      setBlockchainLoading(true); 
      await productAPI.confirmCashPurchase(product._id);
      alert('✅ Đã xác nhận bán bằng tiền mặt thành công!');
      fetchMyProducts(); // Tải lại
    } catch (error) {
      console.error('Error confirming cash:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || 'Thao tác thất bại'));
    } finally {
      setBlockchainLoading(false);
    }
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
      {/* Web3 Connection Status - [KHÔI PHỤC] */}
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

      {/* [SỬA MỚI 4] Sửa lại Stats Cards (thêm 1 thẻ, đổi grid-cols-5) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-400">
          <h3 className="text-lg font-semibold text-gray-900">Chờ tiền mặt</h3>
          <p className="text-3xl font-bold text-blue-500">{stats.cashPending}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-gray-900">Chờ hoàn tiền</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex space-x-4">
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!isConnected || !web3 || !contract}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200 disabled:opacity-50"
          title={!isConnected ? "Vui lòng kết nối ví" : (!web3 || !contract ? "Đang khởi tạo Web3..." : "Thêm sản phẩm")}
        >
          + Thêm sản phẩm mới
        </button>
      </div>

      {/* Create Product Form (Modal) - [KHÔI PHỤC] */}
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
                    min="0"
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

                {/* Thêm ô 'Link ảnh' */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Link ảnh sản phẩm</label>
                  <input
                    type="text"
                    name="image"
                    placeholder="https://imgur.com/..."
                    value={formData.image}
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
                  disabled={blockchainLoading || !isConnected || !web3 || !contract}
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

      {/* [SỬA MỚI 5] Thêm Tab (Yêu cầu tiền mặt) */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('myProducts')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'myProducts'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sản phẩm của tôi
          </button>
          <button
            onClick={() => setActiveTab('cashRequests')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cashRequests'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Yêu cầu (Tiền mặt)
              {stats.cashPending > 0 && (
              <span className="ml-2 inline-block py-0.5 px-2.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {stats.cashPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('refundRequests')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'refundRequests'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Yêu cầu (Hoàn tiền)
            {stats.pending > 0 && (
              <span className="ml-2 inline-block py-0.5 px-2.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {stats.pending}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Hiển thị nội dung Tab */}
      <div>
        {/* Tab 1: Sản phẩm của tôi */}
        {activeTab === 'myProducts' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Sản phẩm của tôi ({stats.total})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">Bạn chưa có sản phẩm nào.</p>
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
                            product.status === 'available' ? 'bg-green-100 text-green-800' :
                            product.status === 'sold' ? 'bg-purple-100 text-purple-800' :
                            product.status === 'cash-pending' ? 'bg-blue-100 text-blue-800' : // Thêm
                            product.status === 'refund-requested' ? 'bg-yellow-100 text-yellow-800' :
                            product.status === 'refunded' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status === 'available' ? 'Đang bán' : 
                             product.status === 'sold' ? 'Đã bán' : 
                             product.status === 'cash-pending' ? 'Chờ tiền mặt' : // Thêm
                             product.status === 'refund-requested' ? 'Chờ hoàn tiền' :
                           product.status === 'refunded' ? 'Đã hoàn tiền' : 'Không rõ'}
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
                        <button 
                          onClick={() => handleEdit(product)}
                          disabled={product.isSold || product.status === 'sold' || product.status === 'refund-requested' || product.status === 'cash-pending' || blockchainLoading}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Chỉnh sửa
                        </button>
                        <button 
                          onClick={() => handleDelete(product)}
                          disabled={blockchainLoading}
                          className="text-red-600 hover:text-red-700 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                	        Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* [SỬA MỚI 6] Thêm nội dung Tab (Yêu cầu tiền mặt) */}
        {activeTab === 'cashRequests' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Yêu cầu (Tiền mặt) ({stats.cashPending})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {cashPendingRequests.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">Không có yêu cầu tiền mặt nào.</p>
                </div>
              ) : (
                cashPendingRequests.map((product) => (
                  <div key={product._id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {product.productType} • {product.price} ETH • ID: {product.blockchainId}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {/* 'buyer' được gán khi request, 'currentOwner' thì chưa */}
                          Người mua: {product.buyer ? `${product.buyer.slice(0, 8)}...${product.buyer.slice(-6)}` : (product.currentOwner.slice(0, 8) + '...' + product.currentOwner.slice(-6))}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleConfirmCash(product)}
                          disabled={blockchainLoading}
                          className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          ✅ Xác nhận đã nhận tiền
                        </button>
              	</div>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
        )}

        {/* Tab 2: Yêu cầu hoàn tiền */}
        {activeTab === 'refundRequests' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Yêu cầu (Hoàn tiền) ({stats.pending})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {refundRequests.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">Không có yêu cầu hoàn tiền nào.</p>
                </div>
              ) : (
                refundRequests.map((product) => (
                  <div key={product._id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {product.productType} • {product.price} ETH • ID: {product.blockchainId}
                        </p>
                        <p className="text-sm text-red-600 mt-2">
                          <strong>Lý do của người mua:</strong> {product.refundReason || 'Không có lý do'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Người mua: {product.currentOwner.slice(0, 8)}...{product.currentOwner.slice(-6)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleApproveRefund(product)}
                          disabled={blockchainLoading}
                          className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          Chấp nhận hoàn tiền
                        </button>
                      </div>
                    </div>
                </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default FarmerDashboard;