const nodemailer = require('nodemailer');

// Cấu hình tài khoản gửi mail (Dùng Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vietnguyenminh28@gmail.com', // [THAY ĐỔI] Email của bạn (dùng làm email hệ thống gửi đi)
    pass: 'spfn ymah nzpl fosl'     // [THAY ĐỔI] Mật khẩu ứng dụng (Không phải mật khẩu đăng nhập Gmail)
  }
});

// Hàm gửi mail thông báo giao dịch
const sendTransactionEmails = async (buyerEmail, sellerEmail, productDetails) => {
  try {
    // 1. Gửi mail cho Người Mua (Xác nhận mua thành công)
    if (buyerEmail) {
      const buyerMailOptions = {
        from: '"Nông Sản Blockchain" <no-reply@nongsan.com>',
        to: buyerEmail,
        subject: '✅ Mua hàng thành công - Nông Sản Blockchain',
        html: `
          <h3>Chúc mừng bạn đã mua hàng thành công!</h3>
          <p>Bạn vừa mua sản phẩm: <b>${productDetails.name}</b></p>
          <p>Giá: <b>${productDetails.price} ETH</b></p>
          <p>Mã giao dịch: ${productDetails.txHash}</p>
          <p>Cảm ơn bạn đã tin tưởng sử dụng nền tảng.</p>
        `
      };
      await transporter.sendMail(buyerMailOptions);
      console.log('Đã gửi mail cho người mua:', buyerEmail);
    }

    // 2. Gửi mail cho Người Bán (Thông báo có người mua)
    if (sellerEmail) {
      const sellerMailOptions = {
        from: '"Nông Sản Blockchain" <no-reply@nongsan.com>',
        to: sellerEmail,
        subject: 'Sản phẩm của bạn đã được bán!',
        html: `
          <h3>Tin vui: Sản phẩm của bạn đã có người mua!</h3>
          <p>Sản phẩm: <b>${productDetails.name}</b></p>
          <p>Giá bán: <b>${productDetails.price} ETH</b></p>
          <p>Vui lòng kiểm tra ví của bạn để xác nhận số dư.</p>
        `
      };
      await transporter.sendMail(sellerMailOptions);
      console.log('Đã gửi mail cho người bán:', sellerEmail);
    }

  } catch (error) {
    console.error('Lỗi gửi email:', error);
    // Không throw error để tránh làm lỗi luồng giao dịch chính
  }
};

module.exports = { sendTransactionEmails };