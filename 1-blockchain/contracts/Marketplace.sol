// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgriculturalMarketplace {
    // Struct sản phẩm nông sản
    struct Product {
        uint256 id;
        string name;
        string productType;
        uint256 harvestDate;
        string region;
        string farmName;
        address farmer;
        address owner;      // Người đang giữ quyền bán
        uint256 price;      // GIÁ TRÊN 1 ĐƠN VỊ
        bool isOrganic;
        bool isSold;        // True nếu quantity = 0
        uint256 createdAt;
        uint256 quantity;   // Số lượng còn lại
        string unit;        // Đơn vị (kg, tấn, tạ...)
    }

    // Struct người dùng
    struct User {
        address walletAddress;
        string name;
        string role; // "farmer", "buyer", "admin"
        uint256 joinDate;
        bool isRegistered;
    }

    // Struct lưu lịch sử mua hàng chi tiết
    struct Purchase {
        uint256 productId;
        uint256 quantity;
        uint256 totalPrice;
        uint256 timestamp;
    }

    uint256 public productCount = 0;
    uint256 public userCount = 0;

    mapping(uint256 => Product) public products;
    mapping(address => User) public users;
    mapping(address => uint256[]) public farmerProducts;
    mapping(address => Purchase[]) public userPurchases;

    event UserRegistered(address userAddress, string name, string role);
    event ProductRegistered(uint256 productId, string name, address farmer, uint256 quantity);
    event ProductSold(uint256 productId, address buyer, uint256 quantity, uint256 totalPrice);
    event PriceUpdated(uint256 productId, uint256 newPrice);
    event StockUpdated(uint256 productId, uint256 newQuantity);

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyProductOwner(uint256 _productId) {
        require(products[_productId].owner == msg.sender, "Not product owner");
        _;
    }

    // Đăng ký người dùng
    function registerUser(string memory _name, string memory _role) public {
        require(!users[msg.sender].isRegistered, "User already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        // Validate Role
        bytes32 roleHash = keccak256(abi.encodePacked(_role));
        require(
            roleHash == keccak256(abi.encodePacked("farmer")) || 
            roleHash == keccak256(abi.encodePacked("buyer")) ||
            roleHash == keccak256(abi.encodePacked("admin")), 
            "Invalid role"
        );

        users[msg.sender] = User({
            walletAddress: msg.sender,
            name: _name,
            role: _role,
            joinDate: block.timestamp,
            isRegistered: true
        });

        userCount++;
        emit UserRegistered(msg.sender, _name, _role);
    }

    // Đăng ký sản phẩm (Thêm quantity và unit)
    function registerProduct(
        string memory _name,
        string memory _productType,
        uint256 _harvestDate,
        string memory _region,
        string memory _farmName,
        uint256 _pricePerUnit,
        bool _isOrganic,
        uint256 _quantity,
        string memory _unit
    ) public onlyRegistered {
        // [ĐÃ SỬA] Cho phép cả "farmer" VÀ "admin" được đăng sản phẩm
        bytes32 roleHash = keccak256(abi.encodePacked(users[msg.sender].role));
        require(
            roleHash == keccak256(abi.encodePacked("farmer")) || 
            roleHash == keccak256(abi.encodePacked("admin")), 
            "Only farmers or admins can register products"
        );

        require(_pricePerUnit > 0, "Price must be greater than 0");
        require(_quantity > 0, "Quantity must be greater than 0");

        productCount++;
        products[productCount] = Product({
            id: productCount,
            name: _name,
            productType: _productType,
            harvestDate: _harvestDate,
            region: _region,
            farmName: _farmName,
            farmer: msg.sender,
            owner: msg.sender,
            price: _pricePerUnit,
            isOrganic: _isOrganic,
            isSold: false,
            createdAt: block.timestamp,
            quantity: _quantity,
            unit: _unit
        });

        farmerProducts[msg.sender].push(productCount);
        emit ProductRegistered(productCount, _name, msg.sender, _quantity);
    }

    // Mua sản phẩm theo số lượng
    function buyProduct(uint256 _productId, uint256 _quantityToBuy) public payable onlyRegistered {
        require(_productId > 0 && _productId <= productCount, "Product does not exist");
        Product storage product = products[_productId];
        
        require(!product.isSold, "Product is sold out");
        require(product.quantity >= _quantityToBuy, "Not enough stock");
        require(product.owner != msg.sender, "Cannot buy your own product");

        // Tính tổng tiền: Giá đơn vị * Số lượng mua
        uint256 totalCost = product.price * _quantityToBuy;
        require(msg.value >= totalCost, "Insufficient ETH sent");

        // 1. Trừ kho
        product.quantity = product.quantity - _quantityToBuy;

        // 2. Nếu hết hàng -> Đánh dấu đã bán hết
        if (product.quantity == 0) {
            product.isSold = true;
        }

        // 3. Chuyển tiền cho người bán (Farmer hoặc Admin)
        payable(product.owner).transfer(totalCost);

        // 4. Hoàn tiền thừa (nếu có)
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        // 5. Lưu lịch sử mua hàng
        userPurchases[msg.sender].push(Purchase({
            productId: _productId,
            quantity: _quantityToBuy,
            totalPrice: totalCost,
            timestamp: block.timestamp
        }));

        emit ProductSold(_productId, msg.sender, _quantityToBuy, totalCost);
    }

    // Cập nhật số lượng hàng (Nhập thêm hàng)
    function restockProduct(uint256 _productId, uint256 _addedQuantity) public onlyProductOwner(_productId) {
        require(_addedQuantity > 0, "Quantity must be positive");
        products[_productId].quantity += _addedQuantity;
        
        // Nếu đang hết hàng mà nhập thêm -> Mở bán lại
        if (products[_productId].isSold && products[_productId].quantity > 0) {
            products[_productId].isSold = false;
        }
        
        emit StockUpdated(_productId, products[_productId].quantity);
    }

    // Cập nhật giá
    function updateProductPrice(uint256 _productId, uint256 _newPrice) public onlyProductOwner(_productId) {
        require(_newPrice > 0, "Price must be greater than 0");
        products[_productId].price = _newPrice;
        emit PriceUpdated(_productId, _newPrice);
    }

    // GETTERS
    function getProduct(uint256 _productId) public view returns (Product memory) {
        return products[_productId];
    }

    function getFarmerProducts(address _farmer) public view returns (uint256[] memory) {
        return farmerProducts[_farmer];
    }

    // Lấy danh sách mua hàng chi tiết
    function getUserPurchases(address _user) public view returns (Purchase[] memory) {
        return userPurchases[_user];
    }

    function isUserRegistered(address _user) public view returns (bool) {
        return users[_user].isRegistered;
    }
    
    function getUserInfo(address _user) public view returns (string memory, string memory, uint256, bool) {
        User memory u = users[_user];
        return (u.name, u.role, u.joinDate, u.isRegistered);
    }
}