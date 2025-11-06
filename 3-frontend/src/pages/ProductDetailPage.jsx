import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { productAPI } from '../services/api'; // [SỬA 1] Import productAPI
import LoadingSpinner from '../components/LoadingSpinner';

const ProductDetailPage = () => {
  const { id } = useParams(); // id này là blockchainId
  const { user, isAuthenticated } = useAuth();
  const { isConnected, account, buyProductOnChain } = useWeb3();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false); // Dùng cho cả 2 loại mua
  const [error, setError] = useState('');

  // [SỬA 2] Sửa hàm fetchProduct để lấy từ Backend (để có _id)
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setProduct(null); 
      setError('');

      // Load từ backend (dùng blockchainId)
      // API này sẽ trả về đầy đủ thông tin (cả _id và blockchainId)
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
  }, [id]); // Bỏ getProductFromChain

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // [SỬA 3] Sửa hàm mua bằng ETH (Blockchain)
  // Thêm logic đồng bộ database sau khi mua thành công
  const handlePurchase = async () => {
    const productPrice = parseFloat(product.price);
    if (isNaN(productPrice) || productPrice <= 0) {
      alert('❌ Lỗi: Giá sản phẩm không hợp lệ.');
      return;
    }

    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để mua hàng');
      return;
    }

    if (!isConnected) {
      alert('Vui lòng kết nối MetaMask để mua hàng');
      return;
    }

    if (product.farmerWallet.toLowerCase() === account.toLowerCase()) {
      alert('Bạn không thể mua sản phẩm của chính mình');
      return;
    }

    if (product.isSold) {
      alert('Sản phẩm này đã được bán');
      return;
    }

    try {
      setPurchasing(true);
      setError('');

      const confirmBuy = window.confirm(
        `Bạn có chắc muốn mua sản phẩm "${product.name}" với giá ${product.price} ETH?`
      );

      if (!confirmBuy) {
        setPurchasing(false); 
        return;
      }

      // BƯỚC 1: Mua hàng trên blockchain
      const result = await buyProductOnChain(product.blockchainId, product.price);
      
      if (result.success) {
        // BƯỚC 2: Đồng bộ Database
        console.log('🚀 [BUY_SYNC] Giao dịch blockchain thành công. Đang cập nhật database...');
        try {
          await productAPI.updateProduct(product._id, { // <-- Dùng product._id
              status: 'sold',
              isSold: true,
              currentOwner: account // Cập nhật chủ sở hữu mới
          });
          console.log('✅ [BUY_SYNC] Cập nhật database thành công!');
        } catch (dbError) {
            console.error('💥 [BUY_SYNC] LỖI CẬP NHẬT DATABASE:', dbError);
            alert('Lỗi nghiêm trọng: Mua trên blockchain thành công, nhưng cập nhật database thất bại. Vui lòng liên hệ admin.');
        }

        alert('✅ Mua hàng thành công! Giao dịch đã được ghi nhận.');
        fetchProduct(); // Tải lại trang
      } else {
        throw new Error(result.error || 'Lỗi khi mua hàng trên blockchain');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      setError('Lỗi khi mua hàng: ' + error.message);
    } finally {
      setPurchasing(false);
    }
  };
  
  // [SỬA 4] Sửa hàm "Tiền mặt"
  const handleCashRequest = async () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để mua hàng');
      return;
    }
    
    if (product.farmerWallet.toLowerCase() === account.toLowerCase()) {
      alert('Bạn không thể mua sản phẩm của chính mình');
      return;
    }

    const confirmCash = window.confirm(`Bạn muốn gửi yêu cầu mua sản phẩm "${product.name}" bằng tiền mặt?\n\nNgười bán sẽ liên hệ với bạn qua thông tin (email/SĐT) trên profile của bạn để xác nhận.`);
    if (!confirmCash) return;

    setPurchasing(true);
    try {
      // Gọi API mới (chúng ta sẽ tạo ở bước sau)
      await productAPI.requestCashPurchase(product._id); 
      alert('✅ Đã gửi yêu cầu thành công!\nTrạng thái sản phẩm đã chuyển thành "Chờ xử lý". Vui lòng chờ Người bán xác nhận.');
      fetchProduct(); // Tải lại trang
    } catch (error) {
      console.error('Cash request error:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || 'Gửi yêu cầu thất bại.'));
    } finally {
      setPurchasing(false);
    }
  };

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

  // [SỬA 5] Tạo một biến mới cho trạng thái
  const statusText = 
    product.status === 'available' ? '🟢 Đang bán' :
    product.status === 'sold' ? '🔴 Đã bán' :
    product.status === 'cash-pending' ? '⏳ Chờ xử lý' : // Trạng thái mới
    product.status === 'refund-requested' ? '🟡 Chờ hoàn tiền' :
    product.status === 'refunded' ? '🟠 Đã hoàn tiền' : 'Không rõ';
  
  const statusColor =
    product.status === 'available' ? 'bg-green-100 text-green-800' :
    product.status === 'sold' ? 'bg-gray-100 text-gray-800' :
    product.status === 'cash-pending' ? 'bg-blue-100 text-blue-800' : // Trạng thái mới
    product.status === 'refund-requested' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  return (
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
              {/* [SỬA 6] Dùng biến trạng thái mới */}
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
            S </div>
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
                  {/* [SỬA 7] Dùng biến trạng thái mới */}
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

          {/* [SỬA 8] Sửa lại toàn bộ Action Buttons */}
          <div className="pt-6 border-t border-gray-200">
            {product.status === 'available' ? ( // Chỉ hiển thị nếu ĐANG BÁN
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chọn phương thức thanh toán</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nút 1: Blockchain (Nút cũ) */}
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
                        <span>🛒 Thanh toán bằng ETH (Blockchain)</span>
                        <span className="text-sm font-normal text-green-100">{parseFloat(product.price).toFixed(3)} ETH</span>
                      </>
                    )}
                  </button>

                  {/* Nút 2: Tiền mặt (Nút mới) */}
                  <button 
                    onClick={handleCashRequest}
                    disabled={purchasing || !isAuthenticated}
                    className="flex flex-col items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-lg transition duration-200"
                  >
                    <span>💵 Yêu cầu mua bằng Tiền mặt</span>
                    <span className="text-sm font-normal text-blue-100">Chờ người bán xác nhận</span>
                  </button>
                </div>
              </>
            ) : (
              // Hiển thị nếu Đã bán, Chờ xử lý, v.v.
              <div className="w-full text-center py-4">
                <div className={`text-2xl mb-2 ${statusColor.replace('bg-', 'text-').replace('-100', '-600')}`}>
                  {statusText.split(' ')[0]} {/* Lấy icon */}
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
  );
};

export default ProductDetailPage;