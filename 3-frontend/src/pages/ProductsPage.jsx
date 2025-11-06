import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productAPI } from '../services/api';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductsPage = () => {
  // --- TOÀN BỘ LOGIC, STATE, VÀ HOOKS (KHÔNG THAY ĐỔI) ---
  const [availableProducts, setAvailableProducts] = useState([]);
  const [soldProducts, setSoldProducts] = useState([]);
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
  
  const { isConnected, account, web3, getProductFromChain, getProductCount, getBalance } = useWeb3();
  const { isAuthenticated, user } = useAuth();

  // --- (Tất cả các hàm logic như loadProducts, loadBlockchainProducts, ... đều giữ nguyên) ---
  const loadProducts = useCallback(async (currentFilters) => {
    try {
      setLoading(true);
      setError('');
      const apiResponse = await productAPI.getProducts({ 
        ...currentFilters, 
        status: '' 
      });
      const apiProducts = apiResponse.data.data;
      const blockchainProducts = await loadBlockchainProducts(getProductCount, getProductFromChain);
      
      const combinedProducts = apiProducts.map(apiProduct => {
        const blockchainProduct = blockchainProducts.find(bp => 
          bp.id === apiProduct.blockchainId || bp.id === apiProduct.id
        );
        
        const mergedProduct = {
          ...apiProduct,
          ...blockchainProduct,
          isSold: blockchainProduct ? blockchainProduct.isSold : apiProduct.status === 'sold',
          price: blockchainProduct ? blockchainProduct.price : apiProduct.price,
          id: blockchainProduct ? blockchainProduct.id : apiProduct.blockchainId || apiProduct.id,
          _id: apiProduct._id 
        };
        return mergedProduct;
      });

      const available = combinedProducts.filter(p => !p.isSold && p.status !== 'sold');
      const sold = combinedProducts.filter(p => p.isSold || p.status === 'sold');

      setAvailableProducts(available);
      setSoldProducts(sold);
    } catch (error) {
      console.error('❌ [PRODUCTS] Error loading products:', error);
      setError('Lỗi khi tải sản phẩm: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [getProductCount, getProductFromChain]);

  const loadBlockchainProducts = useCallback(async (getProductCount, getProductFromChain) => {
    try {
      const countResult = await getProductCount();
      if (!countResult.success) {
        console.warn('⚠️ [BLOCKCHAIN] Không thể lấy số lượng sản phẩm');
        return [];
      }
      const totalProducts = countResult.count;
      const productPromises = [];
      for (let i = 1; i <= totalProducts; i++) {
        productPromises.push(getProductFromChain(i));
      }
      const results = await Promise.all(productPromises);
      const successfulProducts = results
        .filter(result => result.success)
        .map(result => result.data);
      return successfulProducts;
    } catch (error) {
      console.error('❌ [BLOCKCHAIN] Error loading blockchain products:', error);
      return [];
    }
  }, []);

  const loadWalletBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const balanceResult = await getBalance();
      if (balanceResult.success) {
        setBalance(balanceResult.balance);
      }
    } catch (error) {
      console.error('❌ [BALANCE] Error loading balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  }, [getBalance]);

  useEffect(() => {
    loadProducts(filters);
    if (isConnected && account && web3) { 
      loadWalletBalance();
    }
  }, [isConnected, account, web3, loadProducts, filters, loadWalletBalance]);

  const handleFilterChange = (key, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: value
    }));
  };

  const applyFilters = () => {
    loadProducts(filters); 
  };

  const clearFilters = () => {
    const newFilters = {
      type: '',
      region: '',
      organic: '',
      minPrice: '',
      maxPrice: '',
      search: ''
    };
    setFilters(newFilters);
    loadProducts(newFilters);
  };

  // --- Component Card Sản phẩm (Đã khôi phục) ---
  const ProductCard = ({ product, isSoldCard = false }) => (
    <div key={product._id || product.id} className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 transition-shadow duration-300 ${isSoldCard ? 'opacity-70' : 'hover:shadow-lg'}`}>
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
        {isSoldCard && (
           <span className="absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
             🔴 Đã bán
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
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium w-20">📦 Số lượng:</span>
            <span className="ml-2">{product.quantity || 1} {product.unit || 'lô'}</span>
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
          
          {isAuthenticated && !product.isSold && (
            <Link 
              to={`/products/${product.id}`}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              🛒 Mua ngay
            </Link>
          )}
          
          {!isAuthenticated && !product.isSold && (
            <Link 
              to={`/products/${product.id}`}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              🛒 Mua ngay
            </Link>
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
        </div>
      </div>
    </div>
  );
  // --- HẾT PRODUCT CARD ---

  // --- JSX Render chính (Bố cục 2 cột) ---
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
      
      {/* --- Header --- */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🛒 Marketplace</h1>
        <p className="mt-2 text-gray-600">Khám phá các sản phẩm nông sản chất lượng từ nông dân</p>
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <span className={`inline-flex items-center px-3 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? '✅ Đã kết nối MetaMask' : '❌ Chưa kết nối MetaMask'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
           {isAuthenticated ? `✅ Đã đăng nhập (${user?.role || 'user'})` : '⚠️ Chưa đăng nhập'}
          </span>
        </div>
      </div>

      {/* Bố cục 2 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-4 lg:gap-8">

        {/* --- CỘT SIDEBAR (BÊN TRÁI) --- */}
        <aside className="lg:col-span-1 space-y-6">

          {/* 1. Thẻ Ví */}
          {isConnected && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-purple-600">Ví của bạn</p>
                  <p className="text-lg font-bold text-purple-800 break-all">
                    {account?.slice(0, 8)}...{account?.slice(-6)}
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
              <div className="text-left">
                <p className="text-sm text-purple-600">Số dư</p>
                <p className="text-lg font-bold text-purple-800">
                  {balanceLoading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    `${balance} ETH`
                  )}
                </p>
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

          {/* 2. Thẻ Lọc */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 Lọc sản phẩm</h3>
            <div className="grid grid-cols-1 gap-4">
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

              {/* Price Range */}
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

              <div className="grid grid-cols-1 gap-2 mt-2">
               <button
                  onClick={applyFilters}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                  title="Áp dụng bộ lọc"
                >
                  {loading ? <LoadingSpinner size="small" /> : '🔍 Lọc'}
                </button>
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  🗑️ Xóa lọc
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* --- CỘT NỘI DUNG CHÍNH (BÊN PHẢI) --- */}
        <main className="lg:col-span-3">

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
             <div className="flex items-center">
                <span className="text-lg mr-2">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Products Grid - Đang bán */}
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableProducts.map((product) => (
                  <ProductCard product={product} isSoldCard={false} key={product._id || product.id} />
                ))}
          	  </div>
            )}
  	    </div>

          {/* Products Grid - Đã bán */}
          <hr className="my-12" />
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {soldProducts.length} sản phẩm đã bán
              </h3>
            </div>

    	    {soldProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Chưa có sản phẩm nào được bán.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {soldProducts.map((product) => (
                  <ProductCard product={product} isSoldCard={true} key={product._id || product.id} />
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

        </main>
      </div>
    </div>
  );
};

export default ProductsPage;