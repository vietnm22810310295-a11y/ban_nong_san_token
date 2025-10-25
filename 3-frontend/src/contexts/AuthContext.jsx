import React, { createContext, useState, useContext, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useWeb3 } from './Web3Context';
import RegisterModal from '../components/RegisterModal'; // THÊM DÒNG NÀY

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
  const [showRegisterModal, setShowRegisterModal] = useState(false); // THÊM STATE NÀY
  const [pendingWallet, setPendingWallet] = useState(''); // THÊM STATE NÀY
  
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
      localStorage.setItem('user', JSON.stringify(data));
      
      setUser(data);
      setIsAuthenticated(true);
    } catch (error) {
      console.log('Auto-login failed, user needs to register');
    }
  };

  // ✅ Hàm login ĐÃ SỬA
  const login = async (walletAddress) => {
    try {
      console.log('🟡 Attempting login for:', walletAddress);
      
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress
        })
      });

      const data = await response.json();
      console.log('🟡 Login response:', data);
      
      if (data.success) {
        console.log('✅ Login successful:', data.data.user);
        setUser(data.data.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('token', data.data.token);
        return { success: true, data: data.data };
      } else if (data.requiresRegistration) {
        console.log('🟡 User needs registration');
        setPendingWallet(walletAddress);
        setShowRegisterModal(true);
        return { 
          success: false, 
          requiresRegistration: true,
          message: 'Vui lòng đăng ký tài khoản trước' 
        };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      return { success: false, message: error.message };
    }
  };

  // ✅ Hàm register ĐÃ SỬA
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Register successful:', data.data);
        setUser(data.data);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(data.data));
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
        message: error.message || 'Lỗi đăng ký' 
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Hàm logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setShowRegisterModal(false);
    setPendingWallet('');
  };

  // ✅ Hàm checkAuth
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
      const { data } = response.data;
      
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      
      return { 
        success: true, 
        message: 'Cập nhật thành công',
        data 
      };
    } catch (error) {
      console.error('Update user error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Lỗi cập nhật' 
      };
    }
  };

  // ✅ Hàm xử lý đăng ký thành công
  const handleRegisterSuccess = (userData) => {
    setUser(userData.user);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData.user));
    localStorage.setItem('token', userData.token);
    setShowRegisterModal(false);
    setPendingWallet('');
  };

  // ✅ Hàm loginWithMetaMask ĐÃ SỬA
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

  // ✅ Hàm registerWithMetaMask ĐÃ SỬA
  const registerWithMetaMask = async (userData) => {
    try {
      // Kết nối wallet trước
      const walletResult = await connectWallet();
      if (!walletResult.success) {
        return walletResult;
      }

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