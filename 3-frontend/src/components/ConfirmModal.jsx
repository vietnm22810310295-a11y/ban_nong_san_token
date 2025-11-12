import React from 'react';

/*
 * Component Modal xác nhận dùng chung
 * Props:
 * - isOpen: (boolean) Hiển thị modal hay không
 * - onClose: (function) Hàm gọi khi bấm "Hủy" hoặc bấm ra ngoài
 * - onConfirm: (function) Hàm gọi khi bấm "Xác nhận"
 * - title: (string) Tiêu đề của modal
 * - confirmText: (string) Chữ trên nút xác nhận (ví dụ: "Đồng ý", "Xóa")
 * - confirmColor: (string) Màu Tailwind cho nút xác nhận (ví dụ: "bg-green-600", "bg-red-600")
 * - children: (JSX) Nội dung/thông báo bên trong modal
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "Xác nhận",
  confirmColor = "bg-green-600"
}) => {
  if (!isOpen) return null;

  return (
    // Lớp phủ nền
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose} // Bấm ra ngoài để đóng
    >
      {/* Khung Modal */}
      <div
        className="relative w-full max-w-lg p-6 bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()} // Ngăn bấm vào modal bị đóng
      >
        {/* Nút đóng (X) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        {/* Tiêu đề */}
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          {title}
        </h3>

        {/* Nội dung (Message, Warning...) */}
        <div className="text-base text-gray-700 space-y-4">
          {children}
        </div>

        {/* Các nút hành động */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg ${confirmColor} hover:opacity-90`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;