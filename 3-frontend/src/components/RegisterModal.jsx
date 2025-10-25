import React, { useState } from 'react';

const RegisterModal = ({ isOpen, onClose, walletAddress, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'farmer',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async () => {
    try {
      setLoading(true);
      
      if (!formData.name.trim()) {
        alert('Vui lòng nhập tên');
        return;
      }

      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          walletAddress,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          address: formData.address
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Đăng ký thành công! Bây giờ bạn có thể đăng sản phẩm.');
        onRegisterSuccess(data.data);
        onClose();
      } else {
        alert('❌ Lỗi đăng ký: ' + data.message);
      }
    } catch (error) {
      console.error('Register error:', error);
      alert('❌ Lỗi đăng ký: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">📝 Đăng Ký Tài Khoản</h2>
        <p className="text-gray-600 mb-4">Wallet: {walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên đầy đủ *</label>
            <input 
              type="text"
              placeholder="Nhập tên của bạn"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Vai trò *</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="farmer">👨‍🌾 Nông dân (Có thể đăng bán sản phẩm)</option>
              <option value="buyer">🛒 Người mua (Chỉ có thể mua sản phẩm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input 
              type="tel"
              placeholder="0123 456 789"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
            <textarea 
              placeholder="Nhập địa chỉ của bạn"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows="2"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;