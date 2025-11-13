const Product = require('../models/productModel');
const User = require('../models/userModel'); 
const { sendTransactionEmails } = require('../utils/emailService'); 

// @desc    Lấy tất cả sản phẩm với filter và pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      type, 
      region, 
      organic,
      minPrice, 
      maxPrice,
      status, // [SỬA] Bỏ giá trị mặc định = '' để xử lý logic bên dưới
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Tạo filter object
    const filter = {};

    // [FIX LOGIC QUAN TRỌNG]: 
    // Mặc định chỉ lấy 'available' nếu không truyền status.
    // Nếu truyền status='all' thì mới lấy tất cả.
    if (status) {
        if (status !== 'all') {
            filter.status = status;
        }
        // Nếu status === 'all', không gán filter.status -> lấy hết
    } else {
        filter.status = 'available'; 
    }
    
    if (type && type !== 'all') filter.productType = type;
    if (region) filter.region = new RegExp(region, 'i');
    
    // Xử lý boolean chính xác cho organic
    if (organic !== undefined && organic !== '') {
        filter.isOrganic = organic === 'true';
    }

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

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Thực hiện query
    const products = await Product.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); 

    // Thêm virtual field
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
      filters: {
        type,
        region,
        organic,
        minPrice,
        maxPrice,
        search,
        status: filter.status || 'all' // Trả về status thực tế để Frontend biết
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy chi tiết sản phẩm
// @route   GET /api/products/:id (id là blockchainId HOẶC mongoId)
// @access  Public
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let product;

    // [NÂNG CẤP] Kiểm tra thông minh: ID là MongoDB ID (24 hex chars) hay Blockchain ID (số)?
    // Giúp tránh lỗi khi Frontend gọi nhầm loại ID
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        product = await Product.findById(id);
        // Nếu tìm theo ID MongoDB không thấy, thử tìm theo BlockchainID (phòng hờ)
        if (!product) product = await Product.findOne({ blockchainId: id });
    } else {
        product = await Product.findOne({ blockchainId: id });
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Thêm virtual field
    const productWithVirtual = {
      ...product.toObject(),
      daysSinceHarvest: product.harvestDate ? Math.floor((new Date() - product.harvestDate) / (1000 * 60 * 60 * 24)) : 0
    };

    res.json({
      success: true,
      data: productWithVirtual
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Tạo sản phẩm mới
// @route   POST /api/products
// @access  Private (Farmer only)
const createProduct = async (req, res) => {
  try {
    const {
      blockchainId,
      name,
      productType,
      description,
      harvestDate,
      region,
      farmName,
      price,
      priceVND, 
      isOrganic,
      images,
      certifications,
    } = req.body;

    if (!blockchainId || !name || !productType || !harvestDate || !region || !price || !priceVND) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: blockchainId, name, productType, harvestDate, region, price (ETH), và priceVND'
      });
    }

    // Kiểm tra farmer role
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ farmer mới có thể tạo sản phẩm'
      });
    }

    // Kiểm tra sản phẩm đã tồn tại
    const existingProduct = await Product.findOne({ blockchainId });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm đã tồn tại trên blockchain'
      });
    }

    // Tạo sản phẩm mới
    const product = await Product.create({
      blockchainId,
      name,
      productType,
      description,
      harvestDate: new Date(harvestDate),
      region,
      farmName,
      farmerWallet: req.user.walletAddress,
      currentOwner: req.user.walletAddress,
      price,
      priceVND, 
      isOrganic: isOrganic || false,
      images: images || [],
      certifications: certifications || [],
      status: 'available'
    });

    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ: ' + messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy sản phẩm của farmer
