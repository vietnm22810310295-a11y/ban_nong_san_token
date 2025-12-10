import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; // Bỏ Link, dùng thẻ a
import { useCart } from '../contexts/CartContext'; 
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const VnPayReturn = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart(); 
  
  // [FIX] Chặn gọi API 2 lần do React StrictMode (nguyên nhân gây lỗi 400 ảo)
  const hasCalledAPI = useRef(false);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Đang xác thực giao dịch...');

  useEffect(() => {
    const processPayment = async () => {
      const responseCode = searchParams.get('vnp_ResponseCode');
      
      // Nếu không có mã hoặc ĐÃ GỌI API RỒI thì dừng ngay
      if (!responseCode || hasCalledAPI.current) return;
      hasCalledAPI.current = true;

      try {
        const vnp_Params = {};
        for (const [key, value] of searchParams.entries()) {
          vnp_Params[key] = value;
        }

        if (responseCode === '00') {
            const savedCartJson = sessionStorage.getItem('pendingVnpayOrder');
            
            if (!savedCartJson) {
                // Mất session nhưng VNPAY báo thành công -> Vẫn báo thành công để UX tốt
                setStatus('success');
                setMessage('Giao dịch VNPAY thành công!');
                setLoading(false);
                return;
            }

            const cartItems = JSON.parse(savedCartJson);

            // Gọi API Backend
            const res = await api.post('/payment/vnpay_return', {
                vnp_Params,
                cartItems,
                userId: user?._id
            });

            if (res.data.success) {
                setStatus('success');
                setMessage('Giao dịch thành công! Đơn hàng đã được lưu.');
                
                // Xóa giỏ hàng & Session
                if (clearCart) clearCart(); 
                sessionStorage.removeItem('pendingVnpayOrder');
            } else {
                setStatus('error');
                setMessage(res.data.message || 'Lỗi lưu đơn hàng.');
            }

        } else {
            setStatus('error');
            setMessage('Giao dịch đã bị hủy hoặc thất bại.');
        }

      } catch (error) {
        console.error('VnPay Return Error:', error);
        // Lỗi mạng nhưng có thể DB đã lưu -> Báo lỗi kết nối
        setStatus('error'); 
        setMessage('Có lỗi xảy ra khi kết nối server.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        processPayment();
    }
  }, [searchParams, user, clearCart]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-blue-600 font-medium">Đang xử lý hóa đơn VNPAY...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center animate-fade-in-up">
        {status === 'success' ? (
            <>
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                    <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-green-700 mb-2">Thanh toán thành công!</h2>
                <p className="text-gray-600 mb-8">{message}</p>
                
                {/* [FIX QUAN TRỌNG] Dùng thẻ <a> để ép tải lại trang -> Cập nhật số lượng mới nhất từ DB */}
                <a href="/my-purchases" className="block w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition mb-3 shadow-md">
                    📦 Xem Hàng Đã Mua
                </a>
                
                <a href="/products" className="block w-full bg-white text-green-600 border border-green-600 py-3 rounded-lg font-bold hover:bg-green-50 transition">
                    Tiếp tục mua sắm
                </a>
            </>
        ) : (
            <>
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                    <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">Giao dịch thất bại</h2>
                <p className="text-gray-600 mb-8">{message}</p>
                {/* Ở trang lỗi dùng thẻ a hay Link đều được, dùng a cho đồng bộ */}
                <a href="/cart" className="block w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-900 transition">
                    Quay lại giỏ hàng
                </a>
            </>
        )}
      </div>
    </div>
  );
};

export default VnPayReturn;