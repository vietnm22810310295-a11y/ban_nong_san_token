import React, { useState, useEffect, useCallback } from 'react'; // [SỬA 1] Import thêm useCallback
import { productAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const MyPurchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refundLoading, setRefundLoading] = useState(null); // ID sản phẩm đang refund

  const { isAuthenticated } = useAuth(); 

  // [SỬA 2] Bọc hàm fetchPurchases bằng useCallback
  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await productAPI.getMyPurchases();
      setPurchases(response.data.data);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      setError(err.response?.data?.message || 'Không thể tải lịch sử mua hàng.');
    } finally {
      setLoading(false);
    }
  }, []); // Hàm này không có dependency nên mảng là rỗng

  // [SỬA 3] Thêm fetchPurchases vào dependency array của useEffect
  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases();
    }
  }, [isAuthenticated, fetchPurchases]); 

  const handleRequestRefund = async (product) => {
    const reason = window.prompt(`Vui lòng nhập lý do bạn muốn hoàn tiền cho sản phẩm "${product.name}":`);
    if (!reason || reason.trim() === '') {
      alert('Bạn phải nhập lý do để yêu cầu hoàn tiền.');
      return;
    }

    setRefundLoading(product._id);
    try {
      await productAPI.requestRefund(product._id, reason);
      alert('✅ Yêu cầu hoàn tiền đã được gửi! Vui lòng chờ Người bán xác nhận.');
      fetchPurchases(); // Tải lại danh sách
    } catch (err) {
      console.error('Error requesting refund:', err);
      alert('❌ Lỗi: ' + (err.response?.data?.message || 'Gửi yêu cầu thất bại.'));
    } finally {
      setRefundLoading(null);
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🛍️ Hàng đã mua</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🛒</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bạn chưa mua sản phẩm nào</h3>
          <p className="text-gray-600">Hãy quay lại Marketplace để bắt đầu mua sắm!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
          {purchases.map((product) => (
            <div key={product._id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex-1 mb-4 md:mb-0">
                <h2 className="text-lg font-medium text-gray-900">{product.name}</h2>
                <p className="text-sm text-gray-600">{product.price} ETH • ID: {product.blockchainId}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Mua ngày: {new Date(product.updatedAt).toLocaleDateString('vi-VN')}
                </p>
                {product.refundReason && (
                  <p className="text-sm text-yellow-700 mt-2">
                    <strong>Lý do hoàn tiền:</strong> {product.refundReason}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  product.status === 'sold' ? 'bg-purple-100 text-purple-800' :
                  product.status === 'refund-requested' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800' // 'refunded'
                }`}>
                  {product.status === 'sold' ? 'Đã mua' :
                   product.status === 'refund-requested' ? 'Đang chờ hoàn tiền' :
                   'Đã hoàn tiền'}
                </span>

                {product.status === 'sold' && (
                  <button
                    onClick={() => handleRequestRefund(product)}
                    disabled={refundLoading === product._id}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {refundLoading === product._id ? <LoadingSpinner size="small" /> : 'Yêu cầu hoàn tiền'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPurchases;