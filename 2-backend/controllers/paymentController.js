const moment = require('moment');
const qs = require('qs');
const crypto = require('crypto');

// Cấu hình (Bạn đã điền key)
const config = {
  vnp_TmnCode: "GIU01VA3", 
  vnp_HashSecret: "ZDN38F3AQBN15KDVECUJRZU122UCTKWL",
  vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnp_ReturnUrl: "http://localhost:5173/vnpay-return" // Link frontend nhận kết quả
};

const createPaymentUrl = (req, res) => {
  try {
    // [SỬA 1] Nhận thêm "orderId" (là blockchainId) và "amount" (là priceVND)
    const { amount, orderInfo, orderId } = req.body;

    // Kiểm tra đầu vào
    if (!amount || !orderId) {
      return res.status(400).json({ success: false, message: 'Thiếu số tiền (amount) hoặc mã đơn hàng (orderId)' });
    }
    
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    
    // [SỬA 2] Dùng orderId (blockchainId) làm mã giao dịch
    // Thêm hậu tố thời gian (HHmmss) để VNPAY không báo lỗi "trùng mã đơn hàng" khi bạn test nhiều lần
    const txnRef = `${orderId}-${moment(date).format('HHmmss')}`; 
    
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = config.vnp_TmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = txnRef; // [SỬA 3] Dùng mã giao dịch mới
    vnp_Params['vnp_OrderInfo'] = orderInfo || 'Thanh toan don hang';
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100; // VNPAY tính đơn vị là đồng (VD: 50.000 VND -> 5000000)
    vnp_Params['vnp_ReturnUrl'] = config.vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr'] = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    vnp_Params['vnp_CreateDate'] = createDate;

    // Sắp xếp tham số (Bắt buộc)
    vnp_Params = sortObject(vnp_Params);

    // Ký tên (Signature)
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", config.vnp_HashSecret);
    // [SỬA 4] Dùng Buffer.from thay vì new Buffer (cú pháp mới)
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
    
    vnp_Params['vnp_SecureHash'] = signed;
    
    const vnpUrl = config.vnp_Url + '?' + qs.stringify(vnp_Params, { encode: false });

    res.status(200).json({ success: true, url: vnpUrl });

  } catch (error) {
    console.error('Lỗi tạo link thanh toán VNPAY:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo link thanh toán' });
  }
};

// Hàm sắp xếp tham số (Giữ nguyên)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj){
    if (obj.hasOwnProperty(key)) {
    str.push(encodeURIComponent(key));
    }
  }
  str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

module.exports = { createPaymentUrl };