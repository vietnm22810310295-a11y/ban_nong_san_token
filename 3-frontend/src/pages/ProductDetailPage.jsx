import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { isConnected, account, getProductFromChain, buyProductOnChain } = useWeb3();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');

      // Load từ blockchain
      const blockchainResult = await getProductFromChain(id);
      
      if (blockchainResult.success) {
        setProduct(blockchainResult.data);
      } else {
        setError('Không tìm thấy sản phẩm trên blockchain');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Lỗi khi tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để mua hàng');
      return;
    }

    if (!isConnected) {
      alert('Vui lòng kết nối MetaMask để mua hàng');
      return;
    }

    if (user?.role !== 'buyer') {
      alert('Chỉ người mua mới có thể mua sản phẩm');
      return;
    }

    if (product.farmer === account) {
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

      if (!confirmBuy) return;

      // Mua hàng trên blockchain
      const result = await buyProductOnChain(product.id, product.price);
      
      if (result.success) {
        alert('✅ Mua hàng thành công! Giao dịch đã được ghi nhận trên Blockchain');
        // Refresh product data
        fetchProduct();
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
          <p className="text-gray-600 mb-6">{error}</p>
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
              Kết nối MetaMask để mua hàng trên Blockchain
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
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                !product.isSold 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {!product.isSold ? '🟢 Có sẵn' : '🔴 Đã bán'}
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
              🔗 Blockchain ID: {product.id}
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
                  <span className={`font-medium ${!product.isSold ? 'text-green-600' : 'text-gray-600'}`}>
                    {!product.isSold ? '🟢 Đang bán' : '🔴 Đã bán'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hữu cơ:</span>
                  <span className="font-medium">{product.isOrganic ? '✅ Có' : '❌ Không'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blockchain ID:</span>
                  <span className="font-medium">{product.id}</span>
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
                  {product.farmer}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 Thông tin chủ sở hữu</h3>
              <div className="text-sm">
                <p className="text-gray-600 break-all">
                  <strong>Ví hiện tại:</strong><br />
                  {product.owner}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            {!product.isSold ? (
              <>
                <button 
                  onClick={handlePurchase}
                  disabled={purchasing || !isConnected || !isAuthenticated || user?.role !== 'buyer'}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium text-lg transition duration-200 flex items-center justify-center"
                >
                  {purchasing ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Đang xử lý...</span>
                    </>
                  ) : (
                    `🛒 Mua ngay - ${parseFloat(product.price).toFixed(3)} ETH`
                  )}
                </button>
                <button 
                  disabled
                  className="flex-1 border border-gray-300 text-gray-400 py-3 px-6 rounded-lg font-medium text-lg transition duration-200"
                >
                  📞 Liên hệ nông dân (Coming soon)
                </button>
              </>
            ) : (
              <div className="w-full text-center py-4">
                <div className="text-2xl text-gray-500 mb-2">✅</div>
                <p className="text-gray-600 font-medium">Sản phẩm đã được bán</p>
              </div>
            )}
          </div>

          {/* Purchase Info */}
          {!product.isSold && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <span className="mr-2">ℹ️</span>
                Thông tin mua hàng Blockchain
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Giao dịch được ghi nhận vĩnh viễn trên Blockchain</li>
                <li>• Cần có MetaMask và ETH để thanh toán</li>
                <li>• Phí gas sẽ được tính thêm cho giao dịch</li>
                <li>• Quyền sở hữu chuyển sang ví của bạn ngay lập tức</li>
                <li>• Không thể hoàn tác sau khi giao dịch thành công</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;