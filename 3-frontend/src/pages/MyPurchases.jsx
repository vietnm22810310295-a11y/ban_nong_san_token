import React, { useState, useEffect, useCallback } from 'react';
import { productAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal'; // [SỬA 1] Import AlertModal
import InputModal from '../components/InputModal'; // [SỬA 2] Import InputModal

const MyPurchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refundLoading, setRefundLoading] = useState(null); 

  const { isAuthenticated } = useAuth(); 

  // [SỬA 3] Thêm state cho các modal
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });
  const [productToRefund, setProductToRefund] = useState(null); // Sản phẩm đang chờ nhập lý do

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
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases();
    }
  }, [isAuthenticated, fetchPurchases]); 

  // [SỬA 4] Sửa hàm này, chỉ để mở modal
  const handleRequestRefund = (product) => {
    setProductToRefund(product); // Mở modal bằng cách set sản phẩm
  };

  // [SỬA 5] Hàm mới, chạy khi người dùng bấm "Gửi" trên InputModal
  const onConfirmRefund = async (reason) => {
    if (!productToRefund) return;

    if (!reason || reason.trim() === '') {
      // [SỬA] Thay thế alert
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Bạn phải nhập lý do để yêu cầu hoàn tiền." });
      return;
    }

    setRefundLoading(productToRefund._id);
    setProductToRefund(null); // Đóng InputModal
    
    try {
      await productAPI.requestRefund(productToRefund._id, reason);
      // [SỬA] Đây là alert trong ảnh của bạn
      setAlertInfo({ isOpen: true, title: "Thành công", message: "Yêu cầu hoàn tiền đã được gửi! Vui lòng chờ Người bán xác nhận." });
      fetchPurchases(); // Tải lại danh sách
    } catch (err) {
      console.error('Error requesting refund:', err);
      // [SỬA] Thay thế alert
      setAlertInfo({ isOpen: true, title: "Lỗi", message: err.response?.data?.message || 'Gửi yêu cầu thất bại.' });
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
    // [SỬA 6] Bọc bằng Fragment
    <>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Hàng đã mua</h1>

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
                      // [SỬA 7] Sửa onClick để mở modal
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

      {/* [SỬA 8] Thêm các modals vào cuối */}
      <InputModal
        isOpen={!!productToRefund}
        onClose={() => setProductToRefund(null)}
        onSubmit={onConfirmRefund}
        title="Yêu cầu hoàn tiền"
        label={`Vui lòng nhập lý do bạn muốn hoàn tiền cho sản phẩm "${productToRefund?.name}":`}
        submitText="Gửi yêu cầu"
      />

      <AlertModal
        isOpen={alertInfo.isOpen}
        onClose={() => setAlertInfo({ isOpen: false, title: '', message: '' })}
        title={alertInfo.title}
      >
        <p>{alertInfo.message}</p>
      </AlertModal>
    </>
  );
};

export default MyPurchases;