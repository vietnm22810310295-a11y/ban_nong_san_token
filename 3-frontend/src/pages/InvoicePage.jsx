import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const InvoicePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { orderData } = location.state || {};

  if (!orderData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-4">Không tìm thấy thông tin hóa đơn.</p>
        <Link to="/" className="text-green-600 hover:underline">Về trang chủ</Link>
      </div>
    );
  }

  // [LOGIC MỚI] Chuẩn hóa dữ liệu đầu vào thành mảng items
  // Nếu orderData có mảng 'items' (từ Cart) thì dùng nó, nếu không (mua lẻ) thì tạo mảng chứa chính nó
  const items = orderData.items ? orderData.items : [orderData];
  
  // Lấy tổng tiền (Ưu tiên số tổng đã tính sẵn, nếu không thì tự tính lại)
  const displayTotalETH = orderData.totalETH || items.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0).toFixed(4);
  const displayTotalVND = orderData.totalVND || 0;

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
            {/* Nếu mua lẻ thì hiện mã SP, mua nhiều thì hiện mã đơn chung */}
            <p className="text-sm opacity-80">
                Mã đơn: #{orderData.txHash ? orderData.txHash.slice(-6).toUpperCase() : `BILL_${Date.now().toString().slice(-6)}`}
            </p>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="px-8 py-10">
          <div className="flex justify-center mb-8">
            <div className="bg-green-100 text-green-800 px-6 py-2 rounded-full font-bold text-lg border border-green-200 flex items-center">
              ✅ Giao dịch thành công
            </div>
          </div>

          {/* [LOGIC MỚI] Danh sách Sản phẩm (Vòng lặp) */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết đơn hàng ({items.length} sản phẩm)</h2>
            
            <div className="flex flex-col gap-4">
                {items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center border-b border-dashed border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center">
                            {/* Ưu tiên lấy ảnh từ mảng images (Cart) hoặc image đơn lẻ */}
                            <img 
                                src={item.images?.[0] || item.image || 'https://via.placeholder.com/50'} 
                                alt={item.name} 
                                className="w-16 h-16 object-cover rounded-md mr-4 border bg-gray-50" 
                            />
                            <div>
                                <h3 className="font-bold text-gray-900">{item.name}</h3>
                                <p className="text-sm text-gray-500">
                                    {item.farmName || item.seller} {item.quantity ? `x ${item.quantity}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                             {/* Hiển thị giá tùy theo loại tiền */}
                            {orderData.paymentMethod === 'crypto' ? (
                                <p className="font-bold text-green-600">{(item.price * (item.quantity || 1)).toFixed(4)} ETH</p>
                            ) : (
                                <p className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(item.priceVND * (item.quantity || 1))} đ</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* Chi tiết giao dịch */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Người mua</h3>
              <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all border">
                {orderData.buyer}
              </p>
            </div>
            <div>
               <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Phương thức</h3>
               <p className="font-medium text-gray-900">
                {orderData.paymentMethod === 'crypto' ? 'Ví điện tử (ETH)' : (orderData.paymentMethod === 'cash' ? 'Tiền mặt (COD)' : 'VNPAY')}
               </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
            {orderData.txHash && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">TxHash (Mới nhất):</span>
                <span className="font-mono text-xs text-blue-600 break-all max-w-[70%] text-right">
                  {orderData.txHash}
                </span>
              </div>
            )}
             {!orderData.txHash && orderData.paymentMethod === 'cash' && (
                 <div className="text-center italic text-gray-500">Thanh toán khi nhận hàng</div>
             )}
          </div>

          {/* Tổng cộng */}
          <div className="flex justify-end items-center border-t border-gray-200 pt-6">
            <span className="text-gray-600 text-lg mr-4">Tổng thanh toán:</span>
            {orderData.paymentMethod === 'crypto' ? (
                <span className="text-3xl font-bold text-gray-900">{displayTotalETH} ETH</span>
            ) : (
                <span className="text-3xl font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(displayTotalVND || 0)} đ</span>
            )}
          </div>
        </div>

        {/* Footer / Buttons */}
        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex justify-between items-center print:hidden">
          <button
            onClick={() => navigate('/products')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Tiếp tục mua sắm
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
              Lịch sử mua hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;