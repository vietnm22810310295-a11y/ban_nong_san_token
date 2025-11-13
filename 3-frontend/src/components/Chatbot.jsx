import React, { useState, useEffect, useRef } from 'react';

// --- Các Icon SVG (Giữ nguyên) ---
const ChatbotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M3.105 3.105a.5.5 0 0 1 .527-.02l11.34 4.94a.5.5 0 0 1 0 .815l-11.34 4.94a.5.5 0 0 1-.527-.02l-1.355-.73a.5.5 0 0 1-.013-.91l8.6-3.74a.5.5 0 0 1 .013-.91l-8.6-3.74a.5.5 0 0 1 .013-.91l1.355-.73Z" />
  </svg>
);
// --- Hết Icon SVG ---

// Hàm gọi API (Giữ nguyên)
async function fetchWithBackoff(apiUrl, payload, maxRetries = 5) {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorBody = await response.json();
        console.error("API Error Response:", errorBody);
        throw new Error(`HTTP error! status: ${response.status} - ${errorBody.error.message}`);
      }
      return await response.json();

    } catch (error) {
      console.warn(`Attempt ${i + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Đã đạt số lần thử tối đa. Không thể gọi API.');
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Xin chào! Tôi là AI tư vấn nông nghiệp. Bạn cần hỏi gì về mùa vụ hoặc cây trồng?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatboxRef = useRef(null);
  const chatContentRef = useRef(null);

  // Tự động cuộn xuống khi có tin nhắn mới
  useEffect(() => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  }, [messages]);

  // Xử lý bấm ra ngoài để đóng chat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatboxRef.current && !chatboxRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [chatboxRef]);

  // [SỬA LỖI] Cập nhật hàm handleSend
  const handleSend = async (e) => {
    e.preventDefault();
    const userMessage = inputValue.trim();
    if (!userMessage) return;

    // [SỬA] 1. Tạo tin nhắn mới của user
    const newUserMessage = { role: 'user', text: userMessage };
    // [SỬA] 2. Tạo mảng tin nhắn MỚI (bao gồm tin nhắn hiện tại)
    const newMessages = [...messages, newUserMessage];

    // 3. Cập nhật state (cho UI)
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    // --- Cấu hình Gemini API ---
    const systemPrompt = "Bạn là một AI trợ lý chuyên gia về nông nghiệp tại Việt Nam. Bạn nói tiếng Việt, thân thiện và chuyên nghiệp. Bạn sẽ sử dụng Google Search để đưa ra lời khuyên tốt nhất về các loại cây trồng, mùa vụ, và các mặt hàng nông sản theo mùa tại Việt Nam. Hãy trả lời ngắn gọn, tập trung vào lời khuyên thực tế.";
    
    const apiKey = "AIzaSyCh_VTgySDRYGzV0sFOFLyv7G3iHFneQqo"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // [SỬA] 4. Lọc bỏ tin nhắn chào mừng (tin nhắn đầu tiên, role: model)
    // Chúng ta chỉ lấy lịch sử chat từ tin nhắn "user" đầu tiên
    const historyForAPI = newMessages.slice(1); 

    const payload = {
      contents: [
        // Map qua lịch sử ĐÃ LỌC
        ...historyForAPI.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }))
      ],
      tools: [{ "google_search": {} }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
    };
    // --- Hết cấu hình ---

    try {
      const result = await fetchWithBackoff(apiUrl, payload);
      const modelResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (modelResponse) {
        setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);
      } else {
        // Nếu API trả về thành công nhưng không có nội dung text
        console.warn("API response was successful but empty:", result);
        throw new Error("Không nhận được phản hồi hợp lệ từ AI.");
      }

    } catch (error) {
      console.error('Gemini API error:', error);
      setMessages(prev => [...prev, { role: 'model', text: "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={chatboxRef}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-110"
          aria-label="Mở chat tư vấn"
        >
          <ChatbotIcon />
        </button>
      )}

      {isOpen && (
        <div className="w-[350px] h-[500px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-300">
          <div className="flex justify-between items-center p-4 bg-green-600 text-white rounded-t-lg">
            <h3 className="font-bold text-lg">AI Tư vấn Nông nghiệp</h3>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-75">
              <CloseIcon />
            </button>
          </div>
          <div ref={chatContentRef} className="flex-1 p-4 overflow-y-auto space-y-3 chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-lg text-sm relative ${
                    msg.role === 'user' 
                      ? 'bg-green-600 text-white chat-bubble-user' 
                      : 'bg-gray-200 text-gray-800 chat-bubble-model'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 p-3 rounded-lg text-sm chat-bubble-model">
                  <span className="animate-pulse">Đang suy nghĩ...</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSend} className="flex space-x-2">
              <input
                type="text"
                  value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Bạn cần tư vấn gì?"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:bg-gray-400"
                disabled={isLoading || !inputValue}
              >
                <SendIcon />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;