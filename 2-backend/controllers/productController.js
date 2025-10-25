const Product = require('../models/productModel');

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
      status = 'available',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Tạo filter object
    const filter = { status };
    
    if (type && type !== 'all') filter.productType = type;
    if (region) filter.region = new RegExp(region, 'i');
    if (organic !== undefined) filter.isOrganic = organic === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { region: new RegExp(search, 'i') }
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
      .lean(); // Chuyển thành plain object

    // Thêm virtual field
    const productsWithVirtual = products.map(product => ({
      ...product,
      daysSinceHarvest: Math.floor((new Date() - new Date(product.harvestDate)) / (1000 * 60 * 60 * 24))
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
        status
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
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ blockchainId: req.params.id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Thêm virtual field
    const productWithVirtual = {
      ...product.toObject(),
      daysSinceHarvest: Math.floor((new Date() - product.harvestDate) / (1000 * 60 * 60 * 24))
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
      isOrganic,
      images,
      certifications,
      quantity,
      unit
    } = req.body;

    // Validation
    if (!blockchainId || !name || !productType || !harvestDate || !region || !price) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: blockchainId, name, productType, harvestDate, region, price'
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
      isOrganic: isOrganic || false,
      images: images || [],
      certifications: certifications || [],
      quantity: quantity || 1,
      unit: unit || 'kg',
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
    if (status) filter.status = status;

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

// @desc    Cập nhật sản phẩm
// @route   PUT /api/products/:id
// @access  Private (Product owner)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Tìm sản phẩm
    const product = await Product.findOne({ blockchainId: id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Kiểm tra quyền sở hữu
    if (product.farmerWallet !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa sản phẩm này'
      });
    }

    // Không cho phép cập nhật một số trường
    delete updateData.blockchainId;
    delete updateData.farmerWallet;
    delete updateData.currentOwner;

    // Cập nhật sản phẩm
    const updatedProduct = await Product.findOneAndUpdate(
      { blockchainId: id },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

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
// @route   DELETE /api/products/:id
// @access  Private (Product owner)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ blockchainId: id });
    
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

    await Product.findOneAndDelete({ blockchainId: id });

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

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  getFarmerProducts,
  updateProduct,
  deleteProduct,
  getProductTypes,
  getProductRegions
};