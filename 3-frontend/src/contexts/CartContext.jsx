import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    // Lấy dữ liệu từ LocalStorage khi khởi động
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      return [];
    }
  });

  // Tự động lưu vào LocalStorage khi giỏ hàng thay đổi
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Thêm vào giỏ
  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      // Kiểm tra xem món này đã có trong giỏ chưa
      const existingItem = prevItems.find(item => item._id === product._id);
      
      if (existingItem) {
        // Nếu có rồi -> Cộng thêm số lượng (nhưng không quá tồn kho)
        return prevItems.map(item => 
          item._id === product._id 
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.quantity) } // Giới hạn max = tồn kho
            : item
        );
      } else {
        // Nếu chưa có -> Thêm mới
        return [...prevItems, { ...product, quantity }];
      }
    });
    alert("Đã thêm vào giỏ hàng! 🛒");
  };

  // Xóa khỏi giỏ
  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item._id !== productId));
  };

  // Cập nhật số lượng trong giỏ
  const updateQuantity = (productId, newQuantity) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item._id === productId ? { ...item, quantity: Math.max(1, newQuantity) } : item
      )
    );
  };

  // Xóa sạch giỏ (sau khi thanh toán)
  const clearCart = () => {
    setCartItems([]);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount: cartItems.reduce((total, item) => total + item.quantity, 0), // Tổng số lượng item
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};