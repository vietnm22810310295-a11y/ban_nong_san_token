import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../services/api';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext'; // Đảm bảo đã import cái này
import LoadingSpinner from '../components/LoadingSpinner';

const ProductsPage = () => {
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
  const { addToCart } = useCart(); // Lấy hàm thêm giỏ hàng
  const navigate = useNavigate();

  // --- 1. Hàm load data từ Blockchain ---
  const loadBlockchainProducts = useCallback(async (getProductCount, getProductFromChain) => {
    try {
      if (!web3) return [];

      console.log('⛓️ [BLOCKCHAIN] Đang tải sản phẩm từ blockchain...');
      
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
  }, [web3]); 

  // --- 2. Hàm load data chính ---
  const loadProducts = useCallback(async (currentFilters) => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 [PRODUCTS] Đang tải sản phẩm...');

      const filtersWithStatus = { 
        ...currentFilters, 
        status: 'all' 
      };

      const apiResponse = await productAPI.getProducts(filtersWithStatus);
      
      let apiProducts = [];
      if (apiResponse.data && Array.isArray(apiResponse.data.data)) {
        apiProducts = apiResponse.data.data;
      } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
        apiProducts = apiResponse.data;
      } else if (Array.isArray(apiResponse.data)) {
        apiProducts = apiResponse.data;
      } else if (Array.isArray(apiResponse)) {
        apiProducts = apiResponse;
      } else {
        apiProducts = []; 
      }

      let blockchainProducts = [];
      if (web3) {
        try {
           blockchainProducts = await loadBlockchainProducts(getProductCount, getProductFromChain);
        } catch (bcError) {
           console.warn("Bỏ qua lỗi blockchain khi merge");
        }
      }
      
      // Merge dữ liệu
      const combinedProducts = apiProducts.map(apiProduct => {
        const blockchainProduct = blockchainProducts.find(bp => 
          String(bp.id) === String(apiProduct.blockchainId) || String(bp.id) === String(apiProduct.id)
        );
        
        // [QUAN TRỌNG] Ưu tiên lấy quantity từ Blockchain
        const realQuantity = blockchainProduct ? parseInt(blockchainProduct.quantity) : parseInt(apiProduct.quantity || 0);

        return {
          ...apiProduct,
          ...(blockchainProduct || {}),
          id: blockchainProduct ? blockchainProduct.id : (apiProduct.blockchainId || apiProduct.id),
          _id: apiProduct._id,
          price: blockchainProduct ? blockchainProduct.price : apiProduct.price,
          // Gán đè quantity chuẩn
          quantity: realQuantity
        };
      });

      // [FIX LOGIC PHÂN LOẠI] Dựa hoàn toàn vào số lượng (Quantity)
      // Nếu quantity > 0 => Đang bán (Kể cả status cũ có là gì đi nữa)
      const available = combinedProducts.filter(p => p.quantity > 0);
      
      // Nếu quantity <= 0 => Đã bán hết
      const sold = combinedProducts.filter(p => p.quantity <= 0);

      setAvailableProducts(available);
      setSoldProducts(sold);
      
    } catch (error) {
      console.error('❌ [PRODUCTS] Error loading products:', error);
      setError('Có lỗi khi tải danh sách sản phẩm.');
      setAvailableProducts([]);
      setSoldProducts([]);
    } finally {
      setLoading(false);
    }
  }, [getProductCount, getProductFromChain, loadBlockchainProducts, web3]);

  // --- 3. Hàm load số dư ví ---
  const loadWalletBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const balanceResult = await getBalance();
      if (balanceResult.success) {
        setBalance(balanceResult.balance);
      } 
    } catch (error) {
      console.error('❌ [BALANCE] Error:', error);
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

  // Hàm xử lý thêm nhanh vào giỏ
  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
        return alert("Vui lòng đăng nhập để mua sắm.");
    }
    if (product.farmerWallet.toLowerCase() === user?.walletAddress?.toLowerCase()) {
        return alert("Không thể mua sản phẩm của chính mình.");
    }
    if (product.quantity <= 0) {
        return alert("Sản phẩm đã hết hàng!");
    }
    
    addToCart(product, 1); // Thêm 1 đơn vị
  };

  // --- Component con: ProductCard ---
  const ProductCard = ({ product, isSoldCard = false }) => (
    <div key={product._id || product.id} className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 transition-shadow duration-300 ${isSoldCard ? 'opacity-70' : 'hover:shadow-lg'} flex flex-col`}>
      
      {/* Product Image */}
      <Link to={`/products/${product.id}`} className="block relative h-48 bg-gradient-to-br from-green-50 to-blue-50 group overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img 
            src={product.images[0]} 
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-4xl">🌾</div>
        )}
        {product.isOrganic && (
          <span className="absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 shadow-sm">
            🌱 Hữu cơ
          </span>
        )}
        {isSoldCard && (
           <span className="absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
             🔴 Đã bán hết
           </span>
        )}
      </Link>

      {/* Product Info */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <Link to={`/products/${product.id}`} className="text-xl font-semibold text-gray-900 truncate hover:text-green-600 transition-colors" title={product.name}>
            {product.name}
          </Link>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0 ml-2">
            {product.productType}
          </span>
        </div>

        <div className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
          {product.description || 'Sản phẩm nông sản chất lượng cao'}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium w-20"> Vùng:</span>
            <span className="ml-2 truncate" title={product.region}>{product.region}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium w-20"> Thu hoạch:</span>
            <span className="ml-2">
              {product.harvestDate ? new Date(product.harvestDate).toLocaleDateString('vi-VN') : 'Không có'}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium w-20"> Tồn kho:</span>
            <span className={`ml-2 font-bold ${product.quantity > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {product.quantity} {product.unit || 'kg'}
            </span>
          </div>
        </div>

        <div className="mt-auto">
            <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-green-600">
                    {product.price ? parseFloat(product.price).toFixed(4) : '0.0000'} ETH
                </span>
                <span className="text-xs text-gray-500">/ {product.unit || 'đơn vị'}</span>
            </div>

            {/* Nút Thêm vào giỏ */}
            {!isSoldCard && product.quantity > 0 ? (
                <button
                    onClick={(e) => handleQuickAdd(e, product)}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Thêm vào giỏ
                </button>
            ) : (
                <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed">
                    Đã bán hết
                </button>
            )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 truncate">
            👨‍🌾 Người bán: {product.farmer?.slice(0, 8)}...{product.farmer?.slice(-6)}
          </p>
        </div>
      </div>
    </div>
  );

  // --- 7. Render Chính ---
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

      <div className="grid grid-cols-1 lg:grid-cols-4 lg:gap-8">

        {/* --- SIDEBAR --- */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Ví */}
          {isConnected && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-purple-600">Ví của bạn</p>
                  <p className="text-lg font-bold text-purple-800 break-all">
                    {account?.slice(0, 8)}...{account?.slice(-6)}
                  </p>
                </div>
                <button onClick={loadWalletBalance} disabled={balanceLoading} className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center">
                  {balanceLoading ? <LoadingSpinner size="small" /> : '🔄'}
                </button>
              </div>
              <div className="text-left">
                <p className="text-sm text-purple-600">Số dư</p>
                <div className="text-lg font-bold text-purple-800 flex items-center gap-2">
                  {balanceLoading ? <LoadingSpinner size="small" /> : `${balance} ETH`}
                </div>
              </div>
            </div>
          )}

          {/* Bộ Lọc */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4"> Lọc sản phẩm</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                <input type="text" placeholder="Tên sản phẩm..." className="w-full px-3 py-2 border border-gray-300 rounded-md" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại sản phẩm</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md" value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="lúa">Lúa</option>
                  <option value="cà phê">Cà phê</option>
                  <option value="tiêu">Tiêu</option>
                  <option value="điều">Điều</option>
                  <option value="trái cây">Trái cây</option>
                  <option value="rau củ">Rau củ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vùng miền</label>
                <input type="text" placeholder="Nhập vùng miền..." className="w-full px-3 py-2 border border-gray-300 rounded-md" value={filters.region} onChange={(e) => handleFilterChange('region', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hữu cơ</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md" value={filters.organic} onChange={(e) => handleFilterChange('organic', e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá min</label>
                <input type="number" step="0.001" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={filters.minPrice} onChange={(e) => handleFilterChange('minPrice', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá max</label>
                <input type="number" step="0.001" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={filters.maxPrice} onChange={(e) => handleFilterChange('maxPrice', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              <button onClick={applyFilters} disabled={loading} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? <LoadingSpinner size="small" /> : ' Lọc'}
              </button>
              <button onClick={clearFilters} className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                 Xóa lọc
              </button>
            </div>
          </div>
        </aside>

        {/* --- NỘI DUNG CHÍNH --- */}
        <main className="lg:col-span-3">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
              <span className="text-lg mr-2">⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Grid Đang bán */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">{availableProducts.length} sản phẩm đang bán</h3>
              <span className="text-sm text-gray-600">⛓️ Cập nhật real-time</span>
            </div>

            {availableProducts.length === 0 && !loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableProducts.map((product) => (
                  <ProductCard product={product} isSoldCard={false} key={product._id || product.id} />
                ))}
              </div>
            )}
          </div>

          {/* Grid Đã bán */}
          <hr className="my-12" />
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">{soldProducts.length} sản phẩm đã bán hết</h3>
            {soldProducts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {soldProducts.map((product) => (
                  <ProductCard product={product} isSoldCard={true} key={product._id || product.id} />
                ))}
              </div>
            )}
          </div>

          {isAuthenticated && user?.role === 'farmer' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Bạn có sản phẩm muốn bán?</h3>
              <Link to="/farmer" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                 Đến Farmer Dashboard
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductsPage;