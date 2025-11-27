// File: 1-blockchain/copyContracts.js
const fs = require('fs');
const path = require('path');

// 1. Xác định đường dẫn
const source = path.join(__dirname, 'build/contracts/AgriculturalMarketplace.json');
const destDir = path.join(__dirname, '../3-frontend/src/contracts');
const dest = path.join(destDir, 'AgriculturalMarketplace.json');

// 2. Kiểm tra file nguồn có tồn tại không
if (!fs.existsSync(source)) {
    console.error("❌ Lỗi: Không tìm thấy file gốc tại:", source);
    console.error("👉 Bạn đã chạy 'truffle migrate' chưa?");
    process.exit(1);
}

// 3. Tạo thư mục đích nếu chưa có
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// 4. Copy file
const content = fs.readFileSync(source);
fs.writeFileSync(dest, content);

console.log("-------------------------------------------------------");
console.log("✅ Đã copy file JSON sang Frontend thành công!");
console.log(`📄 Nguồn: ${source}`);
console.log(`📂 Đích:  ${dest}`);
console.log("-------------------------------------------------------");