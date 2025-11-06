import React, { createContext, useState, useContext, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useWeb3 } from './Web3Context';
import RegisterModal from '../components/RegisterModal';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [pendingWallet, setPendingWallet] = useState('');
  
  const { account, isConnected, connectWallet } = useWeb3();

  // Tự động đăng nhập khi wallet kết nối
  useEffect(() => {
    if (isConnected && account) {
      autoLoginWithWallet(account);
    }
  }, [isConnected, account]);

  // Kiểm tra auth token khi load app
  useEffect(() => {
    checkAuth();
  }, []);

  const autoLoginWithWallet = async (walletAddress) => {
    try {
      const response = await userAPI.login(walletAddress);
      const { data } = response.data;
      
      localStorage.setItem('token', data.token);
      // Sửa nhỏ: data.user (vì API trả về { user, token })
      localStorage.setItem('user', JSON.stringify(data.user)); 
      
      setUser(data.user); // Sửa nhỏ: data.user
      setIsAuthenticated(true);
    } catch (error) {
      console.log('Auto-login failed, user needs to register');
    }
  };

  // ✅ Hàm login (Sửa lại để dùng userAPI)
  const login = async (walletAddress) => {
    try {
      console.log('🟡 Attempting login for:', walletAddress);
      
      // Sửa lại: Dùng userAPI cho nhất quán
      const response = await userAPI.login(walletAddress);
      const data = response.data; // axios bọc trong response.data

      console.log('🟡 Login response:', data);
      
      if (data.success) {
        console.log('✅ Login successful:', data.data.user);
        setUser(data.data.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('token', data.data.token);
        return { success: true, data: data.data };
      } 
      // Chú ý: API login của bạn không trả về `requiresRegistration`
      // Nó trả về lỗi 404
      else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      // Xử lý lỗi từ axios
      const data = error.response?.data;
      if (data && data.requiresRegistration) {
        console.log('🟡 User needs registration (from catch)');
        setPendingWallet(walletAddress);
        setShowRegisterModal(true);
        return { 
          success: false, 
          requiresRegistration: true,
          message: 'Vui lòng đăng ký tài khoản trước' 
        };
      }
      return { success: false, message: data?.message || error.message };
    }
  };

  // ✅ Hàm register (Sửa lại để dùng userAPI)
  const register = async (userData) => {
    try {
      setLoading(true);
      // Sửa lại: Dùng userAPI cho nhất quán
      const response = await userAPI.register(userData);
      const data = response.data; // axios bọc trong response.data
      
      if (data.success) {
        console.log('✅ Register successful:', data.data);
        setUser(data.data); // data.data đã chứa user và token
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(data.data)); // data.data đã chứa user
        localStorage.setItem('token', data.data.token);
        
        return { 
          success: true, 
          message: 'Đăng ký thành công',
          data: data.data 
        };
      } else {
        return { 
          success: false, 
          message: data.message 
        };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Lỗi đăng ký' 
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Hàm logout (Giữ nguyên)
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setShowRegisterModal(false);
    setPendingWallet('');
  };

  // ✅ Hàm checkAuth (Giữ nguyên)
  const checkAuth = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        setUser(user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Check auth error:', error);
      logout(); // Clear invalid data
    } finally {
      setLoading(false);
    }
  };

  // ✅ Hàm updateUser
  const updateUser = async (userData) => {
    try {
      const response = await userAPI.updateProfile(userData);
      const { data } = response.data; // API trả về { success, message, data }
      
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      
      return { 
        success: true, 
        message: 'Cập nhật thành công',
        data 
      };
    } // <--- LỖI CỦA BẠN ĐÃ ĐƯỢC SỬA Ở ĐÂY (XÓA DẤU PHẨY)
    catch (error) {
      console.error('Update user error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Lỗi cập nhật' 
      };
    }
  };

  // ✅ Hàm xử lý đăng ký thành công
  const handleRegisterSuccess = (userData) => {
    // userData là { _id, name, walletAddress, ... token }
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
    setShowRegisterModal(false);
    setPendingWallet('');
  };

  // ✅ Hàm loginWithMetaMask
  const loginWithMetaMask = async () => {
    try {
      // Kết nối wallet trước
      const walletResult = await connectWallet();
      if (!walletResult.success) {
        return walletResult;
      }

      // Sau đó đăng nhập với backend
      const loginResult = await login(walletResult.account);
      return loginResult;
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Lỗi đăng nhập với MetaMask' 
      };
    }
  };

  // [---- HÀM MỚI BẠN CẦN LÀ ĐÂY ----]
  // @desc    Đăng nhập bằng địa chỉ ví (form thủ công)
  const loginWithAddress = async (walletAddress) => {
    try {
      // Chỉ cần gọi hàm login(walletAddress) đã có sẵn là đủ
      const loginResult = await login(walletAddress);
      return loginResult;
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Lỗi đăng nhập với địa chỉ' 
      };
    }
  };
  // [---- KẾT THÚC HÀM MỚI ----]


  // ✅ Hàm registerWithMetaMask
  const registerWithMetaMask = async (userData) => {
    try {
      // Kết nối wallet trước
      const walletResult = await connectWallet();
      if (!walletResult.success) {
        return walletResult;
    D }

      // Đảm bảo wallet address khớp
      if (walletResult.account.toLowerCase() !== userData.walletAddress.toLowerCase()) {
        return { 
          success: false, 
          message: 'Wallet address không khớp với ví đã kết nối' 
        };
      }

      // Sau đó đăng ký với backend
      const registerResult = await register(userData);
      return registerResult;
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Lỗi đăng ký với MetaMask' 
      };
    }
  };

  // ✅ Hàm đóng modal đăng ký
  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    setPendingWallet('');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    updateUser,
    loginWithMetaMask,
    loginWithAddress, // [ĐÃ THÊM HÀM NÀY]
    registerWithMetaMask,
    showRegisterModal,
    closeRegisterModal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* THÊM REGISTER MODAL VÀO ĐÂY */}
      <RegisterModal 
        isOpen={showRegisterModal}
        onClose={closeRegisterModal}
        walletAddress={pendingWallet}
        onRegisterSuccess={handleRegisterSuccess}
      />
    </AuthContext.Provider>
  );
};