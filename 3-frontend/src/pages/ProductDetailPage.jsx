import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext'; 
import { productAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';

const ProductDetailPage = () => {
  const { id } = useParams(); 
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart(); 
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setProduct(null); 
      setError('');
      const response = await productAPI.getProduct(id); 
      
      if (response.data.success) {
        setProduct(response.data.data);
        setBuyQuantity(1);
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

  // Tính toán tổng tiền hiển thị
  const totalPriceETH = product ? (parseFloat(product.price) * buyQuantity).toFixed(4) : 0;

  // --- Xử lý Thêm vào Giỏ hàng ---
  const handleAddToCart = () => {
    if (!isAuthenticated) {
        setAlertInfo({ isOpen: true, title: "Yêu cầu", message: "Vui lòng đăng nhập để mua sắm." });
        return;
    }
    if (product.farmerWallet.toLowerCase() === user?.walletAddress?.toLowerCase()) {
        setAlertInfo({ isOpen: true, title: "Lỗi", message: "Bạn không thể mua sản phẩm của chính mình." });
        return;
    }
    if (product.isSold || product.quantity <= 0) {
        setAlertInfo({ isOpen: true, title: "Hết hàng", message: "Sản phẩm này đã hết hàng." });
        return;
    }
    if (buyQuantity > product.quantity) {
        setAlertInfo({ isOpen: true, title: "Lỗi", message: `Chỉ còn lại ${product.quantity} ${product.unit}.` });
        return;
    }
    
    // Thêm vào giỏ
    addToCart(product, buyQuantity);
    
    // Thông báo nhẹ hoặc chuyển hướng (Tùy chọn)
    if(window.confirm("Đã thêm vào giỏ hàng! Bạn có muốn đến giỏ hàng để thanh toán ngay không?")) {
        navigate('/cart');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;
  if (error || !product) return (
    <div className="min-h-screen flex items-center justify-center flex-col">
        <h2 className="text-2xl font-bold mb-4">Không tìm thấy sản phẩm</h2>
        <Link to="/products" className="text-green-600 hover:underline">Quay lại cửa hàng</Link>
    </div>
  );

  const isOutOfStock = product.quantity <= 0 || product.isSold;

  return (
    <>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to="/products" className="text-green-600 hover:text-green-700 font-medium">← Quay lại Marketplace</Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row">
            {/* Cột trái: Ảnh */}
            <div className="md:w-1/2 bg-gray-100 flex items-center justify-center p-6">
                <img 
                    src={product.images?.[0] || 'https://via.placeholder.com/500'} 
                    alt={product.name} 
                    className="max-h-[500px] w-full object-contain rounded-lg shadow-sm"
                />
            </div>

            {/* Cột phải: Thông tin */}
            <div className="md:w-1/2 p-8 flex flex-col">
                <div className="mb-4">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                        {product.productType}
                    </span>
                    {product.isOrganic && (
                        <span className="ml-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Organic</span>
                    )}
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Nông trại: <span className="font-medium text-gray-900">{product.farmName || 'Không rõ'}</span> • 
                    Vùng: <span className="font-medium text-gray-900">{product.region}</span>
                </p>

                <div className="border-t border-b border-gray-100 py-4 mb-6">
                    <div className="flex items-baseline justify-between mb-2">
                        <span className="text-gray-600">Giá bán:</span>
                        <div className="text-right">
                            <span className="text-3xl font-bold text-green-600">{parseFloat(product.price).toFixed(4)} ETH</span>
                            <span className="text-gray-400 text-sm ml-1">/ {product.unit}</span>
                        </div>
                    </div>
                    <div className="flex justify-end text-sm text-gray-500">
                        ≈ {new Intl.NumberFormat('vi-VN').format(product.priceVND)} VND
                    </div>
                </div>

                {!isOutOfStock && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-medium text-gray-700">Chọn số lượng:</label>
                            <span className="text-sm text-blue-600 font-medium">Tồn kho: {product.quantity} {product.unit}</span>
                        </div>
                        <div className="flex items-center">
                            <button onClick={() => setBuyQuantity(prev => Math.max(1, prev - 1))} className="w-10 h-10 border rounded-l bg-white hover:bg-gray-100 font-bold text-gray-600">-</button>
                            <input type="number" value={buyQuantity} onChange={(e) => { const val = parseInt(e.target.value); if (val > 0 && val <= product.quantity) setBuyQuantity(val); }} className="w-20 h-10 text-center border-t border-b focus:outline-none font-medium" />
                            <button onClick={() => setBuyQuantity(prev => Math.min(product.quantity, prev + 1))} className="w-10 h-10 border rounded-r bg-white hover:bg-gray-100 font-bold text-gray-600">+</button>
                            <div className="ml-auto text-right">
                                <div className="text-sm text-gray-500">Tổng tiền tạm tính:</div>
                                <div className="font-bold text-green-700">{totalPriceETH} ETH</div>
                            </div>
                        </div>
                    </div>
                )}

                {isOutOfStock ? (
                    <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-4 rounded-lg cursor-not-allowed">🚫 ĐÃ HẾT HÀNG</button>
                ) : (
                    <div className="mt-auto">
                        {/* [CHỈ CÒN 1 NÚT DUY NHẤT] */}
                        <button 
                            onClick={handleAddToCart}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-lg shadow-md transition flex items-center justify-center gap-2 text-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Thêm vào giỏ hàng
                        </button>
                    </div>
                )}
            </div>
        </div>
        
        {/* --- PHẦN CHI TIẾT SẢN PHẨM (ĐÃ LÀM ĐẸP) --- */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header của section */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-800">Thông tin chi tiết</h3>
            </div>

            <div className="p-6">
                {/* Phần Mô tả */}
                <div className="mb-8">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Mô tả sản phẩm</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base bg-gray-50 p-4 rounded-lg border border-gray-100">
                        {product.description || 'Người bán chưa cung cấp mô tả chi tiết cho sản phẩm này.'}
                    </p>
                </div>
                
                {/* Phần Metadata (Grid 3 cột) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Thẻ Người bán */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100 transition hover:shadow-md">
                        <div className="p-3 bg-white rounded-full shadow-sm text-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Người bán</p>
                            <p className="text-sm font-mono text-gray-700 truncate mt-1" title={product.farmerWallet}>
                                {product.farmerWallet}
                            </p>
                        </div>
                    </div>

                    {/* Thẻ Ngày đăng */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-50 border border-purple-100 transition hover:shadow-md">
                        <div className="p-3 bg-white rounded-full shadow-sm text-purple-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">Ngày đăng bán</p>
                            <p className="text-sm font-medium text-gray-700 mt-1">
                                {new Date(product.createdAt).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Thẻ Blockchain ID */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100 transition hover:shadow-md">
                        <div className="p-3 bg-white rounded-full shadow-sm text-orange-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Blockchain ID</p>
                            <p className="text-lg font-bold text-gray-800 mt-0.5">
                                #{product.blockchainId}
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>

      </div> {/* Đóng container max-w-6xl */}

      <AlertModal isOpen={alertInfo.isOpen} onClose={() => setAlertInfo({ isOpen: false, title: '', message: '' })} title={alertInfo.title}><p>{alertInfo.message}</p></AlertModal>
    </>
  );
};

export default ProductDetailPage;