// src/components/InputModal.jsx
import React, { useState } from 'react';

/*
 * Component Modal có ô nhập liệu (thay thế window.prompt)
 * Props:
 * - isOpen: (boolean) Hiển thị modal
 * - onClose: (function) Hàm gọi khi bấm "Hủy"
 * - onSubmit: (function) Hàm gọi khi bấm "Gửi", trả về (text)
 * - title: (string) Tiêu đề
 * - label: (string) Nhãn cho ô text area
 * - submitText: (string) Chữ trên nút gửi
 */
const InputModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  submitText = "Gửi"
}) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(text);
    setText(''); // Xóa text sau khi gửi
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg p-6 bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          {title}
        </h3>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows="4"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            placeholder="Nhập lý do của bạn..."
            required
          />

          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white rounded-lg bg-yellow-600 hover:bg-yellow-700"
            >
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputModal;