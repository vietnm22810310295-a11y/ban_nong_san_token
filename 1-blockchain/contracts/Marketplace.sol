// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgriculturalMarketplace {
    // Struct sản phẩm nông sản
    struct Product {
        uint256 id;
        string name;
        string productType; // lúa, cà phê, tiêu, điều...
        uint256 harvestDate;
        string region; // vùng trồng
        string farmName;
        address farmer;
        address owner;
        uint256 price; // giá in wei
        bool isOrganic;
        bool isSold;
        uint256 createdAt;
    }

    // Struct người dùng
    struct User {
        address walletAddress;
        string name;
        string role; // "farmer", "buyer", "admin"
        uint256 joinDate;
        bool isRegistered;
    }

    // Biến state
    uint256 public productCount = 0;
    uint256 public userCount = 0;
    
    // Mappings
    mapping(uint256 => Product) public products;
    mapping(address => User) public users;
    mapping(address => uint256[]) public farmerProducts;
    mapping(address => uint256[]) public userPurchases;

    // Events
    event UserRegistered(address userAddress, string name, string role);
    event ProductRegistered(uint256 productId, string name, address farmer);
    event ProductSold(uint256 productId, address buyer, uint256 price);
    event PriceUpdated(uint256 productId, uint256 newPrice);

    // Modifiers
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyProductOwner(uint256 _productId) {
        require(products[_productId].owner == msg.sender, "Not product owner");
        _;
    }

    modifier productNotSold(uint256 _productId) {
        require(!products[_productId].isSold, "Product already sold");
        _;
    }

    // Đăng ký người dùng
    function registerUser(string memory _name, string memory _role) public {
        require(!users[msg.sender].isRegistered, "User already registered");
        require(
            keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("farmer")) ||
            keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("buyer")),
            "Role must be farmer or buyer"
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

    // Đăng ký sản phẩm mới (chỉ farmer)
    function registerProduct(
        string memory _name,
        string memory _productType,
        uint256 _harvestDate,
        string memory _region,
        string memory _farmName,
        uint256 _price,
        bool _isOrganic
    ) public onlyRegistered {
        require(
            keccak256(abi.encodePacked(users[msg.sender].role)) == keccak256(abi.encodePacked("farmer")),
            "Only farmers can register products"
        );

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
            price: _price,
            isOrganic: _isOrganic,
            isSold: false,
            createdAt: block.timestamp
        });

        farmerProducts[msg.sender].push(productCount);
        
        emit ProductRegistered(productCount, _name, msg.sender);
    }

    // Mua sản phẩm
    function buyProduct(uint256 _productId) public payable onlyRegistered productNotSold(_productId) {
        Product storage product = products[_productId];
        require(msg.value >= product.price, "Insufficient payment");
        require(product.owner != msg.sender, "Cannot buy your own product");

        address previousOwner = product.owner;
        product.owner = msg.sender;
        product.isSold = true;

        // Chuyển tiền cho người bán
        payable(previousOwner).transfer(product.price);
        
        // Hoàn lại tiền thừa nếu có
        if (msg.value > product.price) {
            payable(msg.sender).transfer(msg.value - product.price);
        }

        userPurchases[msg.sender].push(_productId);
        emit ProductSold(_productId, msg.sender, product.price);
    }

    // Cập nhật giá sản phẩm
    function updateProductPrice(uint256 _productId, uint256 _newPrice) 
        public 
        onlyRegistered 
        onlyProductOwner(_productId) 
        productNotSold(_productId) 
    {
        products[_productId].price = _newPrice;
        emit PriceUpdated(_productId, _newPrice);
    }

    // Lấy thông tin sản phẩm
    function getProduct(uint256 _productId) public view returns (
        uint256, string memory, string memory, uint256, string memory, 
        string memory, address, address, uint256, bool, bool, uint256
    ) {
        Product memory p = products[_productId];
        return (
            p.id, p.name, p.productType, p.harvestDate, p.region,
            p.farmName, p.farmer, p.owner, p.price, p.isOrganic, 
            p.isSold, p.createdAt
        );
    }

    // Lấy sản phẩm của farmer
    function getFarmerProducts(address _farmer) public view returns (uint256[] memory) {
        return farmerProducts[_farmer];
    }

    // Lấy sản phẩm đã mua
    function getUserPurchases(address _user) public view returns (uint256[] memory) {
        return userPurchases[_user];
    }

    // Lấy thông tin user
    function getUserInfo(address _user) public view returns (
        string memory, string memory, uint256, bool
    ) {
        User memory u = users[_user];
        return (u.name, u.role, u.joinDate, u.isRegistered);
    }

    // Kiểm tra user đã đăng ký chưa
    function isUserRegistered(address _user) public view returns (bool) {
        return users[_user].isRegistered;
    }
}