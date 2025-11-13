import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { useCart } from '../contexts/CartContext'; // [MỚI] Import CartContext
import WalletConnect from './WalletConnect';

const Header = () => {
  const { user, logout, isAuthenticated, updateUser } = useAuth();
  const { isConnected, account, getBalance } = useWeb3();
  const { cartCount } = useCart(); // [MỚI] Lấy số lượng giỏ hàng
  
  const [balance, setBalance] = useState('0.00');
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  // State cho Dropdown và Modal
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // State cho chế độ chỉnh sửa
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ type: '', content: '' });

  const dropdownRef = useRef(null); 

  // Load số dư ví
  const loadWalletBalance = useCallback(async () => {
    if (!isConnected || !getBalance) return;
    try {
      setBalanceLoading(true);
      const balanceResult = await getBalance();
      if (balanceResult.success) {
        setBalance(parseFloat(balanceResult.balance).toFixed(4));
      }
    } catch (error) {
      console.error('Lỗi tải số dư:', error);
    } finally {
      setBalanceLoading(false);
    }
  }, [isConnected, getBalance]);

  useEffect(() => {
    if (isConnected && account) loadWalletBalance();
  }, [isConnected, account, loadWalletBalance]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Khi mở modal settings, reset form về dữ liệu hiện tại
  useEffect(() => {
    if (isSettingsOpen && user) {
      setEditFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
      setIsEditing(false);
      setUpdateMessage({ type: '', content: '' });
    }
  }, [isSettingsOpen, user]);

  // Xử lý khi nhập liệu
  const handleInputChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  // Xử lý lưu thông tin
  const handleSaveProfile = async () => {
    try {
      setUpdateLoading(true);
      setUpdateMessage({ type: '', content: '' });

      const result = await updateUser(editFormData);

      if (result.success) {
        setUpdateMessage({ type: 'success', content: 'Cập nhật thành công!' });
        setIsEditing(false); 
        setTimeout(() => setUpdateMessage({ type: '', content: '' }), 3000);
      } else {
        setUpdateMessage({ type: 'error', content: result.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      setUpdateMessage({ type: 'error', content: 'Lỗi kết nối server' });
    } finally {
      setUpdateLoading(false);
    }
  };

  // Helper để hiển thị Role đẹp hơn
  const getRoleDisplay = () => {
    if (user?.role === 'admin') return { label: 'Quản trị viên', class: 'bg-red-100 text-red-800' };
    if (user?.role === 'farmer') return { label: 'Nông dân', class: 'bg-green-100 text-green-800' };
    return { label: 'Người mua', class: 'bg-blue-100 text-blue-800' };
  };

  const roleInfo = getRoleDisplay();

  return (
    <>
      <header className="bg-white shadow-sm border-b relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="text-2xl font-bold text-green-600 hover:text-green-700 whitespace-nowrap">
                🌱 Nông Sản Blockchain
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex items-center flex-nowrap justify-end gap-x-4 ml-4">
              <Link to="/products" className="text-gray-700 hover:text-green-600 font-medium whitespace-nowrap">
                Marketplace
              </Link>

              {/* Wallet & Balance */}
              <div className="flex items-center gap-x-3">
                <WalletConnect />
                {isConnected && (
                  <div className="flex items-center gap-x-1 text-sm font-medium text-purple-800 bg-purple-100 px-3 py-1 rounded-lg whitespace-nowrap">
                    <span>💰</span>
                    {balanceLoading ? <span>...</span> : <span>{balance} ETH</span>}
                  </div>
                )}
              </div>

              {/* [MỚI] NÚT GIỎ HÀNG */}
              <Link to="/cart" className="relative group p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-600 group-hover:text-green-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="relative ml-2 pl-4 border-l border-gray-200" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center text-gray-700 text-sm font-medium hover:text-green-600 focus:outline-none"
                  >
                    <span>Xin chào, <strong>{user?.name || user?.walletAddress?.slice(0, 8)}</strong></span>
                    <svg className={`w-5 h-5 ml-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                
                  {/* Dropdown Menu */}
                  <div className={`absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border z-50 ${isDropdownOpen ? 'block' : 'hidden'}`}>
                    <div className="p-4 border-b">
                      <p className="font-medium text-gray-800 truncate">{user?.name || 'Chưa cập nhật tên'}</p>
                      <p className="text-sm text-gray-500 truncate">{user?.walletAddress}</p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${roleInfo.class}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    
                    <nav className="py-2">
                      {user?.role === 'admin' && (
                        <Link to="/admin" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 font-bold border-b">
                           🛡️ Trang Quản Trị (Admin)
                        </Link>
                      )}

                      {user?.role === 'farmer' && (
                        <Link to="/farmer" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-green-600">
                          Farmer Dashboard
                        </Link>
                      )}
                      {user?.role === 'buyer' && (
                        <Link to="/my-purchases" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-green-600">
                          Hàng đã mua
                        </Link>
                      )}
                      <button onClick={() => { setIsSettingsOpen(true); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-green-600">
                        Cài đặt thông tin
                      </button>
                      <button onClick={() => { logout(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 border-t">
                        Đăng xuất
                      </button>
                    </nav>
                  </div>
                </div>
              ) : (
                <div className="flex gap-x-2 ml-4">
                  <Link to="/login" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition">Đăng nhập</Link>
                  <Link to="/register" className="border border-green-500 text-green-500 hover:bg-green-50 px-4 py-2 rounded-lg text-sm transition">Đăng ký</Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Modal Cài đặt thông tin */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up transform transition-all">
            <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Thông tin cá nhân
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-white hover:bg-green-700 rounded-full p-1 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {updateMessage.content && (
                <div className={`p-3 rounded-lg text-sm text-center ${updateMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {updateMessage.content}
                </div>
              )}

              {/* Form Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Họ và tên</label>
                {isEditing ? (
                  <input type="text" name="name" value={editFormData.name} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                ) : (
                  <div className="bg-gray-50 px-4 py-2 rounded-lg border text-gray-800 font-medium">{user?.name}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email liên hệ</label>
                {isEditing ? (
                  <input type="email" name="email" value={editFormData.email} onChange={handleInputChange} placeholder="Ví dụ: abc@gmail.com" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                ) : (
                  <div className="bg-gray-50 px-4 py-2 rounded-lg border text-gray-800">
                    {user?.email ? `${user.email}` : <span className="text-gray-400 italic">Chưa cập nhật</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Số điện thoại</label>
                {isEditing ? (
                  <input type="text" name="phone" value={editFormData.phone} onChange={handleInputChange} placeholder="Ví dụ: 0912..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                ) : (
                  <div className="bg-gray-50 px-4 py-2 rounded-lg border text-gray-800">
                    {user?.phone ? `${user.phone}` : <span className="text-gray-400 italic">Chưa cập nhật</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Địa chỉ ví (Không thể đổi)</label>
                <div className="bg-gray-100 px-4 py-2 rounded-lg border text-gray-500 text-xs break-all font-mono">
                  {user?.walletAddress}
                </div>
              </div>
            </div>

            {/* Buttons Action */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button onClick={() => { setIsEditing(false); setUpdateMessage({type: '', content: ''}); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition" disabled={updateLoading}>Hủy bỏ</button>
                  <button onClick={handleSaveProfile} disabled={updateLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center">
                    {updateLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition">Đóng</button>
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2">Chỉnh sửa</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;