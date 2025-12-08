import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { productAPI } from '../services/api';
import api from '../services/api'; // Gọi trực tiếp axios instance
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal'; 
import AlertModal from '../components/AlertModal'; 

const FarmerDashboard = () => {
  const { isConnected, registerProductOnChain, account, web3, contract, getProductCount, updateProductPriceOnChain } = useWeb3(); 
  
  const [products, setProducts] = useState([]); 
  const [refundRequests, setRefundRequests] = useState([]); 
  const [activeTab, setActiveTab] = useState('myProducts'); 
  const [cashPendingRequests, setCashPendingRequests] = useState([]);

  // State cho Modal
  const [orderToRefund, setOrderToRefund] = useState(null);
  const [productToConfirmCash, setProductToConfirmCash] = useState(null);

  // State cho Alert
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    sold: 0,
    pending: 0, 
    cashPending: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    productType: 'lúa',
    description: '',
    harvestDate: '',
    region: '',
    farmName: '',
    price: '',
    priceVND: '', 
    isOrganic: false,
    image: '',
    quantity: '1',
    unit: 'kg'
  });

  // --- 1. Hàm tải dữ liệu ---
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Lấy danh sách sản phẩm
      const productRes = await productAPI.getMyProducts();
      let myProducts = [];
      if (productRes.data && Array.isArray(productRes.data.data)) {
        myProducts = productRes.data.data;
      } else if (Array.isArray(productRes.data)) {
        myProducts = productRes.data;
      }
      setProducts(myProducts);

      // 2. Lấy danh sách Yêu cầu hoàn tiền (Từ bảng ORDER)
      let refundOrders = [];
      try {
          const refundRes = await api.get('/products/farmer/refund-requests');
          if (refundRes.data.success) {
              refundOrders = refundRes.data.data;
          }
      } catch (err) {
          console.warn("Lỗi lấy danh sách hoàn tiền:", err);
      }
      setRefundRequests(refundOrders);

      // 3. Lấy danh sách chờ tiền mặt
      const cashList = myProducts.filter(p => p.status === 'cash-pending');
      setCashPendingRequests(cashList);

      // Tính thống kê
      const available = myProducts.filter(p => p.status === 'available').length;
      const sold = myProducts.filter(p => p.status === 'sold').length;

      setStats({ 
        total: myProducts.length, 
        available, 
        sold, 
        pending: refundOrders.length, 
        cashPending: cashList.length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // --- 2. Xử lý Hoàn tiền (Blockchain) ---
  const handleApproveRefund = async (order) => {
    try {
      setBlockchainLoading(true); 
      
      if (!web3 || !isConnected) throw new Error("Vui lòng kết nối ví MetaMask.");
      
      const buyerWallet = order.buyer; 
      if (!web3.utils.isAddress(buyerWallet)) throw new Error("Địa chỉ ví người mua không hợp lệ.");

      const refundAmountEth = order.totalPrice.toString();
      const refundAmountWei = web3.utils.toWei(refundAmountEth, 'ether');

      setAlertInfo({ 
          isOpen: true, 
          title: "Xác nhận hoàn tiền", 
          message: `Đang mở MetaMask... Vui lòng xác nhận chuyển trả ${refundAmountEth} ETH.` 
      });

      const transaction = await web3.eth.sendTransaction({
        from: account,
        to: buyerWallet,
        value: refundAmountWei,
        gas: 300000
      });

      console.log("💸 Hoàn tiền thành công:", transaction.transactionHash);

      await productAPI.approveRefund(order._id);
      
      setAlertInfo({ isOpen: true, title: "Thành công", message: "Đã hoàn tiền và cập nhật trạng thái." });
      fetchDashboardData(); 

    } catch (error) {
      console.error('Refund error:', error);
      setAlertInfo({ isOpen: true, title: "Lỗi hoàn tiền", message: error.message });
    } finally {
      setBlockchainLoading(false);
      setOrderToRefund(null); 
    }
  };

  // --- 3. Các hàm xử lý khác ---
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!isConnected) return setAlertInfo({ isOpen: true, title: "Lỗi", message: "Chưa kết nối ví." });
    
    // [LOGIC GIÁ VND] Đã tự động tính, nhưng vẫn check lại cho chắc
    if (!formData.priceVND || parseFloat(formData.priceVND) < 1000) {
        return setAlertInfo({ isOpen: true, title: "Lỗi", message: "Giá VND tối thiểu 1,000đ" });
    }

    try {
      setBlockchainLoading(true);
      const countResult = await getProductCount();
      const newProductId = Number(countResult.count) + 1;

      const blockchainResult = await registerProductOnChain(formData);
      if (!blockchainResult.success) throw new Error(blockchainResult.error);

      await productAPI.createProduct({
        ...formData,
        blockchainId: newProductId, 
        images: formData.image ? [formData.image] : [],
        quantity: parseInt(formData.quantity),
        unit: formData.unit
      });

      setShowCreateForm(false);
      setFormData({
        name: '', productType: 'lúa', description: '', harvestDate: '', region: '', farmName: '',
        price: '', priceVND: '', isOrganic: false, image: '', quantity: '1', unit: 'kg'
      });
      
      fetchDashboardData(); 
      setAlertInfo({ isOpen: true, title: "Thành công", message: "Đã đăng bán sản phẩm!" });
    } catch (error) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: error.message });
    } finally {
      setBlockchainLoading(false);
    }
  };

  // [ĐÃ SỬA] Hàm xử lý nhập liệu với Logic quy đổi tỷ giá
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const updatedData = { ...prev, [name]: type === 'checkbox' ? checked : value };

      // LOGIC TỰ ĐỘNG TÍNH TOÁN: ETH -> VND
      if (name === 'price') {
        const ethValue = parseFloat(value);
        if (!isNaN(ethValue) && ethValue >= 0) {
           // Tỷ giá: 1 ETH = 82,990,000 VND
           const EXCHANGE_RATE = 82990000;
           const calculatedVND = Math.floor(ethValue * EXCHANGE_RATE);
           updatedData.priceVND = calculatedVND;
        } else {
           updatedData.priceVND = '';
        }
      }

      return updatedData;
    });
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Xóa sản phẩm "${product.name}" khỏi Database?`)) {
        try {
            setLoading(true);
            await productAPI.deleteProduct(product._id);
            setAlertInfo({ isOpen: true, title: "Thành công", message: "Đã xóa." });
            fetchDashboardData(); 
        } catch (error) {
            setAlertInfo({ isOpen: true, title: "Lỗi", message: error.message });
        } finally { setLoading(false); }
    }
  };

  const handleEdit = async (product) => {
    const newPrice = window.prompt(`Nhập giá mới (ETH):`, product.price);
    if (newPrice && !isNaN(parseFloat(newPrice))) {
        try {
            setBlockchainLoading(true);
            const res = await updateProductPriceOnChain(product.blockchainId, newPrice);
            if (!res.success) throw new Error(res.error);
            await productAPI.updateProduct(product._id, { price: parseFloat(newPrice) });
            setAlertInfo({ isOpen: true, title: "Thành công", message: "Đã cập nhật giá." });
            fetchDashboardData(); 
        } catch (error) {
            setAlertInfo({ isOpen: true, title: "Lỗi", message: error.message });
        } finally { setBlockchainLoading(false); }
    }
  };

  const handleConfirmCash = async (product) => {
    try {
      setBlockchainLoading(true); 
      await productAPI.confirmCashPurchase(product._id);
      setAlertInfo({ isOpen: true, title: "Thành công", message: "Đã xác nhận tiền mặt!" });
      fetchDashboardData(); 
    } catch (error) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: error.response?.data?.message });
    } finally {
      setBlockchainLoading(false);
      setProductToConfirmCash(null); 
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Status Bar */}
      <div className={`p-4 rounded-lg mb-6 ${isConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <div>
            <p className="font-medium">{isConnected ? 'Đã kết nối MetaMask' : 'Chưa kết nối MetaMask'}</p>
            {isConnected && <p className="text-sm text-gray-600 mt-1">Ví: {account?.slice(0, 8)}...{account?.slice(-6)}</p>}
          </div>
        </div>
      </div>

      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
            <p className="mt-2 text-gray-600">Quản lý kho hàng nông sản</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} disabled={!isConnected} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg disabled:opacity-50">
          + Đăng bán mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Tổng SP</p><p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Đang bán</p><p className="text-2xl font-bold text-blue-600">{stats.available}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Đã bán hết</p><p className="text-2xl font-bold text-purple-600">{stats.sold}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Yêu cầu hoàn tiền</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
          <p className="text-sm text-gray-500">Chờ Tiền mặt</p><p className="text-2xl font-bold text-indigo-600">{stats.cashPending}</p>
        </div>
      </div>

      {/* Create Form Modal - ĐẦY ĐỦ CÁC TRƯỜNG */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Đăng bán sản phẩm mới</h2>
            {blockchainLoading && <div className="bg-blue-50 p-4 mb-4 text-blue-700"><LoadingSpinner size="small" /> Đang xử lý...</div>}
            
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên sản phẩm *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Loại sản phẩm *</label>
                  <select name="productType" value={formData.productType} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2">
                    <option value="lúa">Lúa</option>
                    <option value="cà phê">Cà phê</option>
                    <option value="tiêu">Tiêu</option>
                    <option value="điều">Điều</option>
                    <option value="trái cây">Trái cây</option>
                    <option value="rau củ">Rau củ</option>
                    <option value="khác">Khác</option>
                  </select>
                </div>
                
                {/* Số lượng & Đơn vị */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số lượng (Tồn kho) *</label>
                  <input type="number" name="quantity" min="1" value={formData.quantity} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2" required placeholder="VD: 100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Đơn vị tính *</label>
                  <select name="unit" value={formData.unit} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2">
                    <option value="kg">Kg</option>
                    <option value="tấn">Tấn</option>
                    <option value="tạ">Tạ</option>
                    <option value="yến">Yến</option>
                    <option value="bao">Bao</option>
                    <option value="lô">Lô</option>
                  </select>
                </div>

                {/* Giá */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giá (ETH) / 1 đơn vị *</label>
                  <input 
                    type="number" 
                    step="0.000001" 
                    min="0" 
                    name="price" 
                    value={formData.price} 
                    onChange={handleInputChange} 
                    className="input-field mt-1 block w-full border rounded-md px-3 py-2 font-bold text-green-600" 
                    required 
                    placeholder="VD: 0.001"
                  />
                  <p className="text-xs text-gray-500 mt-1">1 ETH = 82,990,000 VND</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giá (VND) / 1 đơn vị (Tự động)</label>
                  <input 
                    type="number" 
                    name="priceVND" 
                    value={formData.priceVND} 
                    onChange={handleInputChange} 
                    className="input-field mt-1 block w-full border rounded-md px-3 py-2 bg-gray-100" 
                    required 
                    readOnly 
                    placeholder="Tự động tính..."
                  />
                </div>

                {/* Thông tin khác */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày thu hoạch *</label>
                  <input type="date" name="harvestDate" value={formData.harvestDate} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vùng trồng *</label>
                  <input type="text" name="region" value={formData.region} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên nông trại</label>
                  <input type="text" name="farmName" value={formData.farmName} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Link ảnh sản phẩm</label>
                    <input type="text" name="image" placeholder="https://imgur.com/..." value={formData.image} onChange={handleInputChange} className="input-field mt-1 block w-full border rounded-md px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Mô tả thêm</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="input-field mt-1 block w-full border rounded-md px-3 py-2" />
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <input type="checkbox" name="isOrganic" checked={formData.isOrganic} onChange={handleInputChange} className="h-4 w-4 text-green-600 rounded" />
                <label className="ml-2 block text-sm text-gray-900">Sản phẩm hữu cơ (Organic)</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={blockchainLoading} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center">
                  {blockchainLoading ? 'Đang xử lý...' : 'Đăng bán ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['myProducts', 'cashRequests', 'refundRequests'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'myProducts' && `Sản phẩm của tôi (${stats.total})`}
              {tab === 'cashRequests' && `Yêu cầu Tiền mặt (${stats.cashPending})`}
              {tab === 'refundRequests' && `Yêu cầu Hoàn tiền (${stats.pending})`}
            </button>
          ))}
        </nav>
      </div>

      {/* List Content */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        
        {/* TAB 1: SẢN PHẨM CỦA TÔI */}
        {activeTab === 'myProducts' && (
            <div className="divide-y divide-gray-200">
              {products.length === 0 ? <div className="p-8 text-center text-gray-500">Chưa có sản phẩm nào.</div> : products.map((product) => (
                  <div key={product._id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            {product.name}
                            <span className={`text-xs px-2 py-1 rounded-full ${product.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : product.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                {product.approvalStatus === 'approved' ? 'Đã duyệt' : product.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Bị từ chối'}
                            </span>
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{product.productType} • {product.region}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="font-bold text-green-600">{product.price} ETH / {product.unit}</span>
                            <span className="text-gray-400">|</span>
                            <span className="font-medium">Kho: {product.quantity} {product.unit}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(product)} disabled={product.isSold} className="text-blue-600 hover:underline text-sm disabled:text-gray-400">Sửa giá</button>
                        <button onClick={() => handleDelete(product)} className="text-red-600 hover:underline text-sm">Xóa</button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
        )}

        {/* TAB 2: TIỀN MẶT */}
        {activeTab === 'cashRequests' && (
            <div className="divide-y divide-gray-200">
              {cashPendingRequests.length === 0 ? <div className="p-8 text-center text-gray-500">Chưa có yêu cầu.</div> : cashPendingRequests.map((product) => (
                  <div key={product._id} className="p-6 hover:bg-gray-50 transition flex justify-between items-center">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-600">ID: #{product.blockchainId} • {product.priceVND ? product.priceVND.toLocaleString() : 0} VNĐ</p>
                        <div className="mt-2 text-xs bg-blue-50 inline-block px-2 py-1 rounded">Người mua: {product.buyer || 'N/A'}</div>
                    </div>
                    <button onClick={() => setProductToConfirmCash(product)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Xác nhận đã nhận tiền</button>
                  </div>
              ))}
            </div>
        )}

        {/* TAB 3: HOÀN TIỀN (HIỂN THỊ ORDER) */}
        {activeTab === 'refundRequests' && (
            <div className="divide-y divide-gray-200">
              {refundRequests.length === 0 ? <div className="p-8 text-center text-gray-500">Chưa có yêu cầu hoàn tiền.</div> : refundRequests.map((order) => {
                  // Lấy thông tin sản phẩm từ trong order (đã populate)
                  const product = order.product || { name: 'Sản phẩm đã xóa' };
                  return (
                    <div key={order._id} className="p-6 hover:bg-gray-50 transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 text-red-600">{product.name}</h4>
                                <p className="text-sm text-gray-700 mt-1"><strong>Lý do hoàn tiền:</strong> "{order.refundReason}"</p>
                                <div className="mt-2 text-sm text-gray-600">
                                    <p>💰 Số tiền hoàn: <strong>{parseFloat(order.totalPrice).toFixed(4)} ETH</strong></p>
                                    <p>📦 Số lượng: {order.quantity} {product.unit}</p>
                                    <p className="text-xs mt-1 text-gray-400">Người mua: {order.buyer}</p>
                                </div>
                            </div>
                            <button onClick={() => setOrderToRefund(order)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium shadow-sm">
                                Chấp nhận hoàn tiền
                            </button>
                        </div>
                    </div>
                  );
              })}
            </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal isOpen={!!productToConfirmCash} onClose={() => setProductToConfirmCash(null)} onConfirm={() => handleConfirmCash(productToConfirmCash)} title="Xác nhận bán tiền mặt?" confirmText="Xác nhận" confirmColor="bg-green-600">
        <p>Bạn xác nhận đã nhận đủ tiền và giao hàng cho <strong>"{productToConfirmCash?.name}"</strong>?</p>
      </ConfirmModal>

      <ConfirmModal isOpen={!!orderToRefund} onClose={() => setOrderToRefund(null)} onConfirm={() => handleApproveRefund(orderToRefund)} title="Chấp nhận hoàn tiền?" confirmText="Đồng ý hoàn tiền" confirmColor="bg-yellow-600">
        <p>Bạn sắp hoàn trả <strong>{orderToRefund && parseFloat(orderToRefund.totalPrice).toFixed(4)} ETH</strong> cho người mua.</p>
        <p className="text-sm text-red-500 mt-2">⚠️ MetaMask sẽ bật lên. Bạn cần xác nhận giao dịch chuyển tiền.</p>
      </ConfirmModal>

      <AlertModal isOpen={alertInfo.isOpen} onClose={() => setAlertInfo({ isOpen: false, title: '', message: '' })} title={alertInfo.title}>
        <p>{alertInfo.message}</p>
      </AlertModal>
    </div>
  );
};

export default FarmerDashboard;