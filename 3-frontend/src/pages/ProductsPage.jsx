import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productAPI } from '../services/api';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    region: '',
    organic: '',
    minPrice: '',
    maxPrice: '',
    search: ''
  });
  const [balance, setBalance] = useState('0.0000');
  const [purchasingProductId, setPurchasingProductId] = useState(null);

  const { isConnected, account, getProductFromChain, getProductCount, buyProductOnChain, getBalance } = useWeb3();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    loadProducts();
    if (isConnected && account) {
      loadWalletBalance();
    }
  }, [isConnected, account]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 [PRODUCTS] Đang tải sản phẩm...');

      // Load từ backend API
      const apiResponse = await productAPI.getProducts({});
      const apiProducts = apiResponse.data.data;

      console.log('📦 [PRODUCTS] Sản phẩm từ API:', apiProducts.length);

      // Load từ blockchain để lấy thông tin real-time
      const blockchainProducts = await loadBlockchainProducts();
      console.log('⛓️ [PRODUCTS] Sản phẩm từ blockchain:', blockchainProducts.length);
      
      // Kết hợp dữ liệu
      const combinedProducts = apiProducts.map(apiProduct => {
        const blockchainProduct = blockchainProducts.find(bp => 
          bp.id === apiProduct.blockchainId || bp.id === apiProduct.id
        );
        
        const mergedProduct = {
          ...apiProduct,
          ...blockchainProduct,
          // Ưu tiên dữ liệu từ blockchain (trạng thái mới nhất)
          isSold: blockchainProduct ? blockchainProduct.isSold : apiProduct.status === 'sold',
          price: blockchainProduct ? blockchainProduct.price : apiProduct.price,
          id: blockchainProduct ? blockchainProduct.id : apiProduct.blockchainId || apiProduct.id
        };

        console.log('🔗 [PRODUCTS] Merged product:', {
          id: mergedProduct.id,
          name: mergedProduct.name,
          isSold: mergedProduct.isSold,
          price: mergedProduct.price
        });

        return mergedProduct;
      });

      setProducts(combinedProducts);
      
      // 🔍 DEBUG: Kiểm tra products sau khi load
      console.log('✅ [PRODUCTS] Products loaded:', {
        totalProducts: combinedProducts.length,
        availableProducts: combinedProducts.filter(p => !p.isSold && p.status !== 'sold').length,
        user: user,
        isAuthenticated: isAuthenticated,
        userRole: user?.role,
        isConnected: isConnected
      });
      
    } catch (error) {
      console.error('❌ [PRODUCTS] Error loading products:', error);
      setError('Lỗi khi tải sản phẩm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchainProducts = async () => {
    try {
      console.log('⛓️ [BLOCKCHAIN] Đang tải sản phẩm từ blockchain...');
      
      const countResult = await getProductCount();
      if (!countResult.success) {
        console.warn('⚠️ [BLOCKCHAIN] Không thể lấy số lượng sản phẩm');
        return [];
      }

      const totalProducts = countResult.count;
      console.log(`⛓️ [BLOCKCHAIN] Tổng sản phẩm trên blockchain: ${totalProducts}`);

      const productPromises = [];

      for (let i = 1; i <= totalProducts; i++) {
        productPromises.push(getProductFromChain(i));
      }

      const results = await Promise.all(productPromises);
      const successfulProducts = results
        .filter(result => result.success)
        .map(result => result.data);

      console.log(`✅ [BLOCKCHAIN] Loaded ${successfulProducts.length} products from blockchain`);
      
      return successfulProducts;

    } catch (error) {
      console.error('❌ [BLOCKCHAIN] Error loading blockchain products:', error);
      return [];
    }
  };

  const loadWalletBalance = async () => {
    try {
      setBalanceLoading(true);
      console.log('💰 [BALANCE] Đang tải số dư...');
      
      const balanceResult = await getBalance();
      if (balanceResult.success) {
        setBalance(balanceResult.balance);
        console.log('💰 [BALANCE] Số dư mới:', balanceResult.balance);
      } else {
        console.warn('⚠️ [BALANCE] Lỗi lấy số dư:', balanceResult.error);
      }
    } catch (error) {
      console.error('❌ [BALANCE] Error loading balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Remove empty filters
    const cleanFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, v]) => v !== '')
    );
    
    if (Object.keys(cleanFilters).length > 0) {
      fetchProductsFromAPI(cleanFilters);
    } else {
      loadProducts(); // Reload all products if no filters
    }
  };

  const fetchProductsFromAPI = async (filterParams = {}) => {
    try {
      setLoading(true);
      console.log('🔍 [FILTER] Đang lọc sản phẩm:', filterParams);
      
      const response = await productAPI.getProducts(filterParams);
      setProducts(response.data.data);
      
      console.log('✅ [FILTER] Lọc thành công:', response.data.data.length, 'sản phẩm');
    } catch (error) {
      console.error('❌ [FILTER] Lỗi khi lọc sản phẩm:', error);
      setError('Lỗi khi tải sản phẩm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

 const handleBuyProduct = async (product) => {
  console.log('🛒 [BUY] === BẮT ĐẦU MUA HÀNG ===', {
    productId: product.id,
    productName: product.name,
    price: product.price
  });

  if (!isAuthenticated) {
    alert('❌ Vui lòng đăng nhập để mua sản phẩm');
    return;
  }

  if (!isConnected) {
    alert('❌ Vui lòng kết nối MetaMask');
    return;
  }

  try {
    setPurchasingProductId(product.id);
    
    const productPrice = parseFloat(product.price);
    const userBalance = parseFloat(balance);
    const requiredAmount = productPrice + 0.05; // Gas fee dự phòng

    if (userBalance < requiredAmount) {
      alert(`❌ Không đủ ETH!\n\n• Cần: ~${requiredAmount.toFixed(4)} ETH\n• Hiện có: ${balance} ETH\n\nVui lòng nạp thêm ETH.`);
      return;
    }

    const confirmBuy = window.confirm(
      `🛒 Xác nhận mua hàng\n\n` +
      `📦 ${product.name}\n` +
      `💰 ${productPrice.toFixed(4)} ETH\n` +
      `👛 Số dư: ${balance} ETH\n` +
      `⛽ Gas dự kiến: ~0.05 ETH\n\n` +
      `Chấp nhận transaction trong MetaMask?`
    );

    if (!confirmBuy) return;

    console.log('🚀 [BUY] Gọi buyProductOnChain...');
    const result = await buyProductOnChain(product.id, productPrice);
    
    console.log('📋 [BUY] Kết quả:', result);

    if (result.success) {
      alert(`✅ Mua hàng thành công!\n\n📦 ${product.name}\n💰 ${productPrice.toFixed(4)} ETH\n🔗 ${result.transactionHash?.slice(0, 10)}...`);
      
      await loadProducts();
      await loadWalletBalance();
    } else {
      // Hiển thị lỗi chi tiết
      let errorMessage = result.error;
      if (result.suggestion) {
        errorMessage += `\n\n💡 Gợi ý: ${result.suggestion}`;
      }
      if (result.technicalDetails) {
        errorMessage += `\n\n🔧 Chi tiết kỹ thuật: ${result.technicalDetails}`;
      }
      
      alert(`❌ Lỗi mua hàng:\n\n${errorMessage}`);
      await loadProducts(); // Refresh data
    }

  } catch (error) {
    console.error('💥 [BUY] Lỗi tổng:', error);
    alert('❌ Lỗi hệ thống: ' + error.message);
  } finally {
    setPurchasingProductId(null);
  }
};

  const clearFilters = () => {
    console.log('🗑️ [FILTER] Clearing filters');
    setFilters({
      type: '',
      region: '',
      organic: '',
      minPrice: '',
      maxPrice: '',
      search: ''
    });
    loadProducts();
  };

  // Lọc sản phẩm theo filters
  const filteredProducts = products.filter(product => {
    if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.type && product.productType !== filters.type) {
      return false;
    }
    if (filters.region && !product.region.toLowerCase().includes(filters.region.toLowerCase())) {
      return false;
    }
    if (filters.organic) {
      const isOrganic = filters.organic === 'true';
      if (product.isOrganic !== isOrganic) return false;
    }
    if (filters.minPrice && parseFloat(product.price) < parseFloat(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && parseFloat(product.price) > parseFloat(filters.maxPrice)) {
      return false;
    }
    return true;
  });

  const availableProducts = filteredProducts.filter(p => !p.isSold && p.status !== 'sold');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
        <span className="ml-3 text-gray-600">Đang tải sản phẩm...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🛒 Marketplace</h1>
        <p className="mt-2 text-gray-600">Khám phá các sản phẩm nông sản chất lượng từ nông dân</p>
        
        {/* Connection Status */}
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <span className={`inline-flex items-center px-3 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? '✅ Đã kết nối MetaMask' : '❌ Chưa kết nối MetaMask'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isAuthenticated ? `✅ Đã đăng nhập (${user?.role || 'user'})` : '⚠️ Chưa đăng nhập'}
          </span>
        </div>
      </div>

      {/* Wallet Balance */}
      {isConnected && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Ví của bạn</p>
              <p className="text-lg font-bold text-purple-800">
                {account?.slice(0, 8)}...{account?.slice(-6)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-600">Số dư</p>
              <p className="text-lg font-bold text-purple-800">
                {balanceLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  `${balance} ETH`
                )}
              </p>
            </div>
            <button
              onClick={loadWalletBalance}
              disabled={balanceLoading}
              className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center"
              title="Làm mới số dư"
            >
              {balanceLoading ? <LoadingSpinner size="small" /> : '🔄'}
            </button>
          </div>
          {isAuthenticated && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-purple-600">
                💡 Bạn có thể mua sản phẩm bằng số dư ETH trong ví
                {user?.role && (
                  <span className="ml-2">(Role: {user.role})</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{availableProducts.length}</div>
            <div className="text-sm text-green-800">Sản phẩm đang bán</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Array.from(new Set(availableProducts.map(p => p.region))).length}
            </div>
            <div className="text-sm text-blue-800">Vùng miền</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {availableProducts.filter(p => p.isOrganic).length}
            </div>
            <div className="text-sm text-purple-800">Sản phẩm hữu cơ</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {products.length - availableProducts.length}
            </div>
            <div className="text-sm text-orange-800">Đã bán</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 Lọc sản phẩm</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
            <input
              type="text"
              placeholder="Tên sản phẩm..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại sản phẩm</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="lúa">Lúa</option>
              <option value="cà phê">Cà phê</option>
              <option value="tiêu">Tiêu</option>
              <option value="điều">Điều</option>
              <option value="trái cây">Trái cây</option>
              <option value="rau củ">Rau củ</option>
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vùng miền</label>
            <input
              type="text"
              placeholder="Nhập vùng miền..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
            />
          </div>

          {/* Organic Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hữu cơ</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={filters.organic}
              onChange={(e) => handleFilterChange('organic', e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="true">Có</option>
              <option value="false">Không</option>
            </select>
          </div>
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá tối thiểu (ETH)</label>
            <input
              type="number"
              step="0.001"
              placeholder="0.00"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá tối đa (ETH)</label>
            <input
              type="number"
              step="0.001"
              placeholder="1.00"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={clearFilters}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🗑️ Xóa lọc
            </button>
            <button
              onClick={loadProducts}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center transition-colors"
              title="Làm mới danh sách"
            >
              {loading ? <LoadingSpinner size="small" /> : '🔄'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {availableProducts.length} sản phẩm đang bán
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              ⛓️ Cập nhật real-time từ blockchain
            </span>
          </div>
        </div>

        {availableProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
            <p className="text-gray-600 mb-4">Hãy thử thay đổi bộ lọc hoặc tạo sản phẩm mới</p>
            <div className="space-x-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                🗑️ Xóa bộ lọc
              </button>
              {isAuthenticated && user?.role === 'farmer' && (
                <Link
                  to="/farmer"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  👨‍🌾 Thêm sản phẩm mới
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableProducts.map((product) => (
              <div key={product._id || product.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300">
                {/* Product Image */}
                <div className="h-48 bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center relative">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">🌾</span>
                  )}
                  {product.isOrganic && (
                    <span className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      🌱 Hữu cơ
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 truncate" title={product.name}>
                      {product.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0 ml-2">
                      {product.productType}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                    {product.description || 'Sản phẩm nông sản chất lượng cao'}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">🏞️ Vùng:</span>
                      <span className="ml-2 truncate" title={product.region}>{product.region}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">👨‍🌾 Nông trại:</span>
                      <span className="ml-2 truncate" title={product.farmName}>{product.farmName || 'Không có'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">📅 Thu hoạch:</span>
                      <span className="ml-2">
                        {product.harvestDate ? new Date(product.harvestDate).toLocaleDateString('vi-VN') : 'Không có'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-green-600">
                        {parseFloat(product.price).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Link
                      to={`/products/${product.id}`}
                      className="flex-1 text-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      👁️ Chi tiết
                    </Link>
                    
                    {/* Buy Button */}
                    {isAuthenticated && !product.isSold && (
                      <button 
                        onClick={() => handleBuyProduct(product)}
                        disabled={parseFloat(balance) < (parseFloat(product.price) + 0.01) || purchasingProductId === product.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        title={
                          parseFloat(balance) < (parseFloat(product.price) + 0.01) 
                            ? 'Không đủ ETH' 
                            : purchasingProductId === product.id
                            ? 'Đang xử lý...'
                            : 'Mua ngay'
                        }
                      >
                        {purchasingProductId === product.id ? (
                          <>
                            <LoadingSpinner size="small" />
                            <span className="ml-2">Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            🛒 Mua ngay
                            {user?.role && user.role !== 'buyer' && (
                              <span className="text-xs ml-1 opacity-75">*</span>
                            )}
                          </>
                        )}
                      </button>
                    )}
                    
                    {!isAuthenticated && (
                      <button 
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        onClick={() => alert('Vui lòng đăng nhập để mua sản phẩm')}
                      >
                        🔐 Đăng nhập
                      </button>
                    )}
                  </div>

                  {/* Product Metadata */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 truncate">
                      👨‍🌾 Người bán: {product.farmer?.slice(0, 8)}...{product.farmer?.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      🆔 Blockchain ID: {product.id}
                    </p>
                    {/* Debug Info - Only show in development */}
                    {process.env.NODE_ENV === 'development' && (
                      <p className="text-xs text-blue-500 mt-1">
                        🔍 Debug: Auth: {isAuthenticated ? 'Yes' : 'No'}, 
                        Role: {user?.role || 'None'}, 
                        Sold: {product.isSold ? 'Yes' : 'No'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      {isAuthenticated && user?.role === 'farmer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Bạn có sản phẩm muốn bán?</h3>
          <p className="text-blue-700 mb-4">Đăng sản phẩm của bạn lên marketplace ngay!</p>
          <Link
            to="/farmer"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            👨‍🌾 Đến Farmer Dashboard
          </Link>
        </div>
      )}

      {/* Info for non-buyer users */}
      {isAuthenticated && user?.role && user.role !== 'buyer' && availableProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-yellow-800 text-center">
            💡 <strong>Lưu ý:</strong> Bạn đang đăng nhập với role <strong>{user.role}</strong>. 
            Chức năng mua hàng đang được mở rộng cho tất cả người dùng.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;