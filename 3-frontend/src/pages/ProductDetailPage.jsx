// src/pages/ProductDetailPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { productAPI, paymentAPI } from '../services/api'; // [SỬA VNPAY 1] Import thêm paymentAPI
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';

const ProductDetailPage = () => {
  const { id } = useParams(); // id này là blockchainId
  const { user, isAuthenticated } = useAuth();
  const { isConnected, account, buyProductOnChain } = useWeb3();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });
  const [showConfirmBuy, setShowConfirmBuy] = useState(false);
  const [showConfirmCash, setShowConfirmCash] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setProduct(null); 
      setError('');
      const response = await productAPI.getProduct(id); 
      
      if (response.data.success) {
        setProduct(response.data.data);
      } else {
        setError(`Không tìm thấy sản phẩm với ID: ${id}`);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError(error.response?.data?.message || 'Lỗi khi tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [id]); 

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // --- Xử lý Mua ETH ---
  const handlePurchase = async () => {
    const productPrice = parseFloat(product.price);
    if (isNaN(productPrice) || productPrice <= 0) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Giá sản phẩm không hợp lệ." });
      return;
    }
    if (!isAuthenticated) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Vui lòng đăng nhập để mua hàng." });
      return;
    }
    if (!isConnected) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Vui lòng kết nối MetaMask để mua hàng." });
      return;
    }
    if (product.farmerWallet.toLowerCase() === account.toLowerCase()) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Bạn không thể mua sản phẩm của chính mình." });
      return;
    }
    if (product.isSold || product.status !== 'available') {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Sản phẩm này đã được bán hoặc không có sẵn." });
      return;
    }
    setShowConfirmBuy(true);
  };

  const onConfirmPurchase = async () => {
    setShowConfirmBuy(false);
    try {
      setPurchasing(true);
      setError('');

      const result = await buyProductOnChain(product.blockchainId, product.price);
      
      if (result.success) {
        await productAPI.updateProduct(product._id, {
            status: 'sold',
            isSold: true,
            currentOwner: account 
        });

        navigate('/invoice', { 
          state: { 
            orderData: {
              productId: product._id,
              name: product.name,
              productType: product.productType,
              region: product.region,
              price: product.price, // Giá ETH
                priceVND: product.priceVND, // [SỬA LOGIC] Gửi cả giá VND
              image: product.images?.[0] || '',
              seller: product.farmerWallet,
              buyer: account,
              paymentMethod: 'crypto',
              txHash: result.txHash 
            }
          } 
        });
      } else {
        throw new Error(result.error || 'Lỗi khi mua hàng trên blockchain');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setAlertInfo({ isOpen: true, title: "Lỗi khi mua hàng", message: error.message });
      setError('Lỗi khi mua hàng: ' + error.message);
    } finally {
      setPurchasing(false);
    }
  };
  
  // --- Xử lý Mua Tiền mặt ---
  const handleCashRequest = async () => {
    if (!isAuthenticated) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Vui lòng đăng nhập để mua hàng." });
      return;
    }
    if (product.farmerWallet.toLowerCase() === account.toLowerCase()) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Bạn không thể mua sản phẩm của chính mình." });
      return;
    }
    setShowConfirmCash(true);
  };

  const onConfirmCashRequest = async () => {
    setShowConfirmCash(false); 
    setPurchasing(true);
    try {
      await productAPI.requestCashPurchase(product._id); 
      
      navigate('/invoice', { 
        state: { 
          orderData: {
            productId: product._id,
            name: product.name,
            productType: product.productType,
            region: product.region,
            price: product.price, // Giá ETH
              priceVND: product.priceVND, // [SỬA LOGIC] Gửi cả giá VND
            image: product.images?.[0] || '',
            seller: product.farmerWallet,
            buyer: user?.walletAddress || 'Bạn',
            paymentMethod: 'cash',
            txHash: null 
          }
        } 
      });
    } catch (error) {
      console.error('Cash request error:', error);
      setAlertInfo({ isOpen: true, title: "Lỗi", message: error.response?.data?.message || 'Gửi yêu cầu thất bại.' });
    } finally {
      setPurchasing(false);
    }
  };

  // --- Xử lý VNPAY ---
  const handleVnPayRequest = async () => {
    if (!isAuthenticated) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Vui lòng đăng nhập để thanh toán VNPAY." });
      return;
    }

    const amountInVND = product.priceVND; 
    const blockchainId = product.blockchainId;

    if (!amountInVND || amountInVND < 1000) {
        setAlertInfo({ isOpen: true, title: "Lỗi", message: "Sản phẩm này không hỗ trợ thanh toán VNPAY hoặc giá quá nhỏ (dưới 1,000 VND)." });
        return;
    }
    if (!blockchainId) {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Không tìm thấy Blockchain ID của sản phẩm." });
      return;
    }

    setPurchasing(true); 
    try {
      const orderInfo = `Thanh toan cho san pham ${product.name} (ID: ${blockchainId})`;
      const response = await paymentAPI.createPaymentUrl(amountInVND, orderInfo, blockchainId);
      
      if (response.data.success) {
        // Lưu dữ liệu vào sessionStorage
        const orderData = {
          productId: product._id,
          name: product.name,
          productType: product.productType,
          region: product.region,
          price: product.price, // Giá ETH
          priceVND: product.priceVND, // Giá VND
          image: product.images?.[0] || '',
          seller: product.farmerWallet,
          buyer: account,
          paymentMethod: 'vnpay', 
          txHash: null 
        };
        sessionStorage.setItem('pendingVnpayOrder', JSON.stringify(orderData));
        
        // Chuyển hướng
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data.message || "Không thể tạo link thanh toán");
      }
    } catch (error) {
      console.error('VNPAY Error:', error);
      setAlertInfo({ isOpen: true, title: "Lỗi VNPAY", message: error.response?.data?.message || "Không thể tạo giao dịch VNPAY." });
      setPurchasing(false);
    }
  };

  // --- Phần Hiển thị (Render) ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl text-gray-400 mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy sản phẩm</h2>
          <p className="text-gray-600 mb-6">{error || 'Sản phẩm không có hoặc đã bị xóa.'}</p>
          <Link 
            to="/products" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            🛒 Quay lại Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const statusText = 
    product.status === 'available' ? '🟢 Đang bán' :
    product.status === 'sold' ? '🔴 Đã bán' :
    product.status === 'cash-pending' ? '⏳ Chờ xử lý' : 
    product.status === 'refund-requested' ? '🟡 Chờ hoàn tiền' :
    product.status === 'refunded' ? '🟠 Đã hoàn tiền' : 'Không rõ';
  
  const statusColor =
    product.status === 'available' ? 'bg-green-100 text-green-800' :
    product.status === 'sold' ? 'bg-gray-100 text-gray-800' :
    product.status === 'cash-pending' ? 'bg-blue-100 text-blue-800' : 
    product.status === 'refund-requested' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  return (
    <>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link 
            to="/products" 
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            ← Quay lại Marketplace
          </Link>
        </div>

        {/* Web3 Status */}
        {!isConnected && !product.isSold && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-yellow-600 text-lg mr-2">⚠️</span>
              <p className="text-yellow-800">
                Kết nối MetaMask để thanh toán bằng ETH
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-lg mr-2">❌</span>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          {/* Product Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">{product.name}</h1>
                <p className="text-green-100 text-lg mt-1">{product.productType}</p>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className="text-3xl font-bold">{parseFloat(product.price).toFixed(3)} ETH</div>
                {/* [SỬA VNPAY] Hiển thị thêm giá VND nếu có */}
                {product.priceVND && (
                  <div className="text-lg font-medium text-green-100">
                    ({new Intl.NumberFormat('vi-VN').format(product.priceVND)} VNĐ)
                  </div>
                )}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusColor}`}>
                  {statusText}
                </div>
              </div>
            </div>
          </div>

          {/* Product Content */}
          <div className="p-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {product.isOrganic && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  🌱 Hữu cơ
                </span>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                📍 {product.region}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                🗓️ {new Date(product.harvestDate).toLocaleDateString('vi-VN')}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                🔗 Blockchain ID: {product.blockchainId}
              </span>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 Mô tả sản phẩm</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                {product.description || 'Sản phẩm nông sản chất lượng cao từ nông trại.'}
            </p>
            </div>

            {/* Product Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Farm Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏞️ Thông tin nông trại</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tên nông trại:</span>
                    <span className="font-medium">{product.farmName || 'Không có'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vùng miền:</span>
                    <span className="font-medium">{product.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngày thu hoạch:</span>
                    <span className="font-medium">{new Date(product.harvestDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngày tạo:</span>
                    <span className="font-medium">{new Date(product.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📦 Thông tin sản phẩm</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loại sản phẩm:</span>
                    <span className="font-medium">{product.productType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <span className={`font-medium ${statusColor.replace('bg-', 'text-').replace('-100', '-600')}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hữu cơ:</span>
                    <span className="font-medium">{product.isOrganic ? '✅ Có' : '❌ Không'}</span>
                  </div>
                  <div className="flex justify-between">
                  <span className="text-gray-600">Blockchain ID:</span>
                    <span className="font-medium">{product.blockchainId}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👨‍🌾 Thông tin người bán</h3>
                <div className="text-sm">
                  <p className="text-gray-600 break-all">
                    <strong>Ví nông dân:</strong><br />
                    {product.farmerWallet}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 Thông tin chủ sở hữu</h3>
                <div className="text-sm">
                  <p className="text-gray-600 break-all">
                    <strong>Ví hiện tại:</strong><br />
                    {product.currentOwner}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-gray-200">
              {product.status === 'available' ? ( 
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Chọn phương thức thanh toán</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Nút 1: Blockchain */}
                    <button 
                      onClick={handlePurchase}
                      disabled={purchasing || !isConnected || !isAuthenticated}
                      className="flex flex-col items-center justify-center p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-lg transition duration-200"
          	  >
          	        {purchasing ? (
                      	<>
                        	<LoadingSpinner size="small" />
                        	<span className="ml-2">Đang xử lý...</span>
                      	</>
                    	) : (
                      	<>
                        	<span>🛒 Thanh toán bằng ETH</span>
                        	<span className="text-sm font-normal text-green-100">{parseFloat(product.price).toFixed(3)} ETH</span>
                      	</>
                    	)}
                  	</button>

                  	{/* Nút 2: Tiền mặt */}
                  	<button 
                    	onClick={handleCashRequest}
                    	disabled={purchasing || !isAuthenticated}
                  	 	className="flex flex-col items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-lg transition duration-200"
                  	>
                    	<span>💵 Yêu cầu Tiền mặt</span>
                    	<span className="text-sm font-normal text-blue-100">Chờ xác nhận</span>
                  	</button>

                  	{/* Nút VNPAY */}
                  	<button 
                    	onClick={handleVnPayRequest}
                    	disabled={purchasing || !isAuthenticated || !product.priceVND}
                    	className="flex flex-col items-center justify-center p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-lg transition duration-200"
                  	>
                    	<span>💳 Thanh toán VNPAY</span>
                    	{product.priceVND ? (
                      	<span className="text-sm font-normal text-red-100">
                        	{new Intl.NumberFormat('vi-VN').format(product.priceVND)} VNĐ
                      	</span>
                    	) : (
                    	<span className="text-sm font-normal text-red-100">Không hỗ trợ</span>
                    	)}
                  	</button>
              </div>
              	</>
            	) : (
              	<div className="w-full text-center py-4">
                	<div className={`text-2xl mb-2 ${statusColor.replace('bg-', 'text-').replace('-100', '-600')}`}>
                  	{statusText.split(' ')[0]}
                	</div>
                	<p className="text-gray-600 font-medium">{statusText}</p>
              	{product.status === 'cash-pending' && (
                  	<p className="text-gray-500 text-sm mt-1">Vui lòng chờ Người bán xác nhận đơn hàng này.</p>
                	)}
              	</div>
            	)}
          	</div>
        	</div>
      	</div>
    	</div>

    	<AlertModal
      	isOpen={alertInfo.isOpen}
        	onClose={() => setAlertInfo({ isOpen: false, title: '', message: '' })}
      	title={alertInfo.title}
    	>
      	<p style={{ whiteSpace: 'pre-line' }}>{alertInfo.message}</p> 
    	</AlertModal>

    	<ConfirmModal
      	isOpen={showConfirmBuy}
      	onClose={() => setShowConfirmBuy(false)}
      	onConfirm={onConfirmPurchase}
      	title="Xác nhận mua hàng?"
      	confirmText="Mua ngay"
      	confirmColor="bg-green-600"
    >
      	<p>Bạn có chắc muốn mua sản phẩm <strong className="font-semibold">"{product?.name}"</strong> với giá <strong className="font-semibold">{product?.price} ETH</strong>?</p>
    	</ConfirmModal>

    	<ConfirmModal
      	isOpen={showConfirmCash}
      	onClose={() => setShowConfirmCash(false)}
      	onConfirm={onConfirmCashRequest}
      	title="Xác nhận mua tiền mặt?"
      	confirmText="Gửi yêu cầu"
      	confirmColor="bg-blue-600"
  	>
      	<p>Bạn muốn gửi yêu cầu mua sản phẩm <strong className="font-semibold">"{product?.name}"</strong> bằng tiền mặt?</p>
      	<p className="text-sm text-gray-600 mt-2">Người bán sẽ liên hệ với bạn qua thông tin (email/SĐT) trên profile của bạn để xác nhận.</p>
  	</ConfirmModal>
  	</>
  );
};

export default ProductDetailPage;