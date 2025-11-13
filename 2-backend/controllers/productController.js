const Product = require('../models/productModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel'); // [QUAN TRỌNG] Import Order Model
const { sendTransactionEmails } = require('../utils/emailService');

// @desc    Lấy tất cả sản phẩm (Chỉ hiện sản phẩm ĐÃ DUYỆT)
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

// @desc    Tạo sản phẩm mới
const createProduct = async (req, res) => {
  try {
    const {
      blockchainId, name, productType, description, harvestDate,
      region, farmName, price, priceVND, isOrganic, images, certifications,
      quantity, unit
    } = req.body;

    if (!blockchainId || !name || !productType || !harvestDate || !region || !price || !priceVND) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ success: false, message: 'Chỉ farmer mới có thể tạo sản phẩm' });
    }

    const existingProduct = await Product.findOne({ blockchainId });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'Sản phẩm đã tồn tại' });
    }

    const product = await Product.create({
      blockchainId, name, productType, description,
      harvestDate: new Date(harvestDate),
      region, farmName,
      farmerWallet: req.user.walletAddress,
      currentOwner: req.user.walletAddress,
      price, priceVND,
      isOrganic: isOrganic || false,
      images: images || [],
      certifications: certifications || [],
      quantity: quantity || 1,
      unit: unit || 'kg',
      status: 'available',
      approvalStatus: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Đăng sản phẩm thành công! Vui lòng chờ Admin duyệt.',
      data: product
    });
  } catch (error) {
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

// @desc    Lấy sản phẩm của farmer
const getFarmerProducts = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ success: false, message: 'Chỉ farmer mới xem được' });
    const { status } = req.query;
    const filter = { farmerWallet: req.user.walletAddress };
    if (status && status !== 'all') filter.status = status;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Cập nhật sản phẩm (Xử lý Mua hàng -> Tạo Order)
const updateProduct = async (req, res) => {
  try {
    const { mongoId } = req.params; 
    const updateData = req.body;
    const product = await Product.findById(mongoId); 
    
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

    const isFarmerOwner = product.farmerWallet === req.user.walletAddress;
    const isBuyer = req.user.role === 'buyer' || req.user.role === 'admin';

    // [QUAN TRỌNG] NGƯỜI MUA CẬP NHẬT (MUA HÀNG)
    if (isBuyer && updateData.quantitySold) {
        const qtySold = parseInt(updateData.quantitySold);
        
        // 1. Trừ tồn kho
        product.quantity = Math.max(0, product.quantity - qtySold);
        
        // 2. Nếu hết hàng -> Đổi trạng thái sản phẩm
        if (product.quantity === 0) {
            product.status = 'sold';
            product.isSold = true;
        }
        await product.save();

        // 3. TẠO ĐƠN HÀNG (ORDER)
        await Order.create({
            buyer: req.user.walletAddress,
            product: product._id,
            quantity: qtySold,
            totalPrice: product.price * qtySold,
            txHash: updateData.txHash || 'Blockchain Transaction',
            paymentMethod: 'crypto',
            status: 'completed'
        });

        // 4. Gửi mail
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

    // Logic cho Farmer sửa
    if (!isFarmerOwner) {
        return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa' });
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
    if (product.farmerWallet !== req.user.walletAddress) return res.status(403).json({ success: false, message: 'Không có quyền xóa' });
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

// @desc    Lấy lịch sử mua hàng (Lấy từ bảng Order)
const getMyPurchases = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') return res.status(403).json({ success: false, message: 'Chỉ buyer mới xem được' });
    
    // Lấy tất cả đơn hàng của user từ bảng ORDER
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

// @desc    [FIXED] Yêu cầu hoàn tiền (Cập nhật vào ORDER thay vì Product)
const requestRefund = async (req, res) => {
  try {
    const { mongoId } = req.params; // Đây là ID của ORDER (hoặc Product ID tùy frontend gửi)
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Cần lý do' });

    // Logic: Tìm Order để cập nhật trạng thái (Tránh cập nhật cả lô sản phẩm)
    // TH1: Frontend gửi Order ID (Chuẩn nhất)
    let order = await Order.findById(mongoId);
    
    // TH2: Frontend gửi Product ID (Dự phòng) -> Tìm order gần nhất của user này
    if (!order) {
        order = await Order.findOne({ 
            product: mongoId, 
            buyer: req.user.walletAddress 
        }).sort({ createdAt: -1 });
    }

    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng để hoàn tiền' });

    if (order.buyer !== req.user.walletAddress) {
         return res.status(403).json({ success: false, message: 'Bạn không phải chủ đơn hàng này' });
    }

    order.status = 'refund-requested';
    order.refundReason = reason;
    await order.save();

    res.json({ success: true, message: 'Đã gửi yêu cầu hoàn tiền', data: order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// @desc    [FIXED] Chấp nhận hoàn tiền (Cập nhật vào ORDER)
const approveRefund = async (req, res) => {
  try {
    const { mongoId } = req.params; // Order ID hoặc Product ID
    
    // Tìm order
    let order = await Order.findById(mongoId).populate('product');
    
    // Nếu không tìm thấy order, thử tìm bằng product id (trường hợp frontend gửi product id)
    if (!order) {
        // Logic này hơi rủi ro nếu có nhiều order cho 1 sp, nhưng tạm thời xử lý order mới nhất đang 'refund-requested'
        const product = await Product.findById(mongoId);
        if(product) {
             order = await Order.findOne({ product: mongoId, status: 'refund-requested' }).populate('product');
        }
    }

    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng cần hoàn tiền' });

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

// @desc    [MỚI] Lấy danh sách yêu cầu hoàn tiền cho Farmer (Lấy từ Order)
const getFarmerRefundRequests = async (req, res) => {
    try {
        // 1. Tìm tất cả sản phẩm của Farmer
        const products = await Product.find({ farmerWallet: req.user.walletAddress }).select('_id');
        const productIds = products.map(p => p._id);

        // 2. Tìm Order có status 'refund-requested' chứa các sản phẩm đó
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
    
    // Logic cũ (tạm thời giữ nguyên cho tiền mặt vì thường tiền mặt mua cả lô)
    // Nếu muốn nâng cấp mua lẻ tiền mặt, cần sửa thêm Order cho tiền mặt
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

    // Tạo Order cho tiền mặt để lưu lịch sử
    await Order.create({
        buyer: req.user.walletAddress, // Lưu tạm wallet người mua (nếu có) hoặc cần lưu UserID
        product: product._id,
        quantity: product.quantity, // Mua hết
        totalPrice: 0, // Tiền mặt không track giá ETH
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
  getFarmerRefundRequests // [MỚI] Export thêm hàm này
};