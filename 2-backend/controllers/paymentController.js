const moment = require('moment');
const querystring = require('qs');
const crypto = require('crypto');

// --- Cấu hình Test VNPay ---
// Bạn có thể giữ nguyên mã test này để demo
const tmnCode = "GIU01VA3"; 
const secretKey = "ZDN38F3AQBN15KDVECUJRZU122UCTKWL"; 
const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
// ----------------------------

// @desc    Tạo URL thanh toán
// @route   POST /api/payment/create_payment_url
const createPaymentUrl = (req, res) => {
    try {
        process.env.TZ = 'Asia/Ho_Chi_Minh';
        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');
        
        const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        const { 
            amount,         // Tổng tiền (VND)
            orderInfo,      // Thông tin đơn hàng
            orderId,        // Mã đơn hàng (VD: timestamp)
            vnp_ReturnUrl   // [FIX QUAN TRỌNG] URL để trả về
        } = req.body;

        // Nếu Frontend không gửi URL, mặc định trả về localhost (dùng cho test)
        const returnUrl = vnp_ReturnUrl || 'http://localhost:5173/vnpay-return';

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId + '_' + moment(date).format('HHmmss'); // Đảm bảo mã giao dịch là duy nhất
        vnp_Params['vnp_OrderInfo'] = orderInfo;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100; // VNPay dùng đơn vị 'đồng' (nhân 100)
        vnp_Params['vnp_ReturnUrl'] = returnUrl; // [FIX] Gán URL động
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        // Sắp xếp
        vnp_Params = sortObject(vnp_Params);

        // Tạo chữ ký
        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex"); 
        
        vnp_Params['vnp_SecureHash'] = signed;
        
        // Tạo URL cuối cùng
        const paymentUrl = vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });

        res.json({ success: true, url: paymentUrl });
    } catch (error) {
        console.error("VNPay Create Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    (Tùy chọn) Xử lý IPN (VNPay gọi ngầm về server)
// Hiện tại chúng ta đang xử lý ở Client (VnPayReturn.jsx) nên hàm này có thể chưa cần dùng
const vnpayReturn = async (req, res) => {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        // TODO: Logic kiểm tra đơn hàng, cập nhật trạng thái...
        // ...
        // Phản hồi cho VNPay
        res.json({ RspCode: '00', Message: 'success' });
    } else {
        res.json({ RspCode: '97', Message: 'Fail checksum' });
    }
};

// Hàm phụ trợ sắp xếp (Bắt buộc của VNPay)
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

module.exports = {
    createPaymentUrl,
    vnpayReturn
};