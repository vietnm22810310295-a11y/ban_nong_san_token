import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { productAPI, paymentAPI } from '../services/api'; // Import thêm paymentAPI
import LoadingSpinner from '../components/LoadingSpinner';

const CartPage = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartCount } = useCart();
  const { isConnected, buyProductOnChain, account, connectWallet } = useWeb3();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('crypto'); // 'crypto' | 'cash' | 'vnpay'

  // Tính tổng tiền
  const totalETH = cartItems.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0).toFixed(4);
  const totalVND = cartItems.reduce((total, item) => total + (item.priceVND * item.quantity), 0);

  // Xử lý thanh toán
  const handleCheckout = async () => {
    if (!isAuthenticated) return alert("Vui lòng đăng nhập để thanh toán.");
    if (cartItems.length === 0) return alert("Giỏ hàng trống.");

    setProcessing(true);

    try {
      // --- THANH TOÁN BẰNG CRYPTO (ETH) ---
      if (paymentMethod === 'crypto') {
        if (!isConnected) await connectWallet();
        if (!window.confirm(`Xác nhận thanh toán ${totalETH} ETH cho ${cartItems.length} sản phẩm?`)) {
            setProcessing(false);
            return;
        }

        for (const item of cartItems) {
            const result = await buyProductOnChain(item.blockchainId, item.quantity);
            if (result.success) {
                await productAPI.updateProduct(item._id, {
                    txHash: result.transactionHash,
                    buyer: account,
                    quantitySold: item.quantity
                });
            } else { throw new Error(`Lỗi mua ${item.name}: ${result.error}`); }
        }
      } 
      // --- THANH TOÁN BẰNG TIỀN MẶT ---
      else if (paymentMethod === 'cash') {
        if (!window.confirm(`Gửi yêu cầu mua bằng Tiền mặt cho ${cartItems.length} sản phẩm?`)) {
            setProcessing(false);
            return;
        }
        for (const item of cartItems) {
            await productAPI.requestCashPurchase(item._id);
        }
      }
      // --- [MỚI] THANH TOÁN BẰNG VNPAY ---
      else if (paymentMethod === 'vnpay') {
        if (!totalVND || totalVND < 1000) {
            throw new Error("Đơn hàng VNPAY phải có giá trị tối thiểu 1,000 VND.");
        }
        
        // 1. Tạo URL trả về (Tự động lấy localhost hoặc Vercel)
        const RETURN_URL = `${window.location.origin}/vnpay-return`;
        
        // 2. Thông tin đơn hàng
        const orderInfo = `Thanh toan ${cartCount} san pham (Nong San Blockchain)`;
        const orderId = `NSB_${Date.now()}`; // Mã đơn hàng duy nhất
        const amount = totalVND;

        // 3. Lưu giỏ hàng vào Session (để trang Return biết mua gì)
        sessionStorage.setItem('pendingVnpayOrder', JSON.stringify(cartItems));

        // 4. Gọi API Backend để lấy link VNPay
        const response = await paymentAPI.createPaymentUrl({
            amount,
            orderInfo,
            orderId,
            vnp_ReturnUrl: RETURN_URL // [FIX] Gửi URL động lên backend
        });

        if (response.data.success) {
            // 5. Chuyển hướng người dùng sang VNPay
            window.location.href = response.data.url;
            return; // Dừng hàm ở đây
        } else {
            throw new Error(response.data.message || "Không thể tạo link VNPay");
        }
      }

      // Thông báo thành công (Chung cho ETH và Tiền mặt)
      alert("Đặt hàng thành công! 🎉");
      clearCart();
      navigate('/my-purchases');

    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng của bạn đang trống</h2>
        <Link to="/products" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Giỏ hàng của bạn ({cartItems.length} món)</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Danh sách sản phẩm */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {cartItems.map((item) => (
                <li key={item._id} className="p-6 flex flex-col sm:flex-row items-center gap-6">
                  <img src={item.images?.[0] || 'https://via.placeholder.com/150'} alt={item.name} className="w-24 h-24 object-cover rounded-lg bg-gray-100" />
                  
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.farmName}</p>
                    <div className="mt-1 font-medium text-green-600">{item.price} ETH <span className="text-gray-400 text-xs">/ {item.unit}</span></div>
                  </div>

                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="px-3 py-1 hover:bg-gray-100" disabled={item.quantity <= 1}>-</button>
                    <span className="px-3 py-1 font-medium w-12 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="px-3 py-1 hover:bg-gray-100" disabled={item.quantity >= item.quantity}>+</button>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="font-bold text-gray-900">{(item.price * item.quantity).toFixed(4)} ETH</p>
                    <button onClick={() => removeFromCart(item._id)} className="text-red-500 text-sm hover:underline mt-1">Xóa</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tổng kết & Thanh toán */}
        <div className="lg:w-96">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Thanh toán</h2>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán:</label>
                <div className="space-y-2">
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${paymentMethod === 'crypto' ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'}`}>
                        <input type="radio" name="payment" value="crypto" checked={paymentMethod === 'crypto'} onChange={() => setPaymentMethod('crypto')} className="text-green-600 focus:ring-green-500" />
                        <span className="ml-3 font-medium">Ví MetaMask (ETH)</span>
                    </label>
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="ml-3 font-medium">Tiền mặt (Khi nhận hàng)</span>
                    </label>
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${paymentMethod === 'vnpay' ? 'border-red-500 bg-red-50' : 'hover:bg-gray-50'}`}>
                        <input type="radio" name="payment" value="vnpay" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} className="text-red-600 focus:ring-red-500" />
                        <span className="ml-3 font-medium">VNPAY (Thẻ nội địa)</span>
                    </label>
                </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tổng cộng:</span>
                <div className="text-right">
                    {paymentMethod === 'crypto' && (
                        <div className="text-2xl font-bold text-green-600">{totalETH} ETH</div>
                    )}
                    {paymentMethod === 'cash' && (
                        <div className="text-2xl font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(totalVND)} đ</div>
                    )}
                    {paymentMethod === 'vnpay' && (
                        <div className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(totalVND)} đ</div>
                    )}
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={processing}
              className={`w-full text-white py-3 rounded-lg font-bold transition flex justify-center items-center 
                ${paymentMethod === 'crypto' ? 'bg-green-600 hover:bg-green-700' : ''}
                ${paymentMethod === 'cash' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                ${paymentMethod === 'vnpay' ? 'bg-red-600 hover:bg-red-700' : ''}
              `}
            >
              {processing ? (
                <><LoadingSpinner size="small" /><span className="ml-2">Đang xử lý...</span></>
              ) : (
                paymentMethod === 'crypto' ? 'Thanh toán (ETH)' : (paymentMethod === 'cash' ? 'Đặt hàng (Tiền mặt)' : 'Thanh toán (VNPAY)')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;