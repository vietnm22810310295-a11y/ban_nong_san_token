import React from 'react';

/*
 * Component Modal thông báo (chỉ có nút OK)
 * Props:
 * - isOpen: (boolean) Hiển thị modal hay không
 * - onClose: (function) Hàm gọi khi bấm "OK"
 * - title: (string) Tiêu đề của modal (ví dụ: "Thành công", "Lỗi")
 * - children: (JSX) Nội dung/thông báo bên trong modal
 * - buttonText: (string) Chữ trên nút (mặc định: "Đã hiểu")
 */
const AlertModal = ({
  isOpen,
  onClose,
  title,
  children,
  buttonText = "Đã hiểu"
}) => {
  if (!isOpen) return null;

  // Xác định màu sắc dựa trên tiêu đề
  const isError = title.toLowerCase().includes('lỗi') || title.toLowerCase().includes('thất bại');
  const titleColor = isError ? 'text-red-600' : 'text-green-600';
  const buttonColor = isError ? 'bg-red-600' : 'bg-green-600';
  const icon = isError ? '❌' : '✅';

  return (
    // Lớp phủ nền
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose} // Bấm ra ngoài để đóng
    >
      {/* Khung Modal */}
      <div
        className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()} // Ngăn bấm vào modal bị đóng
      >
        {/* Tiêu đề */}
        <h3 className={`text-2xl font-semibold mb-4 flex items-center ${titleColor}`}>
          <span className="mr-2">{icon}</span>
          {title}
        </h3>

        {/* Nội dung (Message) */}
        <div className="text-base text-gray-700 space-y-4">
          {children}
        </div>

        {/* Nút hành động */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={onClose}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg ${buttonColor} hover:opacity-90`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;