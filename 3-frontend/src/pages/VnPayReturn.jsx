import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { productAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const VnPayReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // Lấy thông tin user để biết wallet

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...');

  useEffect(() => {
    const processVnpayReturn = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const responseCode = params.get('vnp_ResponseCode');
        const txRef = params.get('vnp_TxnRef');

        if (responseCode === '00') {
            // --- THANH TOÁN THÀNH CÔNG ---
            setMessage('Thanh toán VNPAY thành công! Đang lưu đơn hàng...');
            
            const savedCartJson = sessionStorage.getItem('pendingVnpayOrder');
            
            if (savedCartJson) {
                const savedCart = JSON.parse(savedCartJson);
                
                // Lặp qua giỏ hàng đã lưu và gọi API để tạo Order + Trừ kho
                // (Giống hệt logic thanh toán ETH)
                for (const item of savedCart) {
                    await productAPI.updateProduct(item._id, {
                        quantitySold: item.quantity,
                        buyer: user?.walletAddress, // Lấy wallet của user đang đăng nhập
                        txHash: `VNPAY_${txRef}` // Lưu mã giao dịch VNPAY
                        // Backend sẽ tự động tạo Order khi nhận 'quantitySold'
                    });
                }

                sessionStorage.removeItem('pendingVnpayOrder'); // Xóa giỏ hàng tạm
                setStatus('success');
                setMessage('Giao dịch thành công! Đơn hàng đã được ghi nhận.');
            } else {
                // Lỗi hiếm gặp: Mất session
                setStatus('success'); // Vẫn báo thành công vì tiền đã trả
                setMessage('Thanh toán thành công, nhưng không tìm thấy dữ liệu giỏ hàng tạm. Vui lòng liên hệ hỗ trợ.');
            }
        } else {
            // --- THANH TOÁN THẤT BẠI / HỦY ---
            setStatus('error');
            setMessage('Giao dịch không thành công hoặc đã bị hủy.');
        }

      } catch (error) {
        console.error('VnPay Return Error:', error);
        setStatus('error');
        setMessage('Có lỗi nghiêm trọng xảy ra khi xử lý đơn hàng của bạn.');
      } finally {
        setLoading(false);
      }
    };

    processVnpayReturn();
  }, [location, navigate, user]); // Thêm user vào dependency

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-gray-600">Đang xác thực giao dịch với VNPay...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        {status === 'success' ? (
            <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                    <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h2>
                <p className="text-gray-600 mb-8">{message}</p>
                <div className="space-y-3">
                    <Link to="/my-purchases" className="block w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">
                        Xem lịch sử mua hàng
                    </Link>
                    <Link to="/products" className="block w-full bg-white text-green-600 border border-green-600 py-3 rounded-lg font-bold hover:bg-green-50 transition">
                        Tiếp tục mua sắm
                    </Link>
                </div>
            </>
        ) : (
            <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Giao dịch thất bại</h2>
                <p className="text-gray-600 mb-8">{message}</p>
                <Link to="/cart" className="block w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-900 transition">
                    Quay lại giỏ hàng
                </Link>
            </>
        )}
      </div>
    </div>
  );
};

export default VnPayReturn;