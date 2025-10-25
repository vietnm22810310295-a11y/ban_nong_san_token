const AgriculturalMarketplace = artifacts.require("AgriculturalMarketplace");

contract("AgriculturalMarketplace", (accounts) => {
  let marketplace;
  const [owner, farmer, buyer] = accounts;

  beforeEach(async () => {
    marketplace = await AgriculturalMarketplace.new();
  });

  it("should register a farmer", async () => {
    await marketplace.registerUser("Nguyen Van A", "farmer", { from: farmer });
    const userInfo = await marketplace.getUserInfo(farmer);
    assert.equal(userInfo[0], "Nguyen Van A", "Farmer name should match");
    assert.equal(userInfo[1], "farmer", "Farmer role should match");
  });

  it("should register a product", async () => {
    await marketplace.registerUser("Nguyen Van A", "farmer", { from: farmer });
    
    const harvestDate = Math.floor(Date.now() / 1000) - 86400; // 1 ngày trước
    await marketplace.registerProduct(
      "Lua ST25",
      "lua",
      harvestDate,
      "Dong Thap",
      "Trai A",
      web3.utils.toWei("1", "ether"),
      true,
      { from: farmer }
    );

    const product = await marketplace.getProduct(1);
    assert.equal(product[1], "Lua ST25", "Product name should match");
    assert.equal(product[9], true, "Product should be organic");
  });

  it("should allow buying a product", async () => {
    // Register users
    await marketplace.registerUser("Nguyen Van A", "farmer", { from: farmer });
    await marketplace.registerUser("Tran Thi B", "buyer", { from: buyer });

    // Register product
    const harvestDate = Math.floor(Date.now() / 1000) - 86400;
    await marketplace.registerProduct(
      "Ca Phe Robusta",
      "ca phe",
      harvestDate,
      "Dak Lak", 
      "Trai B",
      web3.utils.toWei("0.5", "ether"),
      false,
      { from: farmer }
    );

    // Buy product
    const productPrice = await web3.utils.toWei("0.5", "ether");
    await marketplace.buyProduct(1, { 
      from: buyer, 
      value: productPrice 
    });

    const product = await marketplace.getProduct(1);
    assert.equal(product[10], true, "Product should be sold");
    assert.equal(product[7], buyer, "Buyer should be new owner");
  });
});