// @route   GET /api/products/farmer/my-products
// @access  Private (Farmer only)
const getFarmerProducts = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ farmer mới có thể xem sản phẩm của mình'
      });
    }

    const { status } = req.query;
    const filter = { farmerWallet: req.user.walletAddress };
    
    // Nếu status = 'all' thì không lọc status (lấy hết), ngược lại thì lọc
    if (status && status !== 'all') {
        filter.status = status;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get farmer products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Cập nhật sản phẩm (Có tích hợp gửi mail khi BÁN THÀNH CÔNG)
// @route   PUT /api/products/update/:mongoId
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const { mongoId } = req.params; 
    const updateData = req.body;

    const product = await Product.findById(mongoId); 
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    const isFarmerOwner = product.farmerWallet === req.user.walletAddress;
    
    // Logic phân quyền: Cho phép Buyer/Admin cập nhật status='sold'
    const isBuyerUpdatingStatus = 
        (req.user.role === 'buyer' || req.user.role === 'admin') &&
        updateData.status === 'sold';

    if (isBuyerUpdatingStatus) {
        const allowedUpdates = ['status', 'isSold', 'currentOwner', 'txHash']; // Cho phép thêm txHash
        const updateKeys = Object.keys(updateData);

        for (const key of updateKeys) {
            if (!allowedUpdates.includes(key)) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có quyền cập nhật trạng thái đã bán cho sản phẩm này.'
                });
            }
        }
    } else if (!isFarmerOwner) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa sản phẩm này'
        });
    }

    delete updateData.blockchainId;
    delete updateData.farmerWallet;

    const updatedProduct = await Product.findByIdAndUpdate(
      mongoId, 
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    // [MỚI] --- GỬI EMAIL NẾU GIAO DỊCH THÀNH CÔNG (BLOCKCHAIN) ---
    if (updateData.status === 'sold') {
        try {
            // 1. Tìm Farmer (Người bán)
            const farmer = await User.findOne({ walletAddress: updatedProduct.farmerWallet });
            
            // 2. Tìm Buyer (Người mua - lúc này đã là currentOwner)
            const buyer = await User.findOne({ walletAddress: updatedProduct.currentOwner });

            // 3. Gửi mail (Không await để tránh user phải đợi lâu)
            sendTransactionEmails(buyer?.email, farmer?.email, {
                name: updatedProduct.name,
                price: updatedProduct.price,
                txHash: updateData.txHash || 'Giao dịch Blockchain'
            });
        } catch (emailErr) {
            console.error('Lỗi gửi mail trong updateProduct:', emailErr);
        }
    }
    // ----------------------------------------------------------

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ: ' + messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Xóa sản phẩm
// @route   DELETE /api/products/delete/:mongoId
// @access  Private (Product owner)
const deleteProduct = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const product = await Product.findById(mongoId); 
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    if (product.farmerWallet !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa sản phẩm này'
      });
    }

    if (product.isSold) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm đã bán'
      });
    }

    await Product.findByIdAndDelete(mongoId);

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy các loại sản phẩm (cho filter)
// @route   GET /api/products/types
// @access  Public
const getProductTypes = async (req, res) => {
  try {
    const types = await Product.distinct('productType');
    
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Get product types error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy các vùng (cho filter)
// @route   GET /api/products/regions
// @access  Public
const getProductRegions = async (req, res) => {
  try {
    const regions = await Product.distinct('region');
    
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('Get product regions error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Lấy sản phẩm đã mua của Buyer
// @route   GET /api/products/buyer/my-purchases
// @access  Private (Buyer only)
const getMyPurchases = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người mua mới có thể xem lịch sử mua hàng'
      });
    }

    const products = await Product.find({ 
      currentOwner: req.user.walletAddress,
      status: { $ne: 'available' }
    }).sort({ updatedAt: -1 }); 

    res.json({
      success: true,
      data: products,
      count: products.length
    });

  } catch (error) {
    console.error('Get my purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Buyer yêu cầu hoàn tiền
// @route   POST /api/products/request-refund/:mongoId
// @access  Private (Buyer only)
const requestRefund = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Lý do là bắt buộc' });
    }

    const product = await Product.findById(mongoId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    if (product.currentOwner !== req.user.walletAddress) {
      return res.status(403).json({ success: false, message: 'Bạn không sở hữu sản phẩm này' });
    }

    if (product.status !== 'sold') {
      return res.status(400).json({ 
        success: false, 
        message: `Không thể yêu cầu hoàn tiền cho sản phẩm có trạng thái "${product.status}"` 
      });
    }

    product.status = 'refund-requested';
    product.refundReason = reason;
    await product.save();

    res.json({
      success: true,
      message: 'Yêu cầu hoàn tiền đã được gửi',
      data: product
    });

  } catch (error) {
    console.error('Request refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Farmer chấp nhận hoàn tiền
// @route   POST /api/products/approve-refund/:mongoId
// @access  Private (Farmer only)
const approveRefund = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const product = await Product.findById(mongoId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    if (product.farmerWallet !== req.user.walletAddress) {
      return res.status(403).json({ success: false, message: 'Bạn không phải người bán của sản phẩm này' });
    }

    if (product.status !== 'refund-requested') {
      return res.status(400).json({ 
        success: false, 
        message: 'Sản phẩm này không đang trong trạng thái yêu cầu hoàn tiền' 
           });
    }

    product.status = 'refunded';
    await product.save();

    res.json({
      success: true,
      message: 'Đã chấp nhận hoàn tiền (tượng trưng)',
      data: product
    });

  } catch (error) {
    console.error('Approve refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Buyer yêu cầu mua tiền mặt
// @route   POST /api/products/request-cash/:mongoId
// @access  Private (Buyer only)
const requestCashPurchase = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const product = await Product.findById(mongoId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    // Không thể mua sản phẩm của chính mình
    if (product.farmerWallet === req.user.walletAddress) {
        return res.status(400).json({ success: false, message: 'Bạn không thể mua sản phẩm của chính mình' });
    }

    if (product.status !== 'available') {
      return res.status(400).json({ 
        success: false, 
        message: `Sản phẩm này không có sẵn (Trạng thái: ${product.status})` 
      });
    }

    product.status = 'cash-pending';
    product.buyer = req.user.id; // Lưu ID người mua
    product.currentOwner = req.user.walletAddress; 
    await product.save();

    res.json({
      success: true,
      message: 'Đã gửi yêu cầu mua tiền mặt. Chờ người bán xác nhận.',
      data: product
    });

  } catch (error) {
    console.error('Request cash purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// @desc    Farmer xác nhận đã nhận tiền mặt (Có tích hợp gửi mail)
// @route   POST /api/products/confirm-cash/:mongoId
// @access  Private (Farmer only)
const confirmCashPurchase = async (req, res) => {
  try {
    const { mongoId } = req.params;
    const product = await Product.findById(mongoId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    if (product.farmerWallet !== req.user.walletAddress) {
      return res.status(403).json({ success: false, message: 'Bạn không phải người bán của sản phẩm này' });
    }

    if (product.status !== 'cash-pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Sản phẩm này không đang chờ thanh toán tiền mặt' 
      });
    }

    product.status = 'sold';
    product.isSold = true;
    // currentOwner đã được gán khi buyer yêu cầu
    await product.save();

    // [MỚI] --- GỬI EMAIL THÔNG BÁO GIAO DỊCH TIỀN MẶT THÀNH CÔNG ---
    try {
        const farmer = await User.findOne({ walletAddress: req.user.walletAddress });
        // product.buyer chứa _id của người mua
        const buyer = await User.findById(product.buyer);

        sendTransactionEmails(buyer?.email, farmer?.email, {
            name: product.name,
            price: product.price,
            txHash: 'Giao dịch Tiền mặt trực tiếp'
        });
    } catch (emailErr) {
        console.error('Lỗi gửi mail trong confirmCashPurchase:', emailErr);
    }
    // --------------------------------------------------------------

    res.json({
      success: true,
      message: 'Đã xác nhận thanh toán tiền mặt và chuyển hàng.',
      data: product
    });

  } catch (error) {
    console.error('Confirm cash purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
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
  // Hoàn tiền
  getMyPurchases,
  requestRefund,
  approveRefund,
  // Mua tiền mặt
  requestCashPurchase,
  confirmCashPurchase
};