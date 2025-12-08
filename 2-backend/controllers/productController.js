const Product = require('../models/productModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel'); // Import Order Model
const { sendTransactionEmails } = require('../utils/emailService');

// @desc    Lấy tất cả sản phẩm (Chỉ hiện sản phẩm ĐÃ DUYỆT cho khách xem)
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, limit = 12, type, region, organic,
      minPrice, maxPrice, status, search,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const filter = {};
    filter.approvalStatus = 'approved';

    if (status) {
        if (status !== 'all') filter.status = status;
    } else {
        filter.status = 'available'; 
    }
    
    if (type && type !== 'all') filter.productType = type;
    if (region) filter.region = new RegExp(region, 'i');
    if (organic !== undefined && organic !== '') filter.isOrganic = organic === 'true';

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { region: new RegExp(search, 'i') },
        { farmName: new RegExp(search, 'i') }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); 

    const productsWithVirtual = products.map(product => ({
      ...product,
      daysSinceHarvest: product.harvestDate ? Math.floor((new Date() - new Date(product.harvestDate)) / (1000 * 60 * 60 * 24)) : 0
    }));

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: productsWithVirtual,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      },
      filters: { type, region, organic, minPrice, maxPrice, search, status }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Lấy chi tiết sản phẩm
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let product;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        product = await Product.findById(id);
        if (!product) product = await Product.findOne({ blockchainId: id });
    } else {
        product = await Product.findOne({ blockchainId: id });
    }
    
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

    const productWithVirtual = {
      ...product.toObject(),
      daysSinceHarvest: product.harvestDate ? Math.floor((new Date() - product.harvestDate) / (1000 * 60 * 60 * 24)) : 0
    };

    res.json({ success: true, data: productWithVirtual });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Tạo sản phẩm mới (Đã sửa cho phép Admin)
