import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { productAPI } from '../services/api'; // [SỬA 1] Import API
import LoadingSpinner from '../components/LoadingSpinner'; // [SỬA 2] Import Loading

const VnPayReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // [SỬA 3] Thêm state 'processing' và 'error'
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'fail'
  const [error, setError] = useState('');

  useEffect(() => {
    // Tạo một hàm async bên trong để xử lý
    const processVnpayReturn = async () => {
      const responseCode = searchParams.get('vnp_ResponseCode');
      const vnpTransactionNo = searchParams.get('vnp_TransactionNo'); // Mã giao dịch của VNPAY
      
      // 1. Kiểm tra nếu giao dịch VNPAY thất bại
      if (responseCode !== '00') {
        setStatus('fail');
        setError('Thanh toán thất bại hoặc bạn đã hủy giao dịch.');
        // Xóa đơn hàng tạm
        sessionStorage.removeItem('pendingVnpayOrder');
        return;
      }

      // 2. Giao dịch VNPAY thành công (responseCode === '00')
      try {
        // Lấy dữ liệu đơn hàng đã lưu tạm ở trang trước
        const pendingOrderJSON = sessionStorage.getItem('pendingVnpayOrder');
        if (!pendingOrderJSON) {
          throw new Error('Không tìm thấy dữ liệu đơn hàng. Giao dịch có thể đã hết hạn.');
        }

        const orderData = JSON.parse(pendingOrderJSON);
        
        // [SỬA 4] CẬP NHẬT DATABASE
        // Đây là bước quan trọng: Báo cho backend biết là đã bán
        console.log('VNPAY Success: Updating database...');
        await productAPI.updateProduct(orderData.productId, {
          status: 'sold',
          isSold: true,
          currentOwner: orderData.buyer 
        });
        console.log('VNPAY Success: Database updated.');

        // [SỬA 5] CHUYỂN HƯỚNG SANG TRANG HÓA ĐƠN
        setStatus('success');
        
        // Gán mã giao dịch VNPAY vào hóa đơn và xóa sessionStorage
        orderData.txHash = vnpTransactionNo;
        sessionStorage.removeItem('pendingVnpayOrder');

        // Chuyển hướng
        navigate('/invoice', { 
          state: { orderData },
          replace: true // Không cho người dùng back lại trang này
        });

      } catch (err) {
        // Lỗi nghiêm trọng: VNPAY trừ tiền nhưng không cập nhật được DB
        console.error('Lỗi nghiêm trọng tại VnPayReturn:', err);
        setStatus('fail');
        setError(`LỖI NGHIÊM TRỌNG: Thanh toán VNPAY thành công nhưng không thể cập nhật đơn hàng (${err.message}). Vui lòng liên hệ Admin!`);
      }
    };

    processVnpayReturn();
  
  }, [searchParams, navigate]); // Chỉ chạy 1 lần khi trang được tải

  // [SỬA 6] Cập nhật giao diện JSX
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        
        {/* Trạng thái Đang xử lý */}
        {status === 'processing' && (
          <>
            <LoadingSpinner size="large" />
            <h2 className="text-2xl font-bold text-gray-700 mt-4">Đang xử lý...</h2>
            <p className="text-gray-600 mb-6">Vui lòng không rời khỏi trang này.</p>
          </>
        )}

        {/* Trạng thái Thất bại */}
        {status === 'fail' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Thanh toán thất bại</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/products" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
              Quay lại mua sắm
            </Link>
          </>
        )}

        {/* Trạng thái Thành công (Người dùng sẽ không thấy vì bị chuyển hướng ngay) */}
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Thanh toán thành công!</h2>
            <p className="text-gray-600 mb-6">Đang chuyển hướng đến hóa đơn...</p>
          </>
        )}

      </div>
    </div>
  );
};

export default VnPayReturn;