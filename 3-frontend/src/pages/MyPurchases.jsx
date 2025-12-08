import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';
import InputModal from '../components/InputModal';

const MyPurchases = () => {
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refundLoading, setRefundLoading] = useState(null); 

  const { isAuthenticated } = useAuth(); 

  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });
  const [orderToRefund, setOrderToRefund] = useState(null); // [SỬA] Đổi tên state thành orderToRefund cho rõ nghĩa

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await productAPI.getMyPurchases();
      
      if (response.data.success) {
          setOrders(response.data.data);
      } else {
          setOrders([]);
      }
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

  // [SỬA] Hàm mở modal (nhận vào cả object Order)
  const handleRequestRefund = (order) => {
    setOrderToRefund(order); 
  };

  // [SỬA] Hàm gửi yêu cầu hoàn tiền (Gửi Order ID)
  const onConfirmRefund = async (reason) => {
    if (!orderToRefund) return;

    if (!reason || reason.trim() === '') {
      setAlertInfo({ isOpen: true, title: "Lỗi", message: "Bạn phải nhập lý do để yêu cầu hoàn tiền." });
      return;
    }

    setRefundLoading(orderToRefund._id);
    const orderId = orderToRefund._id; // Lưu lại ID để dùng
    setOrderToRefund(null); 
    
    try {
      // Gọi API với ID của Đơn hàng (Order)
      await productAPI.requestRefund(orderId, reason);
      
      setAlertInfo({ isOpen: true, title: "Thành công", message: "Yêu cầu hoàn tiền đã được gửi! Vui lòng chờ Người bán xác nhận." });
      fetchPurchases(); 
    } catch (err) {
      console.error('Error requesting refund:', err);
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
    <>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6"> Lịch sử mua hàng</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Bạn chưa mua sản phẩm nào</h2>
            <p className="text-gray-600 mb-6">Hãy quay lại Marketplace để bắt đầu mua sắm!</p>
            <Link to="/products" className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">
                Xem sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => {
                const product = order.product || { name: 'Sản phẩm đã bị xóa', price: 0, images: [] };
                
                return (
                    <div key={order._id} className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row gap-6 border-l-4 border-green-500">
                    {/* Ảnh sản phẩm */}
                    <div className="w-full md:w-32 h-32 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                        <img 
                        src={product.images?.[0] || 'https://via.placeholder.com/150?text=No+Image'} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {e.target.src = 'https://via.placeholder.com/150?text=Error'}}
                        />
                    </div>

                    {/* Thông tin chi tiết */}
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Ngày mua: {new Date(order.createdAt).toLocaleString('vi-VN')}
                            </p>
                        </div>
                        
                        <div className="text-right">
                            {/* [SỬA QUAN TRỌNG] Dùng order.status thay vì product.status */}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                order.status === 'refund-requested' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                                'bg-green-100 text-green-800'
                            }`}>
                                {order.status === 'refund-requested' ? '⏳ Đang chờ hoàn tiền' :
                                 order.status === 'refunded' ? '↩️ Đã hoàn tiền' :
                                 '✅ Đã thanh toán'}
                            </span>
                        </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-gray-50 p-2 rounded">
                            <span className="block text-gray-500 text-xs">Đơn giá</span>
                            <span className="font-medium">{product.price} ETH</span>
                        </div>
                        <div className="bg-blue-50 p-2 rounded border border-blue-100">
                            <span className="block text-blue-600 text-xs font-bold">Số lượng</span>
                            <span className="font-bold text-blue-800 text-lg">
                                {order.quantity} {product.unit || 'kg'}
                            </span>
                        </div>
                        <div className="bg-green-50 p-2 rounded border border-green-100">
                            <span className="block text-green-600 text-xs font-bold">Tổng tiền</span>
                            <span className="font-bold text-green-800 text-lg">
                                {parseFloat(order.totalPrice).toFixed(4)} ETH
                            </span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                            <span className="block text-gray-500 text-xs">Phương thức</span>
                            <span className="uppercase font-medium">
                                {order.paymentMethod === 'crypto' ? 'Ví MetaMask' : order.paymentMethod}
                            </span>
                        </div>
                        </div>

                        {/* Nút hành động (Hoàn tiền) */}
                        {/* [SỬA] Check order.status thay vì product.status */}
                        {order.status !== 'refund-requested' && order.status !== 'refunded' && order.status !== 'cancelled' && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => handleRequestRefund(order)}
                                    disabled={refundLoading === order._id}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium underline disabled:opacity-50"
                                >
                                    {refundLoading === order._id ? 'Đang gửi...' : 'Yêu cầu hoàn tiền / Trả hàng'}
                                </button>
                            </div>
                        )}
                        
                        {/* [SỬA] Hiển thị lý do từ order.refundReason */}
                        {order.status === 'refund-requested' && (
                            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-100">
                                <strong>Lý do hoàn tiền:</strong> {order.refundReason}
                            </div>
                        )}
                    </div>
                    </div>
                );
            })}
          </div>
        )}
      </div>

      <InputModal
        isOpen={!!orderToRefund}
        onClose={() => setOrderToRefund(null)}
        onSubmit={onConfirmRefund}
        title="Yêu cầu hoàn tiền"
        label={`Vui lòng nhập lý do bạn muốn hoàn tiền cho đơn hàng "${orderToRefund?.product?.name}":`}
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