const createProduct = async (req, res) => {
  try {
    // 1. In ra dữ liệu Frontend gửi lên để kiểm tra
    console.log("---------------------------------------------");
    console.log("📥 [DEBUG] Đang tạo sản phẩm mới...");
    console.log("📦 Body nhận được:", req.body);
    console.log("👤 User Role:", req.user.role);

    const {
      blockchainId, name, productType, description, harvestDate,
      region, farmName, price, priceVND, isOrganic, images, certifications,
      quantity, unit
    } = req.body;

    // 2. Kiểm tra các trường bắt buộc
    const missingFields = [];
    if (!blockchainId) missingFields.push('blockchainId');
    if (!name) missingFields.push('name');
    if (!productType) missingFields.push('productType');
    if (!harvestDate) missingFields.push('harvestDate');
    if (!region) missingFields.push('region');
    if (!price) missingFields.push('price');
    if (!priceVND) missingFields.push('priceVND');

    if (missingFields.length > 0) {
      console.error("❌ [ERROR] Thiếu các trường bắt buộc:", missingFields);
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin: ' + missingFields.join(', ') 
      });
    }

    // [ĐÃ SỬA] Cho phép cả 'farmer' và 'admin' tạo sản phẩm
    if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo sản phẩm' });
    }

    const existingProduct = await Product.findOne({ blockchainId });
    if (existingProduct) {
      console.error("❌ [ERROR] Trùng Blockchain ID:", blockchainId);
      return res.status(400).json({ success: false, message: 'Sản phẩm đã tồn tại (Trùng ID Blockchain)' });
    }

    // Tự động duyệt nếu là Admin đăng bài (hoặc vẫn để pending tùy bạn - ở đây mình để pending cho thống nhất quy trình)
    const initialStatus = req.user.role === 'admin' ? 'approved' : 'pending';

    const product = await Product.create({
      blockchainId, name, productType, description,
      harvestDate: new Date(harvestDate),
      region, farmName,
      farmerWallet: req.user.walletAddress, // Lưu ví của người tạo (Admin hoặc Farmer)
      currentOwner: req.user.walletAddress,
      price, priceVND,
      isOrganic: isOrganic || false,
      images: images || [],
      certifications: certifications || [],
      quantity: quantity || 1,
      unit: unit || 'kg',
      status: 'available',
      approvalStatus: initialStatus // Admin đăng thì duyệt luôn, Farmer đăng thì chờ
    });

    console.log("✅ Tạo sản phẩm thành công trên DB:", product._id);
    
    // Thông báo khác nhau tùy role
    const msg = req.user.role === 'admin' 
        ? 'Đăng sản phẩm thành công (Đã tự động duyệt)!' 
        : 'Đăng sản phẩm thành công! Vui lòng chờ duyệt.';

    res.status(201).json({
      success: true,
      message: msg,
      data: product
    });
  } catch (error) {
    console.error("❌ [SERVER ERROR]:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Dữ liệu lỗi: ' + Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

// @desc    [ADMIN] Lấy danh sách chờ duyệt
const getPendingProducts = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền này' });
        const products = await Product.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 });
        res.json({ success: true, count: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// @desc    [ADMIN] Duyệt hoặc Từ chối sản phẩm
const approveProduct = async (req, res) => {
    try {
        const { mongoId } = req.params;
        const { status } = req.body;

        if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền này' });
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });

        const product = await Product.findByIdAndUpdate(mongoId, { approvalStatus: status }, { new: true });
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.json({ success: true, message: `Đã cập nhật trạng thái thành: ${status}`, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// @desc    Lấy sản phẩm của người bán (Farmer Dashboard)
const getFarmerProducts = async (req, res) => {
  try {
    // [ĐÃ SỬA] Cho phép cả Admin xem danh sách sản phẩm mình đã đăng
    if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập dashboard này' });
    }

    const { status } = req.query;
    // Chỉ lấy sản phẩm do CHÍNH user đó tạo (dựa vào walletAddress)
    const filter = { farmerWallet: req.user.walletAddress };
    
    if (status && status !== 'all') filter.status = status;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Cập nhật sản phẩm
const updateProduct = async (req, res) => {
  try {
    const { mongoId } = req.params; 
    const updateData = req.body;
    const product = await Product.findById(mongoId); 
    
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

    // Kiểm tra quyền sở hữu: Người tạo (farmerWallet) == Người đang login
    const isOwner = product.farmerWallet === req.user.walletAddress;
    const isBuyer = req.user.role === 'buyer'; // Admin cũng có thể là buyer nếu muốn test mua

    // [QUAN TRỌNG] NGƯỜI MUA CẬP NHẬT (MUA HÀNG)
    if (updateData.quantitySold) {
        // Cho phép bất kỳ ai mua hàng (trừ chính chủ nếu muốn chặn, nhưng ở đây logic xử lý việc trừ kho)
        const qtySold = parseInt(updateData.quantitySold);
        
        product.quantity = Math.max(0, product.quantity - qtySold);
        if (product.quantity === 0) {
            product.status = 'sold';
            product.isSold = true;
        }
        await product.save();

        await Order.create({
            buyer: req.user.walletAddress,
            product: product._id,
            quantity: qtySold,
            totalPrice: product.price * qtySold,
            txHash: updateData.txHash || 'Blockchain Transaction',
            paymentMethod: 'crypto',
            status: 'completed'
        });

        try {
            const farmer = await User.findOne({ walletAddress: product.farmerWallet });
            sendTransactionEmails(req.user.email, farmer?.email, {
                name: product.name,
                price: product.price, 
                txHash: updateData.txHash
            });
        } catch (e) { console.error('Lỗi gửi mail:', e); }

        return res.json({
            success: true,
            message: 'Mua hàng thành công',
            data: product
        });
    }

    // Logic cho Người Bán (Farmer/Admin) sửa thông tin sản phẩm
    if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa sản phẩm này' });
    }

    delete updateData.blockchainId;
    delete updateData.farmerWallet;
    const updatedProduct = await Product.findByIdAndUpdate(mongoId, { ...updateData, updatedAt: new Date() }, { new: true });
    res.json({ success: true, message: 'Cập nhật thành công', data: updatedProduct });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xóa sản phẩm
const deleteProduct = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const product = await Product.findById(mongoId); 
    
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    
    // Chỉ người tạo mới được xóa
    if (product.farmerWallet !== req.user.walletAddress) {
        return res.status(403).json({ success: false, message: 'Không có quyền xóa' });
    }

    if (product.isSold) return res.status(400).json({ success: false, message: 'Không thể xóa sản phẩm đã bán' });

    await Product.findByIdAndDelete(mongoId);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

// Các hàm tiện ích
const getProductTypes = async (req, res) => {
  const types = await Product.distinct('productType');
  res.json({ success: true, data: types });
};

const getProductRegions = async (req, res) => {
  const regions = await Product.distinct('region');
  res.json({ success: true, data: regions });
};

// @desc    Lấy lịch sử mua hàng
const getMyPurchases = async (req, res) => {
  try {
    if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
       // Admin cũng có thể test mua hàng nên cho phép xem luôn
       return res.status(403).json({ success: false, message: 'Chỉ buyer mới xem được' });
    }
    
    const orders = await Order.find({ buyer: req.user.walletAddress })
                              .populate('product') 
                              .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Yêu cầu hoàn tiền
const requestRefund = async (req, res) => {
  try {
    const { mongoId } = req.params; 
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Cần lý do' });

    let order = await Order.findById(mongoId);
    
    if (!order) {
        order = await Order.findOne({ 
            product: mongoId, 
            buyer: req.user.walletAddress 
        }).sort({ createdAt: -1 });
    }

    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    if (order.buyer !== req.user.walletAddress) {
         return res.status(403).json({ success: false, message: 'Bạn không phải chủ đơn hàng này' });
    }

    order.status = 'refund-requested';
    order.refundReason = reason;
    await order.save();

    res.json({ success: true, message: 'Đã gửi yêu cầu hoàn tiền', data: order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @desc    Chấp nhận hoàn tiền
const approveRefund = async (req, res) => {
  try {
    const { mongoId } = req.params; 
    let order = await Order.findById(mongoId).populate('product');
    
    if (!order) {
        const product = await Product.findById(mongoId);
        if(product) {
             order = await Order.findOne({ product: mongoId, status: 'refund-requested' }).populate('product');
        }
    }

    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    // Kiểm tra quyền: Người bán (Admin hoặc Farmer)
    if (order.product.farmerWallet !== req.user.walletAddress) {
        return res.status(403).json({ success: false, message: 'Bạn không phải người bán của đơn hàng này' });
    }

    if (order.status !== 'refund-requested') {
        return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái chờ hoàn tiền' });
    }

    order.status = 'refunded';
    await order.save();
    res.json({ success: true, message: 'Đã hoàn tiền đơn hàng', data: order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @desc    Lấy danh sách yêu cầu hoàn tiền cho người bán (Farmer/Admin)
const getFarmerRefundRequests = async (req, res) => {
    try {
        const products = await Product.find({ farmerWallet: req.user.walletAddress }).select('_id');
        const productIds = products.map(p => p._id);

        const refundOrders = await Order.find({
            product: { $in: productIds },
            status: 'refund-requested'
        }).populate('product');

        res.json({ success: true, data: refundOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mua tiền mặt
const requestCashPurchase = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const product = await Product.findById(mongoId);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    if (product.farmerWallet === req.user.walletAddress) return res.status(400).json({ success: false, message: 'Không thể tự mua' });
    
    if (product.status !== 'available') return res.status(400).json({ success: false, message: 'Đã bán hoặc chờ xử lý' });

    product.status = 'cash-pending';
    product.buyer = req.user.id; 
    product.currentOwner = req.user.walletAddress; 
    await product.save();
    res.json({ success: true, message: 'Đã yêu cầu mua tiền mặt', data: product });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @desc    Xác nhận tiền mặt
const confirmCashPurchase = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const product = await Product.findById(mongoId);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (product.farmerWallet !== req.user.walletAddress) return res.status(403).json({ success: false, message: 'Không phải người bán' });
    if (product.status !== 'cash-pending') return res.status(400).json({ success: false, message: 'Sai trạng thái' });

    product.status = 'sold';
    product.isSold = true;
    await product.save();

    await Order.create({
        buyer: req.user.walletAddress, 
        product: product._id,
        quantity: product.quantity, 
        totalPrice: 0, 
        paymentMethod: 'cash',
        status: 'completed'
    });

    try {
        const farmer = await User.findOne({ walletAddress: req.user.walletAddress });
        const buyer = await User.findById(product.buyer);
        sendTransactionEmails(buyer?.email, farmer?.email, {
            name: product.name, price: product.price, txHash: 'Tiền mặt trực tiếp'
        });
    } catch (e) { console.error(e); }

    res.json({ success: true, message: 'Giao dịch thành công', data: product });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  getFarmerProducts,
  updateProduct,
  deleteProduct,
  getProductTypes,
  getProductRegions,
  getMyPurchases,
  requestRefund,
  approveRefund,
  requestCashPurchase,
  confirmCashPurchase,
  getPendingProducts,
  approveProduct,
  getFarmerRefundRequests
};