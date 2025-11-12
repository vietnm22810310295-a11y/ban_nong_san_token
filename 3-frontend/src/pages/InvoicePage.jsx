import React, { useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const InvoicePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Lấy dữ liệu được gửi sang từ trang Chi tiết sản phẩm
  const { orderData } = location.state || {};

  // Nếu người dùng truy cập trực tiếp mà không có dữ liệu, đẩy về trang chủ
  if (!orderData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-4">Không tìm thấy thông tin hóa đơn.</p>
        <Link to="/" className="text-green-600 hover:underline">Về trang chủ</Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden" id="invoice-content">
        
        {/* Header Hóa đơn */}
        <div className="bg-green-600 px-8 py-6 text-white flex justify-between items-center print:bg-white print:text-black">
          <div>
            <h1 className="text-3xl font-bold">HÓA ĐƠN THANH TOÁN</h1>
            <p className="mt-1 opacity-80">Nông Sản Blockchain</p>
          </div>
          <div className="text-right">
            <p className="font-medium">Ngày: {new Date().toLocaleDateString('vi-VN')}</p>
            <p className="text-sm opacity-80">Mã đơn: #{orderData.productId.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="px-8 py-10">
          {/* Trạng thái */}
          <div className="flex justify-center mb-8">
            <div className="bg-green-100 text-green-800 px-6 py-2 rounded-full font-bold text-lg border border-green-200 flex items-center">
              ✅ Giao dịch thành công
            </div>
          </div>

          {/* Thông tin Sản phẩm */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết sản phẩm</h2>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {orderData.image && (
                  <img src={orderData.image} alt={orderData.name} className="w-20 h-20 object-cover rounded-md mr-4 border" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{orderData.name}</h3>
                  <p className="text-gray-600">{orderData.productType} - {orderData.region}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{orderData.price} ETH</p>
                <p className="text-sm text-gray-500">Giá đã bao gồm phí mạng</p>
              </div>
            </div>
          </div>

          {/* Chi tiết giao dịch */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Người bán (Nông dân)</h3>
              <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all border">
                {orderData.seller}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Người mua</h3>
              <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all border">
                {orderData.buyer}
              </p>
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Phương thức:</span>
              <span className="font-medium text-gray-900">
                {orderData.paymentMethod === 'crypto' ? 'Ví điện tử (ETH)' : 'Tiền mặt (COD)'}
              </span>
            </div>
            {orderData.txHash && (
              <div className="flex justify-between items-start mt-2">
                <span className="text-gray-600">TxHash (Blockchain):</span>
                <span className="font-mono text-xs text-blue-600 break-all max-w-[70%] text-right">
                  {orderData.txHash}
                </span>
              </div>
            )}
          </div>

          {/* Tổng cộng */}
          <div className="flex justify-end items-center border-t border-gray-200 pt-6">
            <span className="text-gray-600 text-lg mr-4">Tổng thanh toán:</span>
            <span className="text-3xl font-bold text-gray-900">{orderData.price} ETH</span>
          </div>
        </div>

        {/* Footer / Buttons */}
        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex justify-between items-center print:hidden">
          <button
            onClick={() => navigate('/products')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Quay lại Marketplace
          </button>
          <div className="space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              🖨️ In hóa đơn
            </button>
            <button
              onClick={() => navigate('/my-purchases')}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Xem lịch sử mua hